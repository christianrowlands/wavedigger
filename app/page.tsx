'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ThemeToggle from '@/components/theme-toggle';
import AboutDialog from '@/components/about-dialog';
import MobileSheet from '@/components/mobile-sheet';
import SearchControls from '@/components/search-controls';
import ShareButton from '@/components/share-button';
import CopyButton from '@/components/copy-button';
import { useShareUrl } from '@/hooks/use-share-url';
import { formatBSSIDForURL, parseBSSIDFromURL, formatBSSIDForDisplay } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, MapMarker } from '@/types';

// Dynamic import for deck.gl to avoid SSR issues
const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

function HomeContent() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [searchHistory, setSearchHistory] = useState<BSSIDSearchResult[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [urlBssid, setUrlBssid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bssid' | 'location'>('bssid');
  const [clickedLocation, setClickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessedUrl = useRef(false);
  const { generateShareUrl } = useShareUrl();

  // Update URL with current search state
  const updateUrl = useCallback((bssid?: string) => {
    // Start with existing search params to preserve them
    const params = new URLSearchParams(searchParams.toString());
    
    if (bssid) {
      // Format BSSID with hyphens for cleaner URLs
      params.set('bssid', formatBSSIDForURL(bssid));
    } else if (!bssid && params.has('bssid')) {
      params.delete('bssid');
    }
    
    if (isMultiMode) {
      params.set('mode', 'multi');
    } else {
      params.delete('mode');
    }
    
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
  }, [router, isMultiMode, searchParams]);

  const handleSearchResult = useCallback((result: BSSIDSearchResult, shouldFlyTo: boolean = false) => {
    const newMarker: MapMarker = {
      id: `${result.bssid}-${Date.now()}`,
      bssid: result.bssid,
      position: [result.location.longitude, result.location.latitude],
      location: result.location,
      source: result.source,
      accuracy: result.accuracy
    };
    
    setMarkers(prev => [...prev, newMarker]);
    setSelectedMarker(newMarker);
    
    // Fly to location if requested (for single searches)
    if (shouldFlyTo) {
      console.log('[Page] Setting flyToLocation for search result:', {
        bssid: result.bssid,
        longitude: result.location.longitude,
        latitude: result.location.latitude
      });
      setFlyToLocation({
        longitude: result.location.longitude,
        latitude: result.location.latitude
      });
    }
    
    // Update URL with the searched BSSID (only if not loading from URL)
    if (!isLoadingFromUrl) {
      updateUrl(result.bssid);
    }
  }, [updateUrl, isLoadingFromUrl]);
  
  const handleManualSearchResult = useCallback((result: BSSIDSearchResult) => {
    // Add to search history for manual searches
    setSearchHistory(prev => [result, ...prev.slice(0, 9)]);
    // Call the regular handler with flyTo enabled for manual searches
    handleSearchResult(result, true);
  }, [handleSearchResult]);

  const handleMultiSearchResults = useCallback((results: BSSIDSearchResult[]) => {
    const newMarkers: MapMarker[] = results.map((result, index) => ({
      id: `${result.bssid}-${Date.now()}-${index}`,
      bssid: result.bssid,
      position: [result.location.longitude, result.location.latitude],
      location: result.location,
      source: result.source,
      accuracy: result.accuracy
    }));
    
    setMarkers(prev => [...prev, ...newMarkers]);
    // Don't add to search history for bulk results
    
    // Select the first result
    if (newMarkers.length > 0) {
      setSelectedMarker(newMarkers[0]);
    }
    
    // If this was from a location search, stop the searching state
    if (isLocationSearching) {
      setIsLocationSearching(false);
      setClickedLocation(null);
    }
  }, [isLocationSearching]);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
  }, []);

  const handleMapClick = useCallback((longitude: number, latitude: number) => {
    // Only handle map clicks when location search tab is active
    if (activeTab === 'location') {
      setClickedLocation({ latitude, longitude });
    }
  }, [activeTab]);

  const handleClearAll = () => {
    setMarkers([]);
    setSelectedMarker(null);
    setSearchHistory([]);
    // Clear URL parameters when clearing all
    router.push('/');
  };

  // Handle deep linking from URL parameters
  useEffect(() => {
    if (hasProcessedUrl.current) return;
    
    const bssidParam = searchParams.get('bssid');
    const modeParam = searchParams.get('mode');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    
    if (modeParam === 'multi') {
      setIsMultiMode(true);
    }
    
    if (bssidParam && !hasProcessedUrl.current) {
      hasProcessedUrl.current = true;
      setIsLoadingFromUrl(true);
      
      // Parse BSSID from URL (handles both colon and hyphen formats)
      const parsedBssid = parseBSSIDFromURL(bssidParam);
      setUrlBssid(parsedBssid);
      
      // Search for BSSID from URL
      const searchBssid = async () => {
        try {
          const response = await fetch('/api/bssid', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bssid: parsedBssid }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.result) {
            // For URL-loaded searches, fly to the location
            handleSearchResult(data.result, true);
            
            // If specific lat/lng provided, use those instead
            if (latParam && lngParam) {
              const lat = parseFloat(latParam);
              const lng = parseFloat(lngParam);
              if (!isNaN(lat) && !isNaN(lng)) {
                console.log('[Page] Setting flyToLocation from URL params:', { lat, lng });
                setFlyToLocation({ latitude: lat, longitude: lng });
              }
            }
          }
        } catch (error) {
          console.error('Error loading shared BSSID:', error);
        } finally {
          setIsLoadingFromUrl(false);
          setUrlBssid(null);
        }
      };
      
      searchBssid();
    }
  }, [searchParams, handleSearchResult]);

  return (
    <div className="h-full flex flex-col gradient-mesh-vibrant mobile-no-overscroll" style={{ background: 'var(--bg-primary)', position: 'fixed', inset: 0 }}>
      {/* Header */}
      <header className="z-50 border-b backdrop-blur-md flex-shrink-0 header-gradient" style={{ 
        borderColor: 'var(--border-primary)',
        boxShadow: '0 4px 20px 0 rgba(147, 129, 255, 0.15), 0 2px 10px 0 rgba(34, 211, 238, 0.12)'
      }}>
        <div className="px-3 sm:px-6 lg:px-12 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 mr-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                WaveDigger
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AboutDialog />
              <ThemeToggle />
              <button
                onClick={handleClearAll}
                className="px-2 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105 flex items-center justify-center"
                style={{
                  color: markers.length === 0 ? 'var(--text-tertiary)' : 'var(--color-error)',
                  background: markers.length === 0 ? 'transparent' : 'var(--color-error-light)',
                  cursor: markers.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: markers.length === 0 ? 0.5 : 1
                }}
                disabled={markers.length === 0}
                title="Clear all markers"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline sm:ml-2">Clear All</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-96 z-10 overflow-y-auto transition-all glass-subtle" style={{ 
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="p-6 space-y-6 animate-fadeIn">
            {/* Search Section */}
            <SearchControls
              isMultiMode={isMultiMode}
              onToggleMode={() => setIsMultiMode(!isMultiMode)}
              onSearchResult={(result) => handleSearchResult(result, false)}
              onManualSearchResult={handleManualSearchResult}
              onSearchResults={handleMultiSearchResults}
              isLoadingFromUrl={isLoadingFromUrl}
              urlBssid={urlBssid}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLocationSearchStart={() => setIsLocationSearching(true)}
              onLocationSearchEnd={() => setIsLocationSearching(false)}
              isLocationSearching={isLocationSearching}
              clickedLocation={clickedLocation}
            />

            {/* Selected Marker Info */}
            {selectedMarker && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    Selected BSSID
                    {selectedMarker.source === 'china' && (
                      <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ 
                        backgroundColor: '#EE1C25', 
                        color: 'white' 
                      }}>
                        CN
                      </span>
                    )}
                  </h3>
                  <ShareButton 
                    url={generateShareUrl({ 
                      bssid: selectedMarker.bssid,
                      latitude: selectedMarker.location.latitude,
                      longitude: selectedMarker.location.longitude,
                      mode: isMultiMode ? 'multi' : 'single'
                    })}
                    variant="icon"
                  />
                </div>
                <div className="rounded-lg p-4 space-y-2 transition-all glass-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>BSSID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                        {formatBSSIDForDisplay(selectedMarker.bssid)}
                      </span>
                      <CopyButton text={formatBSSIDForDisplay(selectedMarker.bssid)} label="BSSID" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Location</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                        {selectedMarker.location.latitude.toFixed(6)}, {selectedMarker.location.longitude.toFixed(6)}
                      </span>
                      <CopyButton 
                        text={`${selectedMarker.location.latitude.toFixed(6)}, ${selectedMarker.location.longitude.toFixed(6)}`} 
                        label="Location" 
                      />
                    </div>
                  </div>
                  {selectedMarker.source === 'china' && (
                    <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Source</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        China Database
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search History */}
            {searchHistory.length > 0 && activeTab === 'bssid' && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Search History
                </h3>
                <div className="space-y-2">
                  {searchHistory.map((result, index) => (
                    <div
                      key={`${result.bssid}-${index}`}
                      className="rounded-lg p-3 cursor-pointer card-hover glass-card animate-fadeIn group relative"
                      style={{ 
                        animationDelay: `${index * 50}ms`
                      }}
                      onClick={() => {
                        const marker = markers.find(m => m.bssid === result.bssid);
                        if (marker) {
                          setSelectedMarker(marker);
                          console.log('[Page] Setting flyToLocation from search history click:', {
                            bssid: result.bssid,
                            longitude: marker.position[0],
                            latitude: marker.position[1]
                          });
                          setFlyToLocation({
                            longitude: marker.position[0],
                            latitude: marker.position[1]
                          });
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium font-mono text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {formatBSSIDForDisplay(result.bssid)}
                            {result.source === 'china' && (
                              <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ 
                                backgroundColor: '#EE1C25', 
                                color: 'white' 
                              }}>
                                CN
                              </span>
                            )}
                          </p>
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div 
                          className="opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ShareButton 
                            url={generateShareUrl({ 
                              bssid: result.bssid,
                              latitude: result.location.latitude,
                              longitude: result.location.longitude,
                              mode: isMultiMode ? 'multi' : 'single'
                            })}
                            variant="icon"
                            className="!p-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative mobile-no-overscroll">
          <MapView
            markers={markers}
            onMarkerClick={handleMarkerClick}
            selectedMarker={selectedMarker}
            mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            flyToLocation={flyToLocation}
            onFlyToComplete={() => setFlyToLocation(null)}
            onMapClick={handleMapClick}
            clickedLocation={clickedLocation}
          />
          
          {/* Location search mode indicator */}
          {activeTab === 'location' && !isLocationSearching && !clickedLocation && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none animate-fadeIn">
              <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <svg className="w-5 h-5 animate-pulse" style={{ color: 'var(--color-primary-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Click anywhere on the map to search
                </span>
              </div>
            </div>
          )}
          
          {/* Location search loading indicator */}
          {isLocationSearching && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none animate-fadeIn">
              <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Searching for access points...
                </span>
              </div>
            </div>
          )}
          
          {/* Loading overlay for URL-based searches */}
          {isLoadingFromUrl && (
            <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="glass-card rounded-xl p-6 max-w-sm mx-4 animate-fadeIn" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-xl)'
              }}>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ 
                      borderColor: 'var(--color-primary-500)',
                      borderTopColor: 'transparent'
                    }} />
                    <svg className="absolute inset-0 w-16 h-16 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Loading Shared Location
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Searching for BSSID
                    </p>
                    {urlBssid && (
                      <p className="text-xs font-mono mt-2 break-all" style={{ color: 'var(--text-tertiary)' }}>
                        {urlBssid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile Search Bar - Floating on top of map */}
          <div className="lg:hidden absolute top-2 left-2 right-2 z-30">
            <div className="glass-card rounded-xl p-2 shadow-lg" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)'
            }}>
              <SearchControls
                isMultiMode={isMultiMode}
                onToggleMode={() => setIsMultiMode(!isMultiMode)}
                onSearchResult={(result) => handleSearchResult(result, false)}
                onManualSearchResult={handleManualSearchResult}
                onSearchResults={handleMultiSearchResults}
                compact={true}
                isLoadingFromUrl={isLoadingFromUrl}
                urlBssid={urlBssid}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLocationSearchStart={() => setIsLocationSearching(true)}
                onLocationSearchEnd={() => setIsLocationSearching(false)}
                isLocationSearching={isLocationSearching}
                clickedLocation={clickedLocation}
              />
            </div>
          </div>
          
        </div>

        {/* Mobile Bottom Sheet */}
        <MobileSheet
          selectedMarker={selectedMarker}
          searchHistory={searchHistory}
          onMarkerSelect={(marker) => {
            setSelectedMarker(marker);
            console.log('[Page] Setting flyToLocation from mobile sheet:', {
              bssid: marker.bssid,
              longitude: marker.position[0],
              latitude: marker.position[1]
            });
            setFlyToLocation({
              longitude: marker.position[0],
              latitude: marker.position[1]
            });
          }}
        >
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {searchHistory.length} locations found
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center gradient-mesh-vibrant" style={{ background: 'var(--bg-primary)', position: 'fixed', inset: 0 }}>
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ 
            borderColor: 'var(--color-primary-500)',
            borderTopColor: 'transparent'
          }} />
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}