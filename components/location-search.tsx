'use client';

import React, { useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnalytics } from '@/hooks/use-analytics';
import type { BSSIDSearchResult } from '@/types';

interface LocationSearchProps {
  onSearchResults: (results: BSSIDSearchResult[]) => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  isSearching?: boolean;
  clickedLocation?: { latitude: number; longitude: number } | null;
}

export default function LocationSearch({ 
  onSearchResults, 
  onSearchStart,
  onSearchEnd,
  isSearching = false,
  clickedLocation
}: LocationSearchProps) {
  const [error, setError] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState<{
    count: number;
    totalFound: number;
    center: { latitude: number; longitude: number };
    maxDistance: number;
  } | null>(null);
  const [searchProgress, setSearchProgress] = useState<string | null>(null);
  
  const { trackLocationSearch, trackSearchError } = useAnalytics();

  // Handle location search when clickedLocation changes
  React.useEffect(() => {
    if (!clickedLocation) return;
    
    performLocationSearch(clickedLocation.latitude, clickedLocation.longitude);
  }, [clickedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const performLocationSearch = async (latitude: number, longitude: number) => {
    setError(null);
    setSearchStats(null);
    setSearchProgress('Finding nearby access points...');
    onSearchStart?.();
    
    try {
      // Step 1: Use spiral tile search to find initial APs
      const tileResponse = await fetch('/api/tile-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          latitude, 
          longitude,
          maxAttempts: 20 // Spiral search up to 20 tiles
        }),
      });
      
      const tileData = await tileResponse.json();
      
      if (!tileResponse.ok || !tileData.closestBSSID) {
        const errorMessage = tileData.message || 'No access points found in this area. Try a different location.';
        setError(errorMessage);
        trackSearchError(errorMessage, 'location');
        onSearchEnd?.();
        return;
      }
      
      if (tileData.tilesSearched) {
      }
      setSearchProgress('Refining search area...');
      
      // Step 2: Use WLOC refinement to find all nearby APs
      const proximityResponse = await fetch('/api/proximity-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedBSSID: tileData.closestBSSID,
          targetLat: latitude,
          targetLng: longitude,
          maxDistance: 5000
        }),
      });
      
      const proximityData = await proximityResponse.json();
      
      if (proximityResponse.ok && proximityData.results && proximityData.results.length > 0) {
        // Display the refined results
        setSearchStats({
          count: proximityData.count,
          totalFound: proximityData.totalFound || proximityData.count,
          center: proximityData.center,
          maxDistance: proximityData.maxDistance || 5000
        });
        setSearchProgress(null);
        onSearchResults(proximityData.results);
        
        // Track successful location search
        trackLocationSearch(proximityData.count, latitude, longitude);
      } else {
        setError('Unable to find nearby access points. Please try a different location.');
      }
      
      onSearchEnd?.();
      
    } catch (err) {
      console.error('Location search error:', err);
      setError('Network error. Please try again.');
      trackSearchError('Network error', 'location');
      setSearchProgress(null);
      onSearchEnd?.();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="p-3 rounded-lg animate-fadeIn" style={{
        backgroundColor: 'var(--color-warning-light)',
        border: '1px solid var(--color-warning)',
        color: 'var(--color-warning-dark)'
      }}>
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Experimental Feature</p>
            <p className="text-xs leading-relaxed">
              Location search has limited accuracy due to Apple&apos;s tile system only providing data at ~5km resolution. 
              Access points shown may be 1-2km away from your click location.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-4 rounded-lg glass-primary">
        <MapPin className="h-5 w-5" style={{ color: 'var(--color-primary-500)' }} />
        <div className="flex-1">
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Click anywhere on the map
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Discover access points in the general area
          </p>
        </div>
      </div>
      
      {isSearching && (
        <div className="flex items-center gap-2 p-3 rounded-lg glass-card animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-primary-500)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {searchProgress || 'Searching for nearby access points...'}
          </span>
        </div>
      )}
      
      {searchStats && !isSearching && (
        <div className="p-3 rounded-lg gradient-card-2 animate-slideIn">
          {searchStats.count > 0 ? (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Found {searchStats.count} access points within {(searchStats.maxDistance / 1000).toFixed(1)}km
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Near {searchStats.center.latitude.toFixed(4)}, {searchStats.center.longitude.toFixed(4)}
              </p>
              {searchStats.totalFound > searchStats.count && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  ({searchStats.totalFound} total found, filtered by distance)
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
                No access points within {(searchStats.maxDistance / 1000).toFixed(1)}km
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {searchStats.totalFound > 0 
                  ? `Found ${searchStats.totalFound} APs but all are further than ${(searchStats.maxDistance / 1000).toFixed(1)}km away`
                  : 'No access points found in this area'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Try increasing the search radius or clicking in a different location
              </p>
            </>
          )}
        </div>
      )}
      
      {error && !isSearching && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}