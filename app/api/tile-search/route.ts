import { NextRequest, NextResponse } from 'next/server';
import type { BSSIDSearchResult, SearchError } from '@/types';
import { toTile, pack } from '@/lib/morton-encoding';
import { parseTileResponse } from '@/lib/protobuf/schema';
import { decodeMac, tileCoordFromInt } from '@/lib/mac-utils';

// Tile search endpoint for location-based AP discovery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;
    
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
    
    // Use zoom level 13 for consistency with apple-corelocation-experiments
    const zoomLevel = 13;
    
    // Determine endpoint based on coordinates (China check)
    const isChina = isInChina(latitude, longitude);
    const endpoint = isChina 
      ? 'https://gspe85-cn-ssl.ls.apple.com/wifi_request_tile'
      : 'https://gspe85-ssl.ls.apple.com/wifi_request_tile';
    
    // Convert lat/lng to tile coordinates
    const { x: tileLong, y: tileLat } = toTile(latitude, longitude, zoomLevel);
    console.log(`Converted lat:${latitude}, lng:${longitude} to tile x:${tileLong}, y:${tileLat} at zoom ${zoomLevel}`);
    
    // Try multi-tile search: center tile + 8 surrounding tiles
    const tilesToSearch = [
      [tileLong, tileLat],     // Center
      [tileLong-1, tileLat-1], // NW
      [tileLong, tileLat-1],   // N
      [tileLong+1, tileLat-1], // NE
      [tileLong-1, tileLat],   // W
      [tileLong+1, tileLat],   // E
      [tileLong-1, tileLat+1], // SW
      [tileLong, tileLat+1],   // S
      [tileLong+1, tileLat+1], // SE
    ];
    
    const allTileResults: BSSIDSearchResult[] = [];
    let tilesWithData = 0;
    
    // Search multiple tiles
    console.log(`Searching 9 tiles around clicked location...`);
    
    for (const [tileX, tileY] of tilesToSearch) {
      const tileKey = pack(tileX, tileY, zoomLevel);
      
      // Make tile request to Apple
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'X-tilekey': tileKey.toString(),
          'User-Agent': 'geod/1 CFNetwork/1496.0.7 Darwin/23.5.0',
          'Accept-Language': 'en-US,en-GB;q=0.9,en;q=0.8',
          'X-os-version': '17.5.21F79',
        }
      });
      
      if (!response.ok) {
        continue;
      }
      
      // Get response as buffer for protobuf parsing
      const arrayBuffer = await response.arrayBuffer();
      const responseBuffer = Buffer.from(arrayBuffer);
      
      // Parse the tile response
      let tileData;
      try {
        tileData = parseTileResponse(responseBuffer);
      } catch (err) {
        console.error('Error parsing tile response:', err);
        continue;
      }
      
      // Extract BSSIDs from tile data
      if (tileData.region) {
        for (const region of tileData.region) {
          if (region.devices) {
            for (const device of region.devices) {
              if (device.bssid && device.entry) {
                try {
                  const bssid = decodeMac(device.bssid);
                  const lat = tileCoordFromInt(device.entry.lat);
                  const lng = tileCoordFromInt(device.entry.long);
                  
                  // Calculate distance from clicked point
                  const distance = getDistance(latitude, longitude, lat, lng);
                  
                  allTileResults.push({
                    bssid,
                    location: {
                      latitude: lat,
                      longitude: lng
                    },
                    source: isChina ? 'china' : 'global',
                    accuracy: distance // Store distance in accuracy field temporarily
                  });
                } catch (err) {
                  console.error('Error decoding device:', err);
                }
              }
            }
          }
        }
        tilesWithData++;
      }
    }
    
    console.log(`Found ${tilesWithData} tiles with data, total ${allTileResults.length} APs`);
    
    if (allTileResults.length > 0) {
      // Sort all results by distance from clicked point
      allTileResults.sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0));
      
      // Return the closest AP across all tiles
      const closest = allTileResults[0];
      console.log(`Closest AP across all tiles: ${closest.bssid} at ${closest.accuracy?.toFixed(0)}m from click point`);
      
      // Log distance distribution
      const distances = allTileResults.slice(0, 10).map(r => r.accuracy?.toFixed(0));
      console.log(`Top 10 closest APs distances: ${distances.join(', ')}m`);
      
      return NextResponse.json({
        closestBSSID: closest.bssid,
        closestLocation: closest.location,
        distance: closest.accuracy,
        tilesSearched: 9,
        tilesWithData,
        totalAPsFound: allTileResults.length
      });
    }
    
    // No results found after all attempts
    return NextResponse.json({
      closestBSSID: null,
      message: 'No access points found in this area after spiral search'
    });
    
  } catch (error) {
    console.error('Tile search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: { type: 'API_ERROR', message: `Error performing tile search: ${message}` } as SearchError },
      { status: 500 }
    );
  }
}

// Simple China boundary check (rough approximation)
function isInChina(lat: number, lng: number): boolean {
  // Rough boundaries of China
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
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