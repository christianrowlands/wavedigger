'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ThemeToggle from '@/components/theme-toggle';
import AboutDialog from '@/components/about-dialog';
import MobileSheet from '@/components/mobile-sheet';
import SearchControls from '@/components/search-controls';
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

export default function Home() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [searchHistory, setSearchHistory] = useState<BSSIDSearchResult[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);

  const handleSearchResult = useCallback((result: BSSIDSearchResult) => {
    const newMarker: MapMarker = {
      id: `${result.bssid}-${Date.now()}`,
      bssid: result.bssid,
      position: [result.location.longitude, result.location.latitude],
      location: result.location,
    };
    
    setMarkers(prev => [...prev, newMarker]);
    setSearchHistory(prev => [result, ...prev.slice(0, 9)]);
    setSelectedMarker(newMarker);
  }, []);

  const handleMultiSearchResults = useCallback((results: BSSIDSearchResult[]) => {
    const newMarkers: MapMarker[] = results.map(result => ({
      id: `${result.bssid}-${Date.now()}`,
      bssid: result.bssid,
      position: [result.location.longitude, result.location.latitude],
      location: result.location,
    }));
    
    setMarkers(prev => [...prev, ...newMarkers]);
    setSearchHistory(prev => [...results, ...prev].slice(0, 20));
    
    // Select the first result
    if (newMarkers.length > 0) {
      setSelectedMarker(newMarkers[0]);
    }
  }, []);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
  }, []);

  const handleClearAll = () => {
    setMarkers([]);
    setSelectedMarker(null);
    setSearchHistory([]);
  };

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
              onSearchResult={handleSearchResult}
              onSearchResults={handleMultiSearchResults}
            />

            {/* Selected Marker Info */}
            {selectedMarker && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Selected Location
                </h3>
                <div className="rounded-lg p-4 space-y-2 transition-all glass-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>BSSID</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {selectedMarker.bssid}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Latitude</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {selectedMarker.location.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Longitude</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {selectedMarker.location.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Search History
                </h3>
                <div className="space-y-2">
                  {searchHistory.map((result, index) => (
                    <div
                      key={`${result.bssid}-${index}`}
                      className="rounded-lg p-3 cursor-pointer card-hover glass-card animate-fadeIn"
                      style={{ 
                        animationDelay: `${index * 50}ms`
                      }}
                      onClick={() => {
                        const marker = markers.find(m => m.bssid === result.bssid);
                        if (marker) setSelectedMarker(marker);
                      }}
                    >
                      <p className="font-medium font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                        {result.bssid}
                      </p>
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                      </p>
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
            onMarkerHover={setSelectedMarker}
            mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          />
          
          {/* Mobile Search Bar - Floating on top of map */}
          <div className="lg:hidden absolute top-2 left-2 right-2 z-30">
            <div className="glass-card rounded-xl p-2 shadow-lg" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)'
            }}>
              <SearchControls
                isMultiMode={isMultiMode}
                onToggleMode={() => setIsMultiMode(!isMultiMode)}
                onSearchResult={handleSearchResult}
                onSearchResults={handleMultiSearchResults}
                compact={true}
              />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Sheet */}
        <MobileSheet
          selectedMarker={selectedMarker}
          searchHistory={searchHistory}
          onMarkerSelect={setSelectedMarker}
        >
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {searchHistory.length} locations found
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}