import { NextRequest, NextResponse } from 'next/server';
import type { CellTowerSearchResult, NrCellTowerSearchResult, SearchError } from '@/types';
import {
  serializeRequest,
  parseResponse,
  parseLocation,
  parseNrCellResponses,
  WLOC_HEADERS,
  WLOC_API_ENDPOINTS,
  IAppleWLoc
} from '@/lib/protobuf/schema';
import { validateNrCellTowerParams } from '@/lib/cell-tower-utils';
import { recordError404 } from '@/lib/rate-limit';

// Validate LTE cell tower parameters (existing path, unchanged semantics)
function validateLteCellTowerParams(mcc: string, mnc: string, cellId: string, tacId: string): {
  valid: boolean;
  error?: string
} {
  // MCC should be 1-3 digits (0-999)
  const mccNum = parseInt(mcc, 10);
  if (isNaN(mccNum) || mccNum < 0 || mccNum > 999) {
    return { valid: false, error: 'Invalid MCC (Mobile Country Code). Must be 0-999.' };
  }

  // MNC should be 1-3 digits (0-999)
  const mncNum = parseInt(mnc, 10);
  if (isNaN(mncNum) || mncNum < 0 || mncNum > 999) {
    return { valid: false, error: 'Invalid MNC (Mobile Network Code). Must be 0-999.' };
  }

  // Cell ID should be a positive integer
  const cellIdNum = parseInt(cellId, 10);
  if (isNaN(cellIdNum) || cellIdNum < 0) {
    return { valid: false, error: 'Invalid Cell ID. Must be a positive number.' };
  }

  // TAC ID should be a positive integer (for LTE)
  const tacIdNum = parseInt(tacId, 10);
  if (isNaN(tacIdNum) || tacIdNum < 0) {
    return { valid: false, error: 'Invalid TAC (Tracking Area Code). Must be a positive number.' };
  }

  return { valid: true };
}

async function postWloc(serialized: Uint8Array<ArrayBuffer>, endpoint: 'global' | 'china'): Promise<Buffer | null> {
  const endpointUrl = endpoint === 'china' ? WLOC_API_ENDPOINTS.china : WLOC_API_ENDPOINTS.default;
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: WLOC_HEADERS,
    body: serialized
  });

  if (!response.ok) {
    console.error('Apple API error:', response.status, response.statusText);
    throw new Error(`Apple API returned ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  let responseBuffer = Buffer.from(arrayBuffer);

  const isGzipped = responseBuffer.length > 2 && responseBuffer[0] === 0x1f && responseBuffer[1] === 0x8b;
  if (isGzipped) {
    try {
      const zlib = await import('node:zlib');
      const { promisify } = await import('node:util');
      const ungzip = promisify(zlib.gunzip);
      responseBuffer = Buffer.from(await ungzip(responseBuffer));
    } catch {
      throw new Error('Failed to decompress response');
    }
  }

  return responseBuffer;
}

// Query Apple WLOC API for an LTE cell tower (legacy field 25 / 22 path)
async function queryAppleWLOCForCellTower(
  mcc: number,
  mnc: number,
  cellId: number,
  tacId: number,
  endpoint: 'global' | 'china',
  returnAll: boolean = false
): Promise<CellTowerSearchResult[] | null> {
  try {
    const requestData: IAppleWLoc = {
      numCellResults: returnAll ? 0 : -1,
      cellTowerRequest: { mcc, mnc, cellId, tacId },
      deviceType: {
        operatingSystem: 'iPhone OS17.5/21F79',
        model: 'iPhone12,1'
      }
    };

    const serializedRequest = serializeRequest(requestData);
    const responseBuffer = await postWloc(serializedRequest, endpoint);
    if (!responseBuffer) return null;

    const parsedResponse = parseResponse(responseBuffer);
    let towers = parsedResponse.cellTowerResponse || [];

    if (towers.length === 0) {
      return null;
    }

    if (!returnAll && towers.length > 0) {
      const matchingTower = towers.find(t =>
        t.cellId === cellId &&
        t.tacId === tacId &&
        t.mcc === mcc &&
        t.mnc === mnc
      );
      if (matchingTower) {
        towers = [matchingTower];
      } else {
        towers = towers.slice(0, 1);
      }
    }

    const results: CellTowerSearchResult[] = [];

    for (const tower of towers) {
      if (!tower.location) continue;
      const location = parseLocation(tower.location);
      if (!location) continue;

      results.push({
        tower: {
          mcc: tower.mcc || 0,
          mnc: tower.mnc || 0,
          cellId: tower.cellId || 0,
          tacId: tower.tacId || 0,
          uarfcn: tower.uarfcn,
          pid: tower.pid
        },
        location: {
          latitude: location.lat,
          longitude: location.lng
        },
        accuracy: tower.location.horizontalAccuracy,
        source: endpoint
      });
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Error querying Apple WLOC for cell tower:', error);
    return null;
  }
}

// Query Apple WLOC API for a 5G NR cell (field 29 request, field 24 response).
// Apple returns the requested cell plus ~100 surrounding NR cells; surface
// every entry that has a real lat/lng, and mark the row matching the user's
// NCI with isPrimary=true.
async function queryAppleWLOCForNrCell(
  mcc: number,
  mnc: number,
  nci: string,
  tac: number,
  endpoint: 'global' | 'china',
  returnAll: boolean = false
): Promise<NrCellTowerSearchResult[] | null> {
  try {
    const requestData: IAppleWLoc = {
      // Apple ignores numCellResults for NR and always returns the full
      // ~100-cell cluster, so single-cell mode is achieved by filtering the
      // parsed response below (mirroring the LTE path), not by this value.
      numCellResults: -1,
      nrCellRequest: { mcc, mnc, nci, tac },
      deviceType: {
        operatingSystem: 'iPhone OS17.5/21F79',
        model: 'iPhone12,1'
      }
    };

    const serializedRequest = serializeRequest(requestData);
    const responseBuffer = await postWloc(serializedRequest, endpoint);
    if (!responseBuffer) return null;

    const parsedResponse = parseResponse(responseBuffer);
    const nrCells = parseNrCellResponses(parsedResponse);

    if (nrCells.length === 0) {
      return null;
    }

    // parseNrCellResponses returns nci as a canonical decimal string, but the
    // caller-supplied nci is only digit-filtered, so leading-zero or other
    // formatting differences would break equality. Normalize once and use it
    // for both the single-cell filter and the isPrimary flag.
    const wantNci = /^\d+$/.test(nci) ? String(BigInt(nci)) : nci;

    // Filter out -180/-180 echo (Apple's "not found" sentinel) but keep all
    // real-location entries. parseLocation already returns null for -180/-180,
    // so cells with location === null are the echoes.
    let realCells = nrCells.filter(c => c.location !== null);
    if (realCells.length === 0) {
      return null;
    }

    // When the caller does not want the surrounding cluster, narrow to the
    // primary cell (the row matching the searched NCI/TAC); fall back to the
    // first cell if Apple's cluster has no exact match.
    if (!returnAll) {
      const primary = realCells.find(c => c.nci === wantNci && c.tac === tac);
      realCells = primary ? [primary] : realCells.slice(0, 1);
    }

    const results: NrCellTowerSearchResult[] = realCells.map(c => ({
      tower: {
        mcc: c.mcc,
        mnc: c.mnc,
        nci: c.nci,
        tac: c.tac,
        nrArfcn: c.nrArfcn
      },
      location: {
        latitude: c.location!.lat,
        longitude: c.location!.lng
      },
      accuracy: c.horizontalAccuracy,
      source: endpoint,
      isPrimary: c.nci === wantNci && c.tac === tac
    }));

    return results;
  } catch (error) {
    console.error('Error querying Apple WLOC for NR cell:', error);
    return null;
  }
}

async function handleLteLookup(
  mcc: string,
  mnc: string,
  cellId: string | null,
  tacId: string | null,
  returnAll: boolean,
  ip: string
): Promise<NextResponse> {
  if (!mcc || !mnc || !cellId || !tacId) {
    const error: SearchError = {
      type: 'INVALID_REQUEST',
      message: 'Missing required parameters. Please provide MCC, MNC, Cell ID, and TAC ID.'
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  const validation = validateLteCellTowerParams(mcc, mnc, cellId, tacId);
  if (!validation.valid) {
    const error: SearchError = {
      type: 'INVALID_REQUEST',
      message: validation.error || 'Invalid cell tower parameters'
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  const mccNum = parseInt(mcc, 10);
  const mncNum = parseInt(mnc, 10);
  const cellIdNum = parseInt(cellId, 10);
  const tacIdNum = parseInt(tacId, 10);

  let results = await queryAppleWLOCForCellTower(mccNum, mncNum, cellIdNum, tacIdNum, 'global', returnAll);
  if (!results) {
    console.log('Cell tower not found in global database, trying China endpoint...');
    results = await queryAppleWLOCForCellTower(mccNum, mncNum, cellIdNum, tacIdNum, 'china', returnAll);
  }

  if (!results || results.length === 0) {
    recordError404(ip);
    const error: SearchError = {
      type: 'NOT_FOUND',
      message: `Cell tower not found (MCC: ${mcc}, MNC: ${mnc}, Cell ID: ${cellId}, TAC: ${tacId})`
    };
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ results });
}

async function handleNrLookup(
  mcc: string,
  mnc: string,
  nci: string | null,
  tac: string | null,
  returnAll: boolean,
  ip: string
): Promise<NextResponse> {
  if (!mcc || !mnc || !nci || !tac) {
    const error: SearchError = {
      type: 'INVALID_REQUEST',
      message: 'Missing required parameters. Please provide MCC, MNC, NCI, and TAC.'
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  const validation = validateNrCellTowerParams(mcc, mnc, nci, tac);
  if (!validation.isValid) {
    const error: SearchError = {
      type: 'INVALID_REQUEST',
      message: validation.errors.join('; ')
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  const mccNum = parseInt(mcc, 10);
  const mncNum = parseInt(mnc, 10);
  const tacNum = parseInt(tac, 10);

  let results = await queryAppleWLOCForNrCell(mccNum, mncNum, nci, tacNum, 'global', returnAll);
  if (!results) {
    console.log('NR cell not found in global database, trying China endpoint...');
    results = await queryAppleWLOCForNrCell(mccNum, mncNum, nci, tacNum, 'china', returnAll);
  }

  if (!results || results.length === 0) {
    recordError404(ip);
    const error: SearchError = {
      type: 'NOT_FOUND',
      message: `NR cell not found (MCC: ${mcc}, MNC: ${mnc}, NCI: ${nci}, TAC: ${tac})`
    };
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ results, radio: 'nr' });
}

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

function normalizeRadio(value: string | null | undefined): 'lte' | 'nr' {
  return value === 'nr' ? 'nr' : 'lte';
}

export async function GET(request: NextRequest) {
  try {
    const ip = getIp(request);
    const sp = request.nextUrl.searchParams;
    const radio = normalizeRadio(sp.get('radio'));

    if (radio === 'nr') {
      return handleNrLookup(
        sp.get('mcc') || '',
        sp.get('mnc') || '',
        sp.get('nci'),
        sp.get('tac'),
        sp.get('returnAll') === 'true',
        ip
      );
    }

    return handleLteLookup(
      sp.get('mcc') || '',
      sp.get('mnc') || '',
      sp.get('cellId'),
      sp.get('tacId'),
      sp.get('returnAll') === 'true',
      ip
    );
  } catch (error) {
    console.error('Cell tower search error:', error);
    const searchError: SearchError = {
      type: 'API_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
    return NextResponse.json({ error: searchError }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getIp(request);
    const body = await request.json().catch(() => ({}));
    const radio = normalizeRadio(body?.radio);

    if (radio === 'nr') {
      const { mcc, mnc, nci, tac } = body ?? {};
      return handleNrLookup(
        mcc !== undefined && mcc !== null ? String(mcc) : '',
        mnc !== undefined && mnc !== null ? String(mnc) : '',
        nci !== undefined && nci !== null ? String(nci) : null,
        tac !== undefined && tac !== null ? String(tac) : null,
        body?.returnAll === true,
        ip
      );
    }

    // LTE POST body supports both {cellId, tacId} and {cellId, tac} for
    // forward-compatible NR/LTE shared shapes; tacId wins if both present.
    const mcc = body?.mcc;
    const mnc = body?.mnc;
    const cellId = body?.cellId;
    const tacId = body?.tacId ?? body?.tac;
    const returnAll = body?.returnAll === true;

    return handleLteLookup(
      mcc !== undefined && mcc !== null ? String(mcc) : '',
      mnc !== undefined && mnc !== null ? String(mnc) : '',
      cellId !== undefined && cellId !== null ? String(cellId) : null,
      tacId !== undefined && tacId !== null ? String(tacId) : null,
      returnAll,
      ip
    );
  } catch (error) {
    console.error('Cell tower search POST error:', error);
    const searchError: SearchError = {
      type: 'API_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
    return NextResponse.json({ error: searchError }, { status: 500 });
  }
}
