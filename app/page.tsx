'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import BSSIDSearch from '@/components/bssid-search';
import type { BSSIDSearchResult, MapMarker, SearchError } from '@/types';
import { Info } from 'lucide-react';

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

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
  }, []);

  const handleClearAll = () => {
    setMarkers([]);
    setSelectedMarker(null);
    setSearchHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">BSSID Location Search</h1>
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              disabled={markers.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="lg:w-96 bg-white shadow-lg z-10 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Search Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Search for BSSID</h2>
              <BSSIDSearch onSearchResult={handleSearchResult} />
            </div>

            {/* Service Description */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-1">What is this service?</p>
                  <p className="mb-2">
                    This tool queries Apple's location database to find the approximate location 
                    of Wi-Fi access points based on their BSSID (MAC address).
                  </p>
                  <p className="text-xs text-gray-600">
                    Note: This is a demonstration using mock data. In production, this would 
                    connect to Apple's WLOC API service.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Marker Info */}
            {selectedMarker && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Selected Location</h3>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <p><span className="font-medium">BSSID:</span> {selectedMarker.bssid}</p>
                  <p><span className="font-medium">Latitude:</span> {selectedMarker.location.latitude.toFixed(6)}</p>
                  <p><span className="font-medium">Longitude:</span> {selectedMarker.location.longitude.toFixed(6)}</p>
                  {selectedMarker.location.altitude && (
                    <p><span className="font-medium">Altitude:</span> {selectedMarker.location.altitude.toFixed(1)}m</p>
                  )}
                </div>
              </div>
            )}

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Search History</h3>
                <div className="space-y-2">
                  {searchHistory.map((result, index) => (
                    <div
                      key={`${result.bssid}-${index}`}
                      className="text-sm bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        const marker = markers.find(m => m.bssid === result.bssid);
                        if (marker) setSelectedMarker(marker);
                      }}
                    >
                      <p className="font-medium">{result.bssid}</p>
                      <p className="text-xs text-gray-600">
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
        <div className="flex-1 relative">
          <MapView
            markers={markers}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={setSelectedMarker}
            mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          />
        </div>
      </div>
    </div>
  );
}