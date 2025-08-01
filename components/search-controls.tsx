'use client';

import React from 'react';
import BSSIDSearch from '@/components/bssid-search';
import MultiBSSIDSearch from '@/components/bssid-search-multi';
import LocationSearch from '@/components/location-search';
import { ToggleLeft, ToggleRight, Search, MapPin } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { BSSIDSearchResult } from '@/types';

interface SearchControlsProps {
  isMultiMode: boolean;
  onToggleMode: () => void;
  onSearchResult: (result: BSSIDSearchResult) => void;
  onManualSearchResult?: (result: BSSIDSearchResult) => void;
  onSearchResults: (results: BSSIDSearchResult[]) => void;
  compact?: boolean;
  isLoadingFromUrl?: boolean;
  urlBssid?: string | null;
  activeTab?: 'bssid' | 'location';
  onTabChange?: (tab: 'bssid' | 'location') => void;
  onLocationSearchStart?: () => void;
  onLocationSearchEnd?: () => void;
  isLocationSearching?: boolean;
  clickedLocation?: { latitude: number; longitude: number } | null;
}

export default function SearchControls({
  isMultiMode,
  onToggleMode,
  onSearchResult,
  onManualSearchResult,
  onSearchResults,
  compact = false,
  isLoadingFromUrl = false,
  urlBssid = null,
  activeTab = 'bssid',
  onTabChange,
  onLocationSearchStart,
  onLocationSearchEnd,
  isLocationSearching = false,
  clickedLocation
}: SearchControlsProps) {
  // For mobile compact mode, we'll pass the toggle button to the search component
  const toggleButton = (
    <button
      onClick={onToggleMode}
      className={`p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center ${
        isMultiMode ? 'gradient-card-1' : 'glass-card'
      }`}
      style={{
        color: 'var(--text-primary)',
        fontWeight: isMultiMode ? '600' : '500'
      }}
      title={isMultiMode ? 'Switch to single BSSID mode' : 'Switch to multi BSSID mode'}
    >
      {isMultiMode ? (
        <ToggleRight className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
      ) : (
        <ToggleLeft className="h-4 w-4" style={{ color: 'var(--color-primary-400)' }} />
      )}
    </button>
  );

  if (compact) {
    // Mobile compact mode - simplified without tabs for now
    // In future, could add swipe gestures or dropdown to switch modes
    return (
      <div>
        {activeTab === 'location' ? (
          <div className="text-sm text-center p-2" style={{ color: 'var(--text-secondary)' }}>
            Tap the map to search nearby APs
          </div>
        ) : (
          isMultiMode ? (
            <MultiBSSIDSearch onSearchResults={onSearchResults} mobileToggle={toggleButton} />
          ) : (
            <BSSIDSearch 
              onSearchResult={onSearchResult}
              onManualSearchResult={onManualSearchResult}
              onSearchResults={onSearchResults}
              mobileToggle={toggleButton}
              isLoadingFromUrl={isLoadingFromUrl}
              urlBssid={urlBssid}
            />
          )
        )}
      </div>
    );
  }

  // Desktop layout with tabs
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Search Access Points</h2>
      
      <Tabs 
        defaultValue="bssid"
        value={activeTab} 
        onValueChange={(value) => onTabChange?.(value as 'bssid' | 'location')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="bssid" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>BSSID Lookup</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Location Search</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full ml-1" style={{
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning-dark)',
              fontWeight: '600'
            }}>
              Beta
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bssid">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Search for specific access points by BSSID
              </p>
              <button
                onClick={onToggleMode}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-all hover:scale-105 ${
                  isMultiMode ? 'gradient-card-1' : 'glass-card'
                }`}
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: isMultiMode ? '600' : '500'
                }}
                title={isMultiMode ? 'Switch to single BSSID mode' : 'Switch to multi BSSID mode'}
              >
                {isMultiMode ? (
                  <>
                    <ToggleRight className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                    <span>Multi</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" style={{ color: 'var(--color-primary-400)' }} />
                    <span>Single</span>
                  </>
                )}
              </button>
            </div>
            {isMultiMode ? (
              <MultiBSSIDSearch onSearchResults={onSearchResults} />
            ) : (
              <BSSIDSearch 
                onSearchResult={onSearchResult}
                onManualSearchResult={onManualSearchResult}
                onSearchResults={onSearchResults}
                isLoadingFromUrl={isLoadingFromUrl}
                urlBssid={urlBssid}
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="location">
          <LocationSearch 
            onSearchResults={onSearchResults}
            onSearchStart={onLocationSearchStart}
            onSearchEnd={onLocationSearchEnd}
            isSearching={isLocationSearching}
            clickedLocation={clickedLocation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}