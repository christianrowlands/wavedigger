import { NextRequest, NextResponse } from 'next/server';
import type { BSSIDSearchResult, SearchError } from '@/types';

// Import the enhanced queryAppleWLOC function
// Since it's not exported, we'll need to duplicate some code for now
import { 
  serializeRequest, 
  parseResponse, 
  parseLocation,
  WLOC_HEADERS, 
  WLOC_API_ENDPOINTS,
  IAppleWLoc
} from '@/lib/protobuf/schema';

// Helper function to calculate distance between two points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Query Apple WLOC and return all nearby APs
async function queryNearbyAPs(bssid: string, endpoint: 'global' | 'china'): Promise<BSSIDSearchResult[] | null> {
  try {
    const requestData: IAppleWLoc = {
      wifiDevices: [{ bssid }],
      numWifiResults: -1,
      numCellResults: 0,
      deviceType: {
        operatingSystem: 'iPhone OS17.5/21F79',
        model: 'iPhone12,1'
      }
    };
    
    const serializedRequest = serializeRequest(requestData);
    const endpointUrl = endpoint === 'china' ? WLOC_API_ENDPOINTS.china : WLOC_API_ENDPOINTS.default;
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: WLOC_HEADERS,
      body: serializedRequest
    });
    
    if (!response.ok) {
      console.error('Apple API error:', response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const responseBuffer = Buffer.from(arrayBuffer);
    
    const parsedResponse = parseResponse(responseBuffer);
    
    if (!parsedResponse || !parsedResponse.wifiDevices) {
      return null;
    }
    
    const devices = parsedResponse.wifiDevices || [];
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
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Error querying nearby APs:', error);
    return null;
  }
}

// Main proximity search algorithm
async function searchProximity(
  targetLat: number, 
  targetLng: number, 
  initialBssid: string
): Promise<BSSIDSearchResult[]> {
  const allAPs: Map<string, BSSIDSearchResult> = new Map();
  let closestBssid = initialBssid;
  let closestDistance = Infinity;
  const maxIterations = 10; // Prevent infinite loops
  let iterations = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Try global endpoint first
    let nearbyAPs = await queryNearbyAPs(closestBssid, 'global');
    
    // If not found, try China endpoint
    if (!nearbyAPs || nearbyAPs.length === 0) {
      console.log(`Trying China endpoint for ${closestBssid}`);
      nearbyAPs = await queryNearbyAPs(closestBssid, 'china');
    }
    
    if (!nearbyAPs || nearbyAPs.length === 0) {
      console.log(`No APs found for ${closestBssid}, stopping search`);
      break;
    }
    
    console.log(`Found ${nearbyAPs.length} APs near ${closestBssid}`);
    
    // Add all new APs to our collection
    let foundCloser = false;
    for (const ap of nearbyAPs) {
      // Add to collection if not already present
      if (!allAPs.has(ap.bssid)) {
        allAPs.set(ap.bssid, ap);
      }
      
      // Check if this AP is closer to our target
      const distance = getDistance(
        targetLat, targetLng,
        ap.location.latitude, ap.location.longitude
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestBssid = ap.bssid;
        foundCloser = true;
      }
    }
    
    // If we didn't find a closer AP, we're done
    if (!foundCloser) {
      console.log(`No closer AP found, stopping at ${closestBssid} (${closestDistance}m away)`);
      break;
    }
    
    console.log(`Found closer AP: ${closestBssid} (${closestDistance}m away)`);
  }
  
  return Array.from(allAPs.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, seedBssid } = body;
    
    // Validate inputs
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: { type: 'INVALID_LOCATION', message: 'Valid latitude and longitude are required' } as SearchError },
        { status: 400 }
      );
    }
    
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: { type: 'INVALID_LOCATION', message: 'Invalid coordinates' } as SearchError },
        { status: 400 }
      );
    }
    
    // If no seed BSSID provided, we need to find one
    // For now, require a seed BSSID (in future, we could implement tile search)
    if (!seedBssid) {
      return NextResponse.json(
        { error: { type: 'INVALID_REQUEST', message: 'Seed BSSID required for location search' } as SearchError },
        { status: 400 }
      );
    }
    
    console.log(`Starting proximity search at ${latitude}, ${longitude} with seed ${seedBssid}`);
    
    // Perform proximity search
    const results = await searchProximity(latitude, longitude, seedBssid);
    
    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: { type: 'NOT_FOUND', message: 'No access points found near this location' } as SearchError },
        { status: 404 }
      );
    }
    
    // Sort results by distance from target
    const sortedResults = results.sort((a, b) => {
      const distA = getDistance(latitude, longitude, a.location.latitude, a.location.longitude);
      const distB = getDistance(latitude, longitude, b.location.latitude, b.location.longitude);
      return distA - distB;
    });
    
    return NextResponse.json({ 
      results: sortedResults,
      count: sortedResults.length,
      center: { latitude, longitude }
    });
    
  } catch (error) {
    console.error('Location search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: { type: 'API_ERROR', message: `Error performing location search: ${message}` } as SearchError },
      { status: 500 }
    );
  }
}