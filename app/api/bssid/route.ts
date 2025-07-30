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

// Configuration
const ENABLE_CHINA_API = process.env.ENABLE_CHINA_API === 'true';

// Apple WLOC API implementation
async function queryAppleWLOC(bssid: string, useChina: boolean = false): Promise<BSSIDSearchResult | null> {
  try {
    console.log('=== BSSID Search Debug ===');
    console.log('Searching for BSSID:', bssid);
    
    // Create the request data
    const requestData: IAppleWLoc = {
      wifiDevices: [{ bssid }],
      numWifiResults: -1, // Use -1 to get results (matching Go implementation)
      numCellResults: 0,
      deviceType: {
        operatingSystem: 'iPhone OS17.5/21F79',
        model: 'iPhone12,1'
      }
    };
    
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    // Serialize the request
    const serializedRequest = serializeRequest(requestData);
    console.log('Serialized request length:', serializedRequest.length);
    console.log('Serialized request (hex):', serializedRequest.toString('hex'));
    
    // Verify BSSID is in the serialized data
    const bssidHex = Buffer.from(bssid).toString('hex');
    console.log('BSSID as hex:', bssidHex);
    console.log('BSSID found in request:', serializedRequest.toString('hex').includes(bssidHex));
    
    // Check expected length (should be > 58 bytes if BSSID is included)
    if (serializedRequest.length <= 58) {
      console.error('WARNING: Serialized request is too small, BSSID may not be included!');
    }
    
    // Choose the appropriate endpoint
    const endpoint = useChina ? WLOC_API_ENDPOINTS.china : WLOC_API_ENDPOINTS.default;
    console.log('Using endpoint:', endpoint);
    
    // Make the request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: WLOC_HEADERS,
      body: serializedRequest
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('Apple API error:', response.status, response.statusText);
      throw new Error(`Apple API returned ${response.status}: ${response.statusText}`);
    }
    
    // Get response as buffer
    const arrayBuffer = await response.arrayBuffer();
    let responseBuffer = Buffer.from(arrayBuffer);
    console.log('Response buffer length:', responseBuffer.length);
    console.log('Response buffer (first 50 bytes hex):', responseBuffer.slice(0, 50).toString('hex'));
    
    // Check if response is gzipped
    const isGzipped = responseBuffer.length > 2 && responseBuffer[0] === 0x1f && responseBuffer[1] === 0x8b;
    if (isGzipped) {
      console.log('Response is gzipped, decompressing...');
      try {
        const { ungzip } = await import('node:zlib').then(m => m.promisify ? 
          { ungzip: m.promisify(m.gunzip) } : 
          { ungzip: (buf: Buffer) => new Promise<Buffer>((resolve, reject) => 
            m.gunzip(buf, (err, result) => err ? reject(err) : resolve(result))
          )}
        );
        responseBuffer = await ungzip(responseBuffer);
        console.log('Decompressed buffer length:', responseBuffer.length);
        console.log('Decompressed buffer (first 50 bytes hex):', responseBuffer.slice(0, 50).toString('hex'));
      } catch (error) {
        console.error('Failed to decompress response:', error);
        throw new Error('Failed to decompress response');
      }
    }
    
    // Parse the response
    const parsedResponse = parseResponse(responseBuffer);
    console.log('Parsed response:', JSON.stringify(parsedResponse, null, 2));
    
    // Check what we got back (protobufjs returns camelCase)
    if (parsedResponse.wifiDevices && Array.isArray(parsedResponse.wifiDevices)) {
      console.log('Number of wifi devices in response:', parsedResponse.wifiDevices.length);
      parsedResponse.wifiDevices.forEach((device: IWifiDevice, index: number) => {
        console.log(`Device ${index}: BSSID=${device.bssid}, has location=${!!device.location}`);
        if (device.location) {
          console.log(`  Location: lat=${device.location.latitude}, lng=${device.location.longitude}`);
        }
      });
    } else {
      console.log('No wifi devices in response');
      console.log('Full parsed response:', JSON.stringify(parsedResponse, null, 2));
    }
    
    // Find the requested BSSID in the response
    // protobufjs returns camelCase field names
    const devices = parsedResponse.wifiDevices || [];
    // Normalize both BSSIDs for comparison (handles format differences like "aa:5:aa:bb:bb:62" vs "AA:05:AA:BB:BB:62")
    const normalizedSearchBSSID = normalizeBSSIDForComparison(bssid);
    const wifiDevice = devices.find(
      (device: IWifiDevice) => {
        if (!device.bssid) return false;
        const normalizedDeviceBSSID = normalizeBSSIDForComparison(device.bssid);
        console.log(`Comparing: ${normalizedDeviceBSSID} === ${normalizedSearchBSSID}`);
        return normalizedDeviceBSSID === normalizedSearchBSSID;
      }
    );
    
    if (!wifiDevice) {
      console.log('Requested BSSID not found in response');
      return null;
    }
    
    if (!wifiDevice.location) {
      console.log('Found BSSID but it has no location data');
      return null;
    }
    
    // Parse the location
    const location = parseLocation(wifiDevice.location);
    console.log('Parsed location:', location);
    
    if (!location) {
      console.log('Failed to parse location coordinates');
      return null;
    }
    
    const result = {
      bssid: wifiDevice.bssid,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        altitude: location.alt
      },
      accuracy: wifiDevice.location.horizontalAccuracy
    };
    
    console.log('Final result:', result);
    console.log('=== End Debug ===');
    
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
    const { bssid } = body;
    
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
    
    console.log('Input BSSID:', bssid);
    console.log('Normalized BSSID:', validation.normalized);
    
    // Query Apple WLOC API
    const result = await queryAppleWLOC(validation.normalized, ENABLE_CHINA_API);
    
    if (!result) {
      return NextResponse.json(
        { error: { type: 'NOT_FOUND', message: 'BSSID not found in Apple\'s database. This may be a new or unregistered access point.' } as SearchError },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ result });
    
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

