'use client';

// TODO: When refactoring to SSR/SSG, uncomment and use this for dynamic metadata:
// export { generateMetadata } from '@/lib/metadata-utils';

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
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvents } from '@/lib/analytics';
import { formatBSSIDForURL, parseBSSIDFromURL, formatBSSIDForDisplay } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, MapMarker, CellTowerSearchResult } from '@/types';
import { formatCellTowerInfo, isCellTowerLabel, parseCellTowerInfo } from '@/lib/cell-tower-utils';

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
  const [cellTowerSearchHistory, setCellTowerSearchHistory] = useState<BSSIDSearchResult[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ longitude: number; latitude: number; zoom?: number } | null>(null);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [urlBssid, setUrlBssid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bssid' | 'location' | 'celltower'>('bssid');
  const [clickedLocation, setClickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [selectedTowerParams, setSelectedTowerParams] = useState<{ 
    mcc: string; 
    mnc: string; 
    tac: string; 
    cellId: string; 
  } | null>(null);
  const [shouldCloseSheet, setShouldCloseSheet] = useState(false);
  const [hasUrlLoadedTowerResults, setHasUrlLoadedTowerResults] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessedUrl = useRef(false);
  const { generateShareUrl } = useShareUrl();
  const { trackClearAllMarkers, logEvent } = useAnalytics();

  // Update URL with current search state
  const updateUrl = useCallback((options?: {
    bssid?: string;
    mcc?: number;
    mnc?: number;
    tac?: number;
    cellId?: number;
    returnAll?: boolean;
    tab?: string;
    clearTower?: boolean;
  }) => {
    // Start with existing search params to preserve them
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle BSSID parameter
    if (options?.bssid) {
      // Format BSSID with hyphens for cleaner URLs
      params.set('bssid', formatBSSIDForURL(options.bssid));
      // Clear tower params if setting BSSID
      params.delete('mcc');
      params.delete('mnc');
      params.delete('tac');
      params.delete('cellId');
      params.delete('returnAll');
    } else if (!options?.bssid && params.has('bssid')) {
      params.delete('bssid');
    }
    
    // Handle cell tower parameters
    if (options?.mcc !== undefined && options?.mnc !== undefined && 
        options?.tac !== undefined && options?.cellId !== undefined) {
      params.set('mcc', options.mcc.toString());
      params.set('mnc', options.mnc.toString());
      params.set('tac', options.tac.toString());
      params.set('cellId', options.cellId.toString());
      if (options.returnAll !== undefined) {
        params.set('returnAll', options.returnAll.toString());
      }
      // Clear BSSID if setting tower params
      params.delete('bssid');
    } else if (options?.clearTower) {
      params.delete('mcc');
      params.delete('mnc');
      params.delete('tac');
      params.delete('cellId');
      params.delete('returnAll');
    }
    
    // Handle tab parameter
    if (options?.tab) {
      params.set('tab', options.tab);
    }
    
    // Handle multi mode
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
      setFlyToLocation({
        longitude: result.location.longitude,
        latitude: result.location.latitude
      });
    }
    
    // Update URL with the searched BSSID (only if not loading from URL)
    if (!isLoadingFromUrl) {
      updateUrl({ bssid: result.bssid });
    }
  }, [updateUrl, isLoadingFromUrl]);
  
  const handleManualSearchResult = useCallback((result: BSSIDSearchResult) => {
    // Add to search history for manual searches (only if it's not a cell tower)
    if (!isCellTowerLabel(result.bssid)) {
      setSearchHistory(prev => [result, ...prev.slice(0, 9)]);
    }
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
    
    // Add all results to search history (only non-cell tower results)
    const nonCellTowerResults = results.filter(r => !isCellTowerLabel(r.bssid));
    if (nonCellTowerResults.length > 0) {
      setSearchHistory(prev => {
        // Combine new results with existing history, avoiding duplicates
        const combined = [...nonCellTowerResults, ...prev];
        // Remove duplicates based on BSSID
        const unique = combined.filter((item, index, self) =>
          index === self.findIndex((t) => t.bssid === item.bssid)
        );
        // Keep only the 10 most recent
        return unique.slice(0, 10);
      });
    }
    
    // Select the first result
    if (newMarkers.length > 0) {
      setSelectedMarker(newMarkers[0]);
      
      // Calculate center point of all results
      const lats = results.map(r => r.location.latitude);
      const lngs = results.map(r => r.location.longitude);
      
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      // Fly to center of all results
      setFlyToLocation({
        longitude: centerLng,
        latitude: centerLat
      });
    }
  }, []);

  const handleCellTowerSearchResults = useCallback((results: CellTowerSearchResult[], searchParams?: {
    mcc: number;
    mnc: number;
    tac: number;
    cellId: number;
    returnAll: boolean;
  }) => {
    const newMarkers: MapMarker[] = results.map((result, index) => {
      const towerLabel = formatCellTowerInfo(
        result.tower.mcc,
        result.tower.mnc,
        result.tower.cellId,
        result.tower.tacId,
        result.tower.uarfcn,
        result.tower.pid
      );
      return {
        id: `cell-${result.tower.cellId}-${Date.now()}-${index}`,
        bssid: towerLabel,
        position: [result.location.longitude, result.location.latitude],
        location: result.location,
        source: result.source,
        accuracy: result.accuracy,
        type: 'cell' as const
      };
    });
    
    setMarkers(newMarkers);
    // Select the first tower (the searched one)
    if (newMarkers.length > 0) {
      setSelectedMarker(newMarkers[0]);
      // Set tower params for auto-populate
      const towerInfo = parseCellTowerInfo(newMarkers[0].bssid);
      if (towerInfo) {
        setSelectedTowerParams({
          mcc: towerInfo.mcc.toString(),
          mnc: towerInfo.mnc.toString(),
          tac: towerInfo.tacId.toString(),
          cellId: towerInfo.cellId.toString()
        });
      }
    } else {
      setSelectedMarker(null);
      setSelectedTowerParams(null);
    }
    
    // Zoom to show all results
    if (results.length > 0) {
      const bounds = {
        minLat: Math.min(...results.map(r => r.location.latitude)),
        maxLat: Math.max(...results.map(r => r.location.latitude)),
        minLng: Math.min(...results.map(r => r.location.longitude)),
        maxLng: Math.max(...results.map(r => r.location.longitude))
      };
      
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      
      // Calculate appropriate zoom level based on bounds
      const latSpan = bounds.maxLat - bounds.minLat;
      const lngSpan = bounds.maxLng - bounds.minLng;
      const span = Math.max(latSpan, lngSpan);
      
      let zoom = 16; // Default close zoom for single result
      if (span > 0.5) zoom = 8;
      else if (span > 0.2) zoom = 10;
      else if (span > 0.1) zoom = 11;
      else if (span > 0.05) zoom = 12;
      else if (span > 0.02) zoom = 13;
      else if (span > 0.01) zoom = 14;
      else if (span > 0.005) zoom = 15;
      
      setFlyToLocation({
        longitude: centerLng,
        latitude: centerLat,
        zoom: zoom
      });
    }
    
    // Add to cell tower history - convert first cell tower to BSSID format for compatibility
    if (results.length > 0) {
      const towerLabel = formatCellTowerInfo(
        results[0].tower.mcc,
        results[0].tower.mnc,
        results[0].tower.cellId,
        results[0].tower.tacId,
        results[0].tower.uarfcn,
        results[0].tower.pid
      );
      
      const historyItem: BSSIDSearchResult = {
        bssid: towerLabel,
        location: results[0].location,
        accuracy: results[0].accuracy,
        timestamp: new Date().toISOString(),
        source: results[0].source
      };
      
      setCellTowerSearchHistory(prev => {
        const newHistory = [historyItem, ...prev.filter(item => 
          item.bssid !== towerLabel
        )].slice(0, 20);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cellTowerSearchHistory', JSON.stringify(newHistory));
        }
        return newHistory;
      });
    }
    
    // Update URL with tower parameters if provided
    if (searchParams && !isLoadingFromUrl) {
      updateUrl({
        mcc: searchParams.mcc,
        mnc: searchParams.mnc,
        tac: searchParams.tac,
        cellId: searchParams.cellId,
        returnAll: searchParams.returnAll
      });
    }
  }, [updateUrl, isLoadingFromUrl]);

  const handleLocationSearchResults = useCallback((results: BSSIDSearchResult[]) => {
    const newMarkers: MapMarker[] = results.map((result, index) => ({
      id: `${result.bssid}-${Date.now()}-${index}`,
      bssid: result.bssid,
      position: [result.location.longitude, result.location.latitude],
      location: result.location,
      source: result.source,
      accuracy: result.accuracy
    }));
    
    setMarkers(prev => [...prev, ...newMarkers]);
    
    // Do NOT add to search history for location searches
    
    // Select the first result
    if (newMarkers.length > 0) {
      setSelectedMarker(newMarkers[0]);
      
      // Calculate center point of all results
      const lats = results.map(r => r.location.latitude);
      const lngs = results.map(r => r.location.longitude);
      
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      // Fly to center of all results
      setFlyToLocation({
        longitude: centerLng,
        latitude: centerLat
      });
    }
    
    // Stop the searching state
    setIsLocationSearching(false);
    setClickedLocation(null);
  }, []);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
    
    // If it's a cell tower, extract and set the tower parameters for auto-populate
    if (marker.type === 'cell') {
      const towerInfo = parseCellTowerInfo(marker.bssid);
      if (towerInfo) {
        setSelectedTowerParams({
          mcc: towerInfo.mcc.toString(),
          mnc: towerInfo.mnc.toString(),
          tac: towerInfo.tacId.toString(),
          cellId: towerInfo.cellId.toString()
        });
      }
    } else {
      setSelectedTowerParams(null);
    }
  }, []);

  const handleMapClick = useCallback((longitude: number, latitude: number) => {
    // Only handle map clicks when location search tab is active
    if (activeTab === 'location') {
      setClickedLocation({ latitude, longitude });
    }
  }, [activeTab]);

  const handleTabChange = useCallback((tab: 'bssid' | 'location' | 'celltower') => {
    setActiveTab(tab);
    updateUrl({ tab });
    // Reset URL-loaded tower results flag when changing tabs
    if (tab !== 'celltower') {
      setHasUrlLoadedTowerResults(false);
    }
  }, [updateUrl]);

  const handleClearAll = () => {
    // Track the clear all action before clearing
    trackClearAllMarkers(markers.length);
    
    setMarkers([]);
    setSelectedMarker(null);
    setSearchHistory([]);
    setCellTowerSearchHistory([]);
    // Close the mobile sheet since there's no content
    setShouldCloseSheet(true);
    // Reset URL-loaded tower results flag
    setHasUrlLoadedTowerResults(false);
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
    const tabParam = searchParams.get('tab');
    const mccParam = searchParams.get('mcc');
    const mncParam = searchParams.get('mnc');
    const tacParam = searchParams.get('tac');
    const cellIdParam = searchParams.get('cellId');
    const returnAllParam = searchParams.get('returnAll');
    
    // Set tab if provided
    if (tabParam && (tabParam === 'bssid' || tabParam === 'location' || tabParam === 'celltower')) {
      setActiveTab(tabParam);
    }
    
    if (modeParam === 'multi') {
      setIsMultiMode(true);
    }
    
    // Handle cell tower search from URL
    if (mccParam && mncParam && tacParam && cellIdParam && !hasProcessedUrl.current) {
      hasProcessedUrl.current = true;
      setIsLoadingFromUrl(true);
      
      const searchCellTower = async () => {
        try {
          const params = new URLSearchParams({
            mcc: mccParam,
            mnc: mncParam,
            tacId: tacParam,
            cellId: cellIdParam,
            returnAll: returnAllParam === 'true' ? 'true' : 'false'
          });
          
          const response = await fetch(`/api/cell-tower?${params}`);
          const data = await response.json();
          
          if (response.ok && data.results) {
            // Handle the cell tower results
            handleCellTowerSearchResults(data.results, {
              mcc: parseInt(mccParam, 10),
              mnc: parseInt(mncParam, 10),
              tac: parseInt(tacParam, 10),
              cellId: parseInt(cellIdParam, 10),
              returnAll: returnAllParam === 'true'
            });
            
            // Set tab to cell tower if not already set
            setActiveTab('celltower');
            // Mark that we loaded tower results from URL
            setHasUrlLoadedTowerResults(true);
          }
        } catch (error) {
          console.error('Error loading shared cell tower:', error);
        } finally {
          setIsLoadingFromUrl(false);
        }
      };
      
      searchCellTower();
    } else if (bssidParam && !hasProcessedUrl.current) {
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
            // Track URL BSSID load
            logEvent(AnalyticsEvents.URL_BSSID_LOAD, {
              success: true,
              has_lat_lng: !!(latParam && lngParam)
            });
            
            // For URL-loaded searches, fly to the location
            handleSearchResult(data.result, true);
            
            // Add to search history for URL-loaded searches (only if it's not a cell tower)
            if (!isCellTowerLabel(data.result.bssid)) {
              setSearchHistory(prev => [data.result, ...prev.slice(0, 9)]);
            }
            
            // If specific lat/lng provided, use those instead
            if (latParam && lngParam) {
              const lat = parseFloat(latParam);
              const lng = parseFloat(lngParam);
              if (!isNaN(lat) && !isNaN(lng)) {
                setFlyToLocation({ latitude: lat, longitude: lng });
              }
            }
          } else {
            // Track failed URL BSSID load
            logEvent(AnalyticsEvents.URL_BSSID_LOAD, {
              success: false,
              has_lat_lng: !!(latParam && lngParam)
            });
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
  }, [searchParams, handleSearchResult, handleCellTowerSearchResults, logEvent]);

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
                {/* Digger icon */}
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 40 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M37,0h-13c-.33,0-.65,.17-.83,.45l-2.91,4.37-.82-1.97c-.47-1.12-1.56-1.85-2.77-1.85H8c-1.66,0-3,1.34-3,3v4h-1.08c-1.61,0-2.92,1.31-2.92,2.92v2.58c-.61,.46-1,1.18-1,2v3c0,1.38,1.12,2.5,2.5,2.5h2.5v1.08c-2.84,.48-5,2.94-5,5.92,0,3.31,2.69,6,6,6H29c3.31,0,6-2.69,6-6h0c0-3.31-2.69-6-6-6h-8v-1h2.5c1.38,0,2.5-1.12,2.5-2.5v-3c0-1-.59-1.86-1.43-2.26l4.02-7.24h5.41V15h-4c-.33,0-.64,.16-.83,.44-.19,.27-.22,.62-.1,.93,0,0,.78,1.95,2.11,3.52,1.01,1.19,2.33,2.11,3.82,2.11h2.05c1.63,0,2.95-1.32,2.95-2.95V3c0-1.66-1.34-3-3-3h0ZM6,24H29c2.21,0,4,1.79,4,4h0c0,2.21-1.79,4-4,4H6c-2.21,0-4-1.79-4-4s1.79-4,4-4h0Zm1,1c-1.66,0-3,1.34-3,3s1.34,3,3,3,3-1.34,3-3-1.34-3-3-3h0Zm7,0c-1.66,0-3,1.34-3,3s1.34,3,3,3,3-1.34,3-3-1.34-3-3-3h0Zm7,0c-1.66,0-3,1.34-3,3s1.34,3,3,3,3-1.34,3-3-1.34-3-3-3h0Zm7,0c-1.66,0-3,1.34-3,3s1.34,3,3,3,3-1.34,3-3-1.34-3-3-3h0Zm-21,2c.55,0,1,.45,1,1s-.45,1-1,1-1-.45-1-1,.45-1,1-1h0Zm7,0c.55,0,1,.45,1,1s-.45,1-1,1-1-.45-1-1,.45-1,1-1h0Zm7,0c.55,0,1,.45,1,1s-.45,1-1,1-1-.45-1-1,.45-1,1-1h0Zm7,0c.55,0,1,.45,1,1s-.45,1-1,1-1-.45-1-1,.45-1,1-1h0ZM7,22h12v-1H7v1h0Zm28-5h3v2.05c0,.53-.43,.95-.95,.95h-2.05c-.92,0-1.67-.67-2.29-1.41-.44-.52-.81-1.09-1.1-1.59h3.39Zm-11.5-2H2.5c-.28,0-.5,.22-.5,.5v3.01c0,.27,.22,.5,.5,.5H23.5c.28,0,.5-.22,.5-.5v-3.01c0-.27-.22-.5-.5-.5h0Zm14.5-9.17c-.31,.11-.65,.17-1,.17h-1V15h2V5.83h0Zm-16.5,7.17l-3.91-9.38c-.16-.37-.52-.62-.92-.62H8c-.55,0-1,.45-1,1V13h14.5ZM5,10h-1.08c-.51,0-.92,.41-.92,.92v2.08h2v-3h0ZM9,4c-.55,0-1,.45-1,1v6c0,.55,.45,1,1,1h9c.32,0,.62-.15,.81-.42,.19-.26,.24-.6,.14-.9l-2-6c-.14-.41-.52-.68-.95-.68h-7Zm15.54-2l-3.36,5.03,1.95,4.68,4-7.2c.18-.32,.51-.51,.87-.51h6v-1c0-.35,.06-.69,.17-1h-9.63Zm-13.54,8v4h-1v-4h1Zm2,0h2.28l1.33,4h-3.61v-4h0Zm24-6c.55,0,1,.45,1,1s-.45,1-1,1-1-.45-1-1,.45-1,1-1h0Z" fill="white" />
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
              onLocationSearchResults={handleLocationSearchResults}
              onCellTowerSearchResults={handleCellTowerSearchResults}
              isLoadingFromUrl={isLoadingFromUrl}
              urlBssid={urlBssid}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLocationSearchStart={() => setIsLocationSearching(true)}
              onLocationSearchEnd={() => setIsLocationSearching(false)}
              isLocationSearching={isLocationSearching}
              clickedLocation={clickedLocation}
              selectedTowerParams={selectedTowerParams}
              hasUrlLoadedTowerResults={hasUrlLoadedTowerResults}
            />

            {/* Selected Marker Info */}
            {selectedMarker && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedMarker.type === 'cell' ? 'Selected Tower' : 'Selected BSSID'}
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
                    url={(() => {
                      // Generate appropriate URL based on marker type
                      if (selectedMarker.type === 'cell') {
                        const towerInfo = parseCellTowerInfo(selectedMarker.bssid);
                        if (towerInfo) {
                          return generateShareUrl({
                            mcc: towerInfo.mcc,
                            mnc: towerInfo.mnc,
                            tac: towerInfo.tacId,
                            cellId: towerInfo.cellId,
                            latitude: selectedMarker.location.latitude,
                            longitude: selectedMarker.location.longitude,
                            tab: 'celltower'
                          });
                        }
                      }
                      // Default to BSSID-based URL
                      return generateShareUrl({ 
                        bssid: selectedMarker.bssid,
                        latitude: selectedMarker.location.latitude,
                        longitude: selectedMarker.location.longitude,
                        mode: isMultiMode ? 'multi' : 'single'
                      });
                    })()}
                    variant="icon"
                    analyticsSource="selected_marker"
                  />
                </div>
                <div className="rounded-lg p-4 space-y-2 transition-all glass-primary">
                  {selectedMarker.type === 'cell' ? (
                    // Cell Tower formatting
                    (() => {
                      const towerInfo = parseCellTowerInfo(selectedMarker.bssid);
                      if (!towerInfo) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Carrier</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {towerInfo.carrier}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>MCC / MNC</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                                {towerInfo.mcc} / {towerInfo.mnc}
                              </span>
                              <CopyButton 
                                text={`${towerInfo.mcc}/${towerInfo.mnc}`} 
                                label="MCC/MNC"
                                analyticsSource="selected_marker"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>TAC</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                                {towerInfo.tacId}
                              </span>
                              <CopyButton 
                                text={towerInfo.tacId.toString()} 
                                label="TAC"
                                analyticsSource="selected_marker"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Cell ID</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                                {towerInfo.cellId}
                              </span>
                              <CopyButton 
                                text={towerInfo.cellId.toString()} 
                                label="Cell ID"
                                analyticsSource="selected_marker"
                              />
                            </div>
                          </div>
                          {towerInfo.uarfcn !== undefined && (
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-sm font-medium" 
                                style={{ color: 'var(--text-tertiary)' }}
                                title="E-UTRA Absolute Radio Frequency Channel Number - identifies the LTE frequency band"
                              >
                                EARFCN
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                                  {towerInfo.uarfcn}
                                </span>
                                <CopyButton 
                                  text={towerInfo.uarfcn.toString()} 
                                  label="EARFCN"
                                  analyticsSource="selected_marker"
                                />
                              </div>
                            </div>
                          )}
                          {towerInfo.pid !== undefined && (
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-sm font-medium" 
                                style={{ color: 'var(--text-tertiary)' }}
                                title="Physical Cell ID - unique identifier for the cell within the local area"
                              >
                                PCI
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                                  {towerInfo.pid}
                                </span>
                                <CopyButton 
                                  text={towerInfo.pid.toString()} 
                                  label="PCI"
                                  analyticsSource="selected_marker"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    // BSSID formatting
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>BSSID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                          {formatBSSIDForDisplay(selectedMarker.bssid)}
                        </span>
                        <CopyButton 
                          text={formatBSSIDForDisplay(selectedMarker.bssid)} 
                          label="BSSID"
                          analyticsType="bssid"
                          analyticsSource="selected_marker"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Location</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                        {selectedMarker.location.latitude.toFixed(6)}, {selectedMarker.location.longitude.toFixed(6)}
                      </span>
                      <CopyButton 
                        text={`${selectedMarker.location.latitude.toFixed(6)}, ${selectedMarker.location.longitude.toFixed(6)}`} 
                        label="Location"
                        analyticsType="location"
                        analyticsSource="selected_marker"
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

            {/* BSSID Search History */}
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
                          setFlyToLocation({
                            longitude: marker.position[0],
                            latitude: marker.position[1]
                          });
                          // Set tower params for auto-populate
                          if (marker.type === 'cell') {
                            const towerInfo = parseCellTowerInfo(marker.bssid);
                            if (towerInfo) {
                              setSelectedTowerParams({
                                mcc: towerInfo.mcc.toString(),
                                mnc: towerInfo.mnc.toString(),
                                tac: towerInfo.tacId.toString(),
                                cellId: towerInfo.cellId.toString()
                              });
                            }
                          } else {
                            setSelectedTowerParams(null);
                          }
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
                            analyticsSource="search_history"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cell Tower Search History */}
            {cellTowerSearchHistory.length > 0 && activeTab === 'celltower' && (
              <div className="border-t pt-4 animate-slideIn" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Tower Search History
                </h3>
                <div className="space-y-2">
                  {cellTowerSearchHistory.map((result, index) => (
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
                          setFlyToLocation({
                            longitude: marker.position[0],
                            latitude: marker.position[1]
                          });
                          // Set tower params for auto-populate
                          if (marker.type === 'cell') {
                            const towerInfo = parseCellTowerInfo(marker.bssid);
                            if (towerInfo) {
                              setSelectedTowerParams({
                                mcc: towerInfo.mcc.toString(),
                                mnc: towerInfo.mnc.toString(),
                                tac: towerInfo.tacId.toString(),
                                cellId: towerInfo.cellId.toString()
                              });
                            }
                          } else {
                            setSelectedTowerParams(null);
                          }
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {result.bssid.split(' - ')[0]}
                            {result.source === 'china' && (
                              <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ 
                                backgroundColor: '#EE1C25', 
                                color: 'white' 
                              }}>
                                CN
                              </span>
                            )}
                          </p>
                          {(() => {
                            const towerInfo = parseCellTowerInfo(result.bssid);
                            if (!towerInfo) return null;
                            return (
                              <>
                                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                                  MCC:{towerInfo.mcc} MNC:{towerInfo.mnc} TAC:{towerInfo.tacId} Cell:{towerInfo.cellId}
                                </p>
                                {(towerInfo.uarfcn !== undefined || towerInfo.pid !== undefined) && (
                                  <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    {towerInfo.uarfcn !== undefined && `EARFCN:${towerInfo.uarfcn}`}
                                    {towerInfo.uarfcn !== undefined && towerInfo.pid !== undefined && ' • '}
                                    {towerInfo.pid !== undefined && `PCI:${towerInfo.pid}`}
                                  </p>
                                )}
                              </>
                            );
                          })()}
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
                            url={(() => {
                              const towerInfo = parseCellTowerInfo(result.bssid);
                              if (towerInfo) {
                                return generateShareUrl({
                                  mcc: towerInfo.mcc,
                                  mnc: towerInfo.mnc,
                                  tac: towerInfo.tacId,
                                  cellId: towerInfo.cellId,
                                  latitude: result.location.latitude,
                                  longitude: result.location.longitude,
                                  tab: 'celltower'
                                });
                              }
                              // Fallback (shouldn't happen for cell tower history)
                              return generateShareUrl({ 
                                bssid: result.bssid,
                                latitude: result.location.latitude,
                                longitude: result.location.longitude
                              });
                            })()}
                            variant="icon"
                            className="!p-1"
                            analyticsSource="search_history"
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
          
          {/* Location search loading indicator - Desktop only */}
          {isLocationSearching && (
            <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none animate-fadeIn">
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
                onLocationSearchResults={handleLocationSearchResults}
              onCellTowerSearchResults={handleCellTowerSearchResults}
                compact={true}
                isLoadingFromUrl={isLoadingFromUrl}
                urlBssid={urlBssid}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLocationSearchStart={() => setIsLocationSearching(true)}
                onLocationSearchEnd={() => setIsLocationSearching(false)}
                isLocationSearching={isLocationSearching}
                clickedLocation={clickedLocation}
                selectedTowerParams={selectedTowerParams}
                hasUrlLoadedTowerResults={hasUrlLoadedTowerResults}
              />
            </div>
          </div>
          
        </div>

        {/* Mobile Bottom Sheet */}
        <MobileSheet
          selectedMarker={selectedMarker}
          searchHistory={searchHistory}
          cellTowerSearchHistory={cellTowerSearchHistory}
          activeTab={activeTab}
          forceClose={shouldCloseSheet}
          onForceCloseComplete={() => setShouldCloseSheet(false)}
          onMarkerSelect={(marker) => {
            setSelectedMarker(marker);
            setFlyToLocation({
              longitude: marker.position[0],
              latitude: marker.position[1]
            });
            // Set tower params for auto-populate
            if (marker.type === 'cell') {
              const towerInfo = parseCellTowerInfo(marker.bssid);
              if (towerInfo) {
                setSelectedTowerParams({
                  mcc: towerInfo.mcc.toString(),
                  mnc: towerInfo.mnc.toString(),
                  tac: towerInfo.tacId.toString(),
                  cellId: towerInfo.cellId.toString()
                });
              }
            } else {
              setSelectedTowerParams(null);
            }
          }}
        >
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {activeTab === 'bssid' 
              ? `${searchHistory.length} locations found`
              : activeTab === 'celltower'
              ? `${cellTowerSearchHistory.length} towers found`
              : `${markers.length} access points`
            }
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