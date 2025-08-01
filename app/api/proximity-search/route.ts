import { NextRequest, NextResponse } from 'next/server';
import type { BSSIDSearchResult, SearchError } from '@/types';
import { 
  serializeRequest, 
  parseResponse, 
  parseLocation, 
  WLOC_API_ENDPOINTS, 
  WLOC_HEADERS 
} from '@/lib/protobuf/schema';
import { normalizeBSSID } from '@/lib/bssid-utils';

// Proximity search using WLOC API refinement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seedBSSID, targetLat, targetLng, maxDistance = 2000 } = body;
    
    // Validate inputs
    if (!seedBSSID || typeof targetLat !== 'number' || typeof targetLng !== 'number') {
      return NextResponse.json(
        { error: { type: 'INVALID_REQUEST', message: 'Valid seedBSSID and target coordinates are required' } as SearchError },
        { status: 400 }
      );
    }
    
    // Track all discovered access points
    const allAccessPoints = new Map<string, BSSIDSearchResult>();
    let closestBSSID = normalizeBSSID(seedBSSID);
    let previousClosest: string | null = '';
    let iterations = 0;
    
    // Check if in China based on coordinates
    const isChina = targetLat >= 18 && targetLat <= 54 && targetLng >= 73 && targetLng <= 135;
    const endpoint = isChina ? WLOC_API_ENDPOINTS.china : WLOC_API_ENDPOINTS.default;
    
    // Iteratively search for nearby APs until we find no closer one
    while (closestBSSID !== previousClosest) {
      previousClosest = closestBSSID;
      iterations++;
      
      if (!closestBSSID) {
        break;
      }
      
      // Build WLOC request
      const wlocRequest = {
        wifiDevices: [{ bssid: closestBSSID }],
        numWifiResults: 0, // Use 0 for all results (not -1 which disables)
        numCellResults: 0,
        deviceType: {
          operatingSystem: 'iPhone OS17.5/21F79',
          model: 'iPhone12,1'
        }
      };
      
      try {
        const requestBuffer = serializeRequest(wlocRequest);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: WLOC_HEADERS,
          body: requestBuffer
        });
        
        if (!response.ok) {
          console.error(`WLOC query failed for ${closestBSSID}: ${response.status}`);
          break;
        }
        
        const responseData = await response.arrayBuffer();
        const parsedResponse = parseResponse(Buffer.from(responseData));
        
        const wifiDevices = parsedResponse.wifiDevices || parsedResponse.wifi_devices || [];
        console.log(`WLOC returned ${wifiDevices.length} devices for ${closestBSSID}`);
        
        let closestDistance = Infinity;
        let newDevicesAdded = 0;
        
        // Process all returned APs
        for (const device of wifiDevices) {
          if (!device.bssid) continue;
          
          // Skip if we've already seen this AP
          if (allAccessPoints.has(device.bssid)) {
            continue;
          }
          
          const location = parseLocation(device.location);
          if (!location) continue;
          
          // Calculate distance from target
          const distance = getDistance(targetLat, targetLng, location.lat, location.lng);
          
          // Add to our collection with distance
          allAccessPoints.set(device.bssid, {
            bssid: device.bssid,
            location: {
              latitude: location.lat,
              longitude: location.lng,
              altitude: location.alt
            },
            source: isChina ? 'china' : 'global',
            accuracy: distance // Store distance in accuracy field
          });
          newDevicesAdded++;
          
          // Track closest AP for next iteration
          if (distance < closestDistance) {
            closestDistance = distance;
            closestBSSID = device.bssid;
          }
        }
        
        console.log(`Added ${newDevicesAdded} new devices. Total accumulated: ${allAccessPoints.size}`);
        if (closestBSSID !== previousClosest) {
          console.log(`New closest AP: ${closestBSSID} at ${closestDistance.toFixed(0)}m from click point`);
        }
      } catch (err) {
        console.error(`Error querying WLOC for ${closestBSSID}:`, err);
        break;
      }
      
      console.log(`Iteration complete. Previous: ${previousClosest}, New closest: ${closestBSSID}`);
    }
    
    // Convert map to array and sort by distance
    const results = Array.from(allAccessPoints.values())
      .sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0));
    
    console.log(`Proximity search complete. Found ${results.length} total APs`);
    
    // Apply distance filtering
    const filteredResults = results.filter(ap => (ap.accuracy || 0) <= maxDistance);
    console.log(`After filtering to ${maxDistance}m: ${filteredResults.length} APs`);
    
    // Log distance distribution
    if (results.length > 0) {
      const distances = results.map(r => r.accuracy || 0);
      const min = Math.min(...distances);
      const max = Math.max(...distances);
      const median = distances[Math.floor(distances.length / 2)];
      console.log(`Distance distribution: min=${min.toFixed(0)}m, max=${max.toFixed(0)}m, median=${median.toFixed(0)}m`);
      
      // Log how many are within certain ranges
      const within500m = distances.filter(d => d <= 500).length;
      const within1km = distances.filter(d => d <= 1000).length;
      const within2km = distances.filter(d => d <= 2000).length;
      console.log(`APs within: 500m=${within500m}, 1km=${within1km}, 2km=${within2km}`);
    }
    
    return NextResponse.json({
      results: filteredResults,
      count: filteredResults.length,
      totalFound: results.length,
      center: { latitude: targetLat, longitude: targetLng },
      iterations,
      maxDistance
    });
    
  } catch (error) {
    console.error('Proximity search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: { type: 'API_ERROR', message: `Error performing proximity search: ${message}` } as SearchError },
      { status: 500 }
    );
  }
}

// Calculate distance between two points in meters
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