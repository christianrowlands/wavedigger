import { NextRequest, NextResponse } from 'next/server';
import { validateAndNormalizeBSSID, normalizeBSSIDForComparison } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, SearchError } from '@/types';
import { 
  serializeRequest, 
  parseResponse, 
  parseLocation,
  WLOC_HEADERS, 
  WLOC_API_ENDPOINTS,
  IAppleWLoc,
  IWifiDevice 
} from '@/lib/protobuf/schema';

// Apple WLOC API implementation
async function queryAppleWLOC(bssid: string, endpoint: 'global' | 'china', returnAll: boolean = false): Promise<BSSIDSearchResult | BSSIDSearchResult[] | null> {
  try {
    
    // Create the request data
    const requestData: IAppleWLoc = {
      wifiDevices: [{ bssid }],
      numWifiResults: returnAll ? 0 : -1, // Use 0 to get all results, -1 for single result
      numCellResults: 0,
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
      console.error('Apple API error:', response.status, response.statusText);
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
    
    
    // protobufjs returns camelCase field names
    const devices = parsedResponse.wifiDevices || [];
    
    // If returnAll is true, return all wifi devices
    if (returnAll && devices.length > 0) {
      const results: BSSIDSearchResult[] = [];
      
      for (const device of devices) {
        if (!device.bssid || !device.location) continue;
        
        const location = parseLocation(device.location);
        if (!location) continue;
        
        results.push({
          bssid: device.bssid,
          location: {
            latitude: location.lat,
            longitude: location.lng
          },
          accuracy: device.location.horizontalAccuracy,
          source: endpoint
        });
      }
      
      console.log(`Found ${results.length} APs near ${bssid}`);
      return results.length > 0 ? results : null;
    }
    
    // Original behavior: return only the matching BSSID
    // Normalize both BSSIDs for comparison (handles format differences like "aa:5:aa:bb:bb:62" vs "AA:05:AA:BB:BB:62")
    const normalizedSearchBSSID = normalizeBSSIDForComparison(bssid);
    const wifiDevice = devices.find(
      (device: IWifiDevice) => {
        if (!device.bssid) return false;
        const normalizedDeviceBSSID = normalizeBSSIDForComparison(device.bssid);
        return normalizedDeviceBSSID === normalizedSearchBSSID;
      }
    );
    
    if (!wifiDevice) {
      return null;
    }
    
    if (!wifiDevice.location) {
      return null;
    }
    
    // Parse the location
    const location = parseLocation(wifiDevice.location);
    
    if (!location) {
      return null;
    }
    
    const result: BSSIDSearchResult = {
      bssid: wifiDevice.bssid,
      location: {
        latitude: location.lat,
        longitude: location.lng
      },
      accuracy: wifiDevice.location.horizontalAccuracy,
      source: endpoint
    };
    
    
    return result;
    
  } catch (error) {
    console.error('Error querying Apple WLOC:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bssid, returnAll = false } = body;
    
    if (!bssid) {
      return NextResponse.json(
        { error: { type: 'INVALID_BSSID', message: 'BSSID is required' } as SearchError },
        { status: 400 }
      );
    }
    
    // Validate and normalize BSSID
    const validation = validateAndNormalizeBSSID(bssid);
    
    if (!validation.isValid || !validation.normalized) {
      return NextResponse.json(
        { error: { type: 'INVALID_BSSID', message: validation.error || 'Invalid BSSID format' } as SearchError },
        { status: 400 }
      );
    }
    
    
    // Query Apple WLOC API - try global first, then China as fallback
    let result = await queryAppleWLOC(validation.normalized, 'global', returnAll);
    
    if (!result) {
      // Try China endpoint as fallback
      console.log(`BSSID ${validation.normalized} not found in global database, trying China endpoint...`);
      result = await queryAppleWLOC(validation.normalized, 'china', returnAll);
    }
    
    if (!result) {
      return NextResponse.json(
        { error: { type: 'NOT_FOUND', message: 'BSSID not found in Apple\'s database. This may be a new or unregistered access point.' } as SearchError },
        { status: 404 }
      );
    }
    
    // Return results based on returnAll flag
    if (returnAll && Array.isArray(result)) {
      return NextResponse.json({ results: result });
    } else {
      return NextResponse.json({ result });
    }
    
  } catch (error) {
    console.error('BSSID search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    // Provide more helpful error messages
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: { type: 'NETWORK_ERROR', message: 'Unable to connect to Apple location service. Please check your internet connection.' } as SearchError },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: { type: 'API_ERROR', message: `Error querying location service: ${message}` } as SearchError },
      { status: 500 }
    );
  }
}

