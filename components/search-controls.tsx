'use client';

import React from 'react';
import BSSIDSearch from '@/components/bssid-search';
import MultiBSSIDSearch from '@/components/bssid-search-multi';
import LocationSearch from '@/components/location-search';
import CellTowerSearch from '@/components/cell-tower-search';
import { ToggleLeft, ToggleRight, Search, MapPin, AlertCircle, Signal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAnalytics } from '@/hooks/use-analytics';
import type { BSSIDSearchResult, CellTowerSearchResult } from '@/types';

interface SearchControlsProps {
  isMultiMode: boolean;
  onToggleMode: () => void;
  onSearchResult: (result: BSSIDSearchResult) => void;
  onManualSearchResult?: (result: BSSIDSearchResult) => void;
  onSearchResults: (results: BSSIDSearchResult[]) => void;
  onLocationSearchResults?: (results: BSSIDSearchResult[]) => void;
  onCellTowerSearchResults?: (results: CellTowerSearchResult[]) => void;
  compact?: boolean;
  isLoadingFromUrl?: boolean;
  urlBssid?: string | null;
  activeTab?: 'bssid' | 'location' | 'celltower';
  onTabChange?: (tab: 'bssid' | 'location' | 'celltower') => void;
  onLocationSearchStart?: () => void;
  onLocationSearchEnd?: () => void;
  isLocationSearching?: boolean;
  clickedLocation?: { latitude: number; longitude: number } | null;
  selectedTowerParams?: { mcc: string; mnc: string; tac: string; cellId: string } | null;
}

export default function SearchControls({
  isMultiMode,
  onToggleMode,
  onSearchResult,
  onManualSearchResult,
  onSearchResults,
  onLocationSearchResults,
  onCellTowerSearchResults,
  compact = false,
  isLoadingFromUrl = false,
  urlBssid = null,
  activeTab = 'bssid',
  onTabChange,
  onLocationSearchStart,
  onLocationSearchEnd,
  isLocationSearching = false,
  clickedLocation,
  selectedTowerParams
}: SearchControlsProps) {
  const { trackTabSwitch } = useAnalytics();
  
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
    // Mobile compact mode with tab pills
    return (
      <div className="space-y-2">
        {/* Hidden LocationSearch component to handle search logic */}
        {activeTab === 'location' && (
          <div style={{ display: 'none' }}>
            <LocationSearch 
              onSearchResults={onLocationSearchResults || onSearchResults}
              onSearchStart={onLocationSearchStart}
              onSearchEnd={onLocationSearchEnd}
              isSearching={isLocationSearching}
              clickedLocation={clickedLocation}
            />
          </div>
        )}
        {/* Compact tab pills - 3 tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => {
              if (activeTab !== 'bssid') {
                trackTabSwitch(activeTab, 'bssid');
                onTabChange?.('bssid');
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'bssid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
            }`}
            style={{
              color: activeTab === 'bssid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: activeTab === 'bssid' ? 'var(--bg-primary)' : 'transparent'
            }}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">BSSID</span>
          </button>
          <button
            onClick={() => {
              if (activeTab !== 'location') {
                trackTabSwitch(activeTab, 'location');
                onTabChange?.('location');
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all relative ${
              activeTab === 'location' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
            }`}
            style={{
              color: activeTab === 'location' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: activeTab === 'location' ? 'var(--bg-primary)' : 'transparent'
            }}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">Location</span>
            <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded-full" style={{
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning-dark)',
              fontWeight: '600',
              lineHeight: '1'
            }}>
              β
            </span>
          </button>
          <button
            onClick={() => {
              if (activeTab !== 'celltower') {
                trackTabSwitch(activeTab, 'celltower');
                onTabChange?.('celltower');
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'celltower' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
            }`}
            style={{
              color: activeTab === 'celltower' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: activeTab === 'celltower' ? 'var(--bg-primary)' : 'transparent'
            }}
          >
            <Signal className="h-3.5 w-3.5" />
            <span className="text-xs">Cell</span>
          </button>
        </div>
        
        {/* Content based on active tab */}
        {activeTab === 'celltower' ? (
          <div className="space-y-2 animate-fadeIn">
            <CellTowerSearch 
              onSearchResults={onCellTowerSearchResults || ((results) => {
                // Convert cell tower results to BSSID results format for compatibility
                const bssidResults = results.map(r => ({
                  bssid: `Cell-${r.tower.cellId}`,
                  location: r.location,
                  accuracy: r.accuracy,
                  source: r.source
                } as BSSIDSearchResult));
                onSearchResults(bssidResults);
              })}
              compact={true}
              initialMcc={selectedTowerParams?.mcc || ''}
              initialMnc={selectedTowerParams?.mnc || ''}
              initialTac={selectedTowerParams?.tac || ''}
              initialCellId={selectedTowerParams?.cellId || ''}
            />
          </div>
        ) : activeTab === 'location' ? (
          <div className="space-y-2 animate-fadeIn">
            {/* Show search progress when searching */}
            {isLocationSearching ? (
              <div className="flex items-center gap-2 p-3 rounded-lg animate-pulse" style={{ 
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-secondary)'
              }}>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" 
                     style={{ color: 'var(--color-primary-500)' }} />
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Searching for nearby access points...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-secondary)'
                }}>
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary-500)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Tap anywhere on the map to search for nearby access points
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg" style={{ 
                  backgroundColor: 'var(--color-warning-light)',
                  border: '1px solid var(--color-warning-border)'
                }}>
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning-dark)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>
                    <strong>Note:</strong> Location accuracy limited by Apple&apos;s tile system (~5km precision)
                  </p>
                </div>
              </>
            )}
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
      <h2 className="text-lg font-semibold mb-4">
        {activeTab === 'celltower' ? 'Search LTE Towers' : 
         activeTab === 'location' ? 'Search by Location' : 
         'Search Access Points'}
      </h2>
      
      <Tabs 
        defaultValue="bssid"
        value={activeTab} 
        onValueChange={(value) => {
          const newTab = value as 'bssid' | 'location' | 'celltower';
          if (newTab !== activeTab) {
            trackTabSwitch(activeTab, newTab);
          }
          onTabChange?.(newTab);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="bssid" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>BSSID Lookup</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2 relative">
            <MapPin className="h-4 w-4" />
            <span>Location Search</span>
            <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded-full" style={{
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning-dark)',
              fontWeight: '600',
              lineHeight: '1'
            }}>
              β
            </span>
          </TabsTrigger>
          <TabsTrigger value="celltower" className="flex items-center gap-2">
            <Signal className="h-4 w-4" />
            <span>Cell Tower</span>
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
            onSearchResults={onLocationSearchResults || onSearchResults}
            onSearchStart={onLocationSearchStart}
            onSearchEnd={onLocationSearchEnd}
            isSearching={isLocationSearching}
            clickedLocation={clickedLocation}
          />
        </TabsContent>
        
        <TabsContent value="celltower">
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Search for LTE cell towers by network parameters
            </p>
            <CellTowerSearch 
              onSearchResults={onCellTowerSearchResults || ((results) => {
                // Convert cell tower results to BSSID results format for compatibility
                const bssidResults = results.map(r => ({
                  bssid: `Cell-${r.tower.cellId}`,
                  location: r.location,
                  accuracy: r.accuracy,
                  source: r.source
                } as BSSIDSearchResult));
                onSearchResults(bssidResults);
              })}
              initialMcc={selectedTowerParams?.mcc || ''}
              initialMnc={selectedTowerParams?.mnc || ''}
              initialTac={selectedTowerParams?.tac || ''}
              initialCellId={selectedTowerParams?.cellId || ''}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}