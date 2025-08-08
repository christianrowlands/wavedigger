import { NextRequest, NextResponse } from 'next/server';
import type { CellTowerSearchResult, SearchError } from '@/types';
import { 
  serializeRequest, 
  parseResponse, 
  parseLocation,
  WLOC_HEADERS, 
  WLOC_API_ENDPOINTS,
  IAppleWLoc
} from '@/lib/protobuf/schema';
import { recordError404 } from '@/lib/rate-limit';

// Validate cell tower parameters
function validateCellTowerParams(mcc: string, mnc: string, cellId: string, tacId: string): { 
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

// Query Apple WLOC API for cell tower information
async function queryAppleWLOCForCellTower(
  mcc: number, 
  mnc: number, 
  cellId: number, 
  tacId: number, 
  endpoint: 'global' | 'china',
  returnAll: boolean = false
): Promise<CellTowerSearchResult[] | null> {
  try {
    // Create the request data for cell tower query
    const requestData: IAppleWLoc = {
      numCellResults: returnAll ? 0 : -1, // 0 for all towers, -1 for single tower
      cellTowerRequest: {
        mcc,
        mnc,
        cellId,
        tacId
      },
      deviceType: {
        operatingSystem: 'iPhone OS17.5/21F79',
        model: 'iPhone12,1'
      }
    };
    
    // Serialize the request
    const serializedRequest = serializeRequest(requestData);
    
    // Choose the appropriate endpoint
    const endpointUrl = endpoint === 'china' ? WLOC_API_ENDPOINTS.china : WLOC_API_ENDPOINTS.default;
    
    // Make the request
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: WLOC_HEADERS,
      body: serializedRequest
    });
    
    if (!response.ok) {
      console.error('Apple API error for cell tower:', response.status, response.statusText);
      throw new Error(`Apple API returned ${response.status}: ${response.statusText}`);
    }
    
    // Get response as buffer
    const arrayBuffer = await response.arrayBuffer();
    let responseBuffer = Buffer.from(arrayBuffer);
    
    // Check if response is gzipped
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
    
    // Parse the response
    const parsedResponse = parseResponse(responseBuffer);
    
    // Get cell tower responses
    let towers = parsedResponse.cellTowerResponse || [];
    
    if (towers.length === 0) {
      return null;
    }
    
    // When returnAll is false, filter to only the exact matching tower
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
        // If no exact match, return the first tower (closest match)
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
          uarfcn: tower.uarfcn,  // Include UARFCN if present
          pid: tower.pid         // Include PID if present
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

export async function GET(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    
    const searchParams = request.nextUrl.searchParams;
    const mcc = searchParams.get('mcc');
    const mnc = searchParams.get('mnc');
    const cellId = searchParams.get('cellId');
    const tacId = searchParams.get('tacId');
    const returnAll = searchParams.get('returnAll') === 'true';
    
    // Check if all required parameters are provided
    if (!mcc || !mnc || !cellId || !tacId) {
      const error: SearchError = {
        type: 'INVALID_REQUEST',
        message: 'Missing required parameters. Please provide MCC, MNC, Cell ID, and TAC ID.'
      };
      return NextResponse.json({ error }, { status: 400 });
    }
    
    // Validate parameters
    const validation = validateCellTowerParams(mcc, mnc, cellId, tacId);
    if (!validation.valid) {
      const error: SearchError = {
        type: 'INVALID_REQUEST',
        message: validation.error || 'Invalid cell tower parameters'
      };
      return NextResponse.json({ error }, { status: 400 });
    }
    
    // Convert to numbers
    const mccNum = parseInt(mcc, 10);
    const mncNum = parseInt(mnc, 10);
    const cellIdNum = parseInt(cellId, 10);
    const tacIdNum = parseInt(tacId, 10);
    
    // Try global endpoint first
    let results = await queryAppleWLOCForCellTower(mccNum, mncNum, cellIdNum, tacIdNum, 'global', returnAll);
    
    // If not found, try China endpoint as fallback
    if (!results) {
      console.log('Cell tower not found in global database, trying China endpoint...');
      results = await queryAppleWLOCForCellTower(mccNum, mncNum, cellIdNum, tacIdNum, 'china', returnAll);
    }
    
    if (!results || results.length === 0) {
      // Record 404 for rate limiting
      recordError404(ip);
      
      const error: SearchError = {
        type: 'NOT_FOUND',
        message: `Cell tower not found (MCC: ${mcc}, MNC: ${mnc}, Cell ID: ${cellId}, TAC: ${tacId})`
      };
      return NextResponse.json({ error }, { status: 404 });
    }
    
    // Return the results
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('Cell tower search error:', error);
    const searchError: SearchError = {
      type: 'API_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
    return NextResponse.json({ error: searchError }, { status: 500 });
  }
}