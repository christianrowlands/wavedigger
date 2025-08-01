'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import type { PickingInfo, FlyToInterpolator as FlyToInterpolatorType } from '@deck.gl/core';
import type { ViewState, MapMarker } from '@/types';
import { getMapIcon } from './map-icons';
import { formatBSSIDForDisplay } from '@/lib/bssid-utils';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  selectedMarker?: MapMarker | null;
  mapboxToken?: string;
  flyToLocation?: { longitude: number; latitude: number } | null;
  onFlyToComplete?: () => void;
  onMapClick?: (longitude: number, latitude: number) => void;
  clickedLocation?: { latitude: number; longitude: number } | null;
}

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 4,
  pitch: 0,
  bearing: 0
};

const MAP_STYLES = {
  standard: {
    url: 'mapbox://styles/mapbox/standard',
    name: 'Standard',
    description: '3D buildings & modern design',
    icon: '🏙️'
  },
  satellite: {
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    name: 'Satellite',
    description: 'Aerial imagery with labels',
    icon: '🛰️'
  },
  streets: {
    url: 'mapbox://styles/mapbox/streets-v12',
    name: 'Streets',
    description: 'Classic street map',
    icon: '🗺️'
  },
  outdoors: {
    url: 'mapbox://styles/mapbox/outdoors-v12',
    name: 'Outdoors',
    description: 'Terrain & trails',
    icon: '⛰️'
  }
};



export default function MapView({ 
  markers, 
  onMarkerClick, 
  selectedMarker,
  mapboxToken,
  flyToLocation,
  onFlyToComplete,
  onMapClick,
  clickedLocation 
}: MapViewProps) {
  // Extended view state with transition properties for DeckGL
  const [viewState, setViewState] = useState<ViewState & { 
    transitionDuration?: number;
    transitionInterpolator?: FlyToInterpolatorType;
  }>({
    ...INITIAL_VIEW_STATE,
    transitionDuration: 0 // Prevent zoom bounce in React 18
  });
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('standard');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [iconColors, setIconColors] = useState({
    gradientStart: '#9381FF',
    gradientEnd: '#C7A3FF',
    hoverGradientStart: '#22D3EE',
    hoverGradientEnd: '#5EEAD4'
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  // Check for dark mode and get theme colors
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
      
      // Get CSS variable values
      const computedStyle = getComputedStyle(document.documentElement);
      setIconColors({
        gradientStart: computedStyle.getPropertyValue('--icon-gradient-start').trim(),
        gradientEnd: computedStyle.getPropertyValue('--icon-gradient-end').trim(),
        hoverGradientStart: computedStyle.getPropertyValue('--icon-hover-gradient-start').trim(),
        hoverGradientEnd: computedStyle.getPropertyValue('--icon-hover-gradient-end').trim()
      });
    };
    
    // Initial check
    updateTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Load saved map style preference
  useEffect(() => {
    const savedStyle = localStorage.getItem('mapStyle');
    if (savedStyle && savedStyle in MAP_STYLES) {
      setCurrentStyle(savedStyle as keyof typeof MAP_STYLES);
    }
  }, []);
  
  // Track if initial load has completed
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false);
  
  // Apply Standard style configuration when style changes (not on initial load)
  useEffect(() => {
    if (!hasInitialLoadCompleted) {
      setHasInitialLoadCompleted(true);
      return; // Skip the first run to let onLoad handle initial config
    }
    
    console.log('[MapView] Style change detected:', { 
      currentStyle, 
      hasMapRef: !!mapRef.current,
      isMapReady 
    });
    
    if (mapRef.current && currentStyle === 'standard' && isMapReady) {
      const map = mapRef.current.getMap();
      
      if (map) {
        // Function to apply config with error handling
        const applyConfig = () => {
          try {
            console.log('[MapView] Applying Standard config after style change');
            map.setConfigProperty('basemap', 'lightPreset', isDarkMode ? 'dusk' : 'day');
            map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
            map.setConfigProperty('basemap', 'showTransitLabels', true);
            map.setConfigProperty('basemap', 'showPlaceLabels', true);
            map.setConfigProperty('basemap', 'showRoadLabels', true);
            console.log('[MapView] Config applied successfully after style change');
          } catch (error) {
            console.error('[MapView] Error applying config after style change:', error);
          }
        };
        
        // Wait for the new style to load
        map.once('style.load', () => {
          console.log('[MapView] Style loaded after change');
          // Small delay to ensure style is fully ready
          setTimeout(applyConfig, 100);
        });
      }
    }
  }, [currentStyle, isDarkMode, isMapReady, hasInitialLoadCompleted]);
  
  // Close style menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showStyleMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.map-style-selector')) {
          setShowStyleMenu(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStyleMenu]);

  // Handle view state changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleViewStateChange = useCallback(({ viewState: newViewState }: any) => {
    // Always maintain transitionDuration: 0 for user interactions to prevent bounce
    setViewState({
      ...newViewState,
      transitionDuration: 0
    });
  }, []);
  
  // Fly to location when requested
  useEffect(() => {
    if (flyToLocation && isMapReady) {
      console.log('[MapView] Flying to location:', flyToLocation);
      
      // Use FlyToInterpolator for smooth animation
      setViewState({
        ...viewState,
        longitude: flyToLocation.longitude,
        latitude: flyToLocation.latitude,
        zoom: 15,
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator()
      });
      
      // Clear flyToLocation after starting animation
      setTimeout(() => {
        onFlyToComplete?.();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToLocation, isMapReady]); // Intentionally not including viewState and onFlyToComplete to avoid loops

  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      setHoveredMarker(info.object as MapMarker);
    } else {
      setHoveredMarker(null);
    }
  }, []);

  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      // Clicked on a marker
      onMarkerClick?.(info.object as MapMarker);
    } else if (info.coordinate) {
      // Clicked on empty map area
      onMapClick?.(info.coordinate[0], info.coordinate[1]);
    }
  }, [onMarkerClick, onMapClick]);


  // Separate regular markers from selected marker
  const regularMarkers = markers.filter(m => m.id !== selectedMarker?.id);
  const selectedMarkerData = selectedMarker ? [selectedMarker] : [];
  
  // Memoize icon mapping to prevent recreation on every render
  const iconMapping = useMemo(() => {
    const mapping: Record<string, { url: string; width: number; height: number; anchorY: number }> = {};
    
    // Pre-generate all icon variations
    (['location-pin', 'location-pin-china'] as const).forEach(type => {
      // Regular icon
      mapping[`${type}-regular`] = {
        url: getMapIcon(type, iconColors.gradientStart, iconColors.hoverGradientStart, false, undefined, false, 48),
        width: 48,
        height: 48,
        anchorY: 38
      };
      // Hovered icon
      mapping[`${type}-hover`] = {
        url: getMapIcon(type, iconColors.gradientStart, iconColors.hoverGradientStart, true, undefined, false, 48),
        width: 48,
        height: 48,
        anchorY: 38
      };
      // Selected icon
      mapping[`${type}-selected`] = {
        url: getMapIcon(type, iconColors.hoverGradientStart, iconColors.hoverGradientEnd, false, undefined, true, 72),
        width: 72,
        height: 72,
        anchorY: 66
      };
      // Selected + hovered icon
      mapping[`${type}-selected-hover`] = {
        url: getMapIcon(type, iconColors.hoverGradientStart, iconColors.hoverGradientEnd, true, undefined, true, 72),
        width: 72,
        height: 72,
        anchorY: 66
      };
    });
    
    return mapping;
  }, [iconColors]);

  const layers = [
    // Click marker layer
    clickedLocation && new ScatterplotLayer({
      id: 'click-marker',
      data: [{
        position: [clickedLocation.longitude, clickedLocation.latitude],
        size: 100
      }],
      pickable: false,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 10,
      radiusMaxPixels: 30,
      lineWidthMinPixels: 2,
      getPosition: (d: { position: [number, number] }) => d.position,
      getRadius: (d: { size: number }) => d.size,
      getFillColor: [59, 130, 246, 100], // Blue with transparency
      getLineColor: [59, 130, 246, 255], // Solid blue border
    }),
    
    // Regular AP markers
    new IconLayer({
      id: 'bssid-markers',
      data: regularMarkers,
      pickable: true,
      getPosition: (d: MapMarker) => d.position,
      getIcon: (d: MapMarker) => {
        const isChina = d.source === 'china';
        const isHovered = hoveredMarker?.id === d.id;
        const iconType = isChina ? 'location-pin-china' : 'location-pin';
        const iconKey = `${iconType}-${isHovered ? 'hover' : 'regular'}`;
        return iconMapping[iconKey];
      },
      getSize: 48,
      sizeScale: 1,
      sizeMinPixels: 32,
      sizeMaxPixels: 64,
      onHover: handleHover,
      onClick: handleClick,
      updateTriggers: {
        getIcon: [hoveredMarker?.id, iconMapping]
      }
    }),
    
    // Selected marker layer (renders on top)
    selectedMarkerData.length > 0 && new IconLayer({
      id: 'selected-marker',
      data: selectedMarkerData,
      pickable: true,
      getPosition: (d: MapMarker) => d.position,
      getIcon: (d: MapMarker) => {
        const isChina = d.source === 'china';
        const isHovered = hoveredMarker?.id === d.id;
        const iconType = isChina ? 'location-pin-china' : 'location-pin';
        const iconKey = `${iconType}-selected${isHovered ? '-hover' : ''}`;
        return iconMapping[iconKey];
      },
      getSize: 72,
      sizeScale: 1,
      sizeMinPixels: 48,
      sizeMaxPixels: 96,
      onHover: handleHover,
      onClick: handleClick,
      updateTriggers: {
        getIcon: [hoveredMarker?.id, iconMapping]
      }
    })
  ].filter(Boolean);

  const renderTooltip = () => {
    if (!hoveredMarker) return null;

    return (
      <div 
        className="absolute z-10 pointer-events-none glass px-4 py-3 animate-fadeIn"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -120%)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {formatBSSIDForDisplay(hoveredMarker.bssid)}
          {hoveredMarker.source === 'china' && (
            <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ 
              backgroundColor: '#EE1C25', 
              color: 'white' 
            }}>
              CN
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Lat:</span>
            <span className="font-mono">{hoveredMarker.location.latitude.toFixed(6)}</span>
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Lng:</span>
            <span className="font-mono">{hoveredMarker.location.longitude.toFixed(6)}</span>
          </div>
          {hoveredMarker.source === 'china' && (
            <div className="text-xs pt-1" style={{ color: 'var(--text-tertiary)' }}>
              Source: China Database
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="map-container relative w-full h-full" style={{ width: '100%', height: '100%' }}>
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
        onClick={handleClick}
      >
        {mapboxToken ? (
          <MapGL
            ref={(ref) => {
              console.log('[MapView] Map ref callback called with:', ref);
              mapRef.current = ref;
            }}
            mapStyle={MAP_STYLES[currentStyle].url}
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
            onLoad={() => {
              console.log('[MapView] Map onLoad fired');
              setIsMapReady(true);
              
              if (mapRef.current) {
                const map = mapRef.current.getMap();
                
                // Function to apply Standard style configuration
                const applyStandardConfig = (retryCount = 0) => {
                  if (currentStyle !== 'standard') return;
                  
                  console.log('[MapView] Attempting to apply Standard config, retry:', retryCount);
                  
                  try {
                    map.setConfigProperty('basemap', 'lightPreset', isDarkMode ? 'dusk' : 'day');
                    map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
                    map.setConfigProperty('basemap', 'showTransitLabels', true);
                    map.setConfigProperty('basemap', 'showPlaceLabels', true);
                    map.setConfigProperty('basemap', 'showRoadLabels', true);
                    console.log('[MapView] Standard config applied successfully');
                  } catch (error) {
                    console.error('[MapView] Error applying Standard config:', error);
                    
                    // Retry up to 3 times with increasing delays
                    if (retryCount < 3) {
                      const delay = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
                      console.log(`[MapView] Retrying in ${delay}ms...`);
                      setTimeout(() => applyStandardConfig(retryCount + 1), delay);
                    }
                  }
                };
                
                // Use 'style.load' event to ensure basemap import is ready
                map.once('style.load', () => {
                  console.log('[MapView] Style loaded on initial load');
                  // Small delay to ensure style is fully ready (consistent with style switch)
                  setTimeout(() => applyStandardConfig(), 100);
                });
                
                // Also set up a fallback timeout (increased for safety)
                setTimeout(() => {
                  console.log('[MapView] Fallback timeout - applying config');
                  applyStandardConfig();
                }, 2000);
              }
            }}
            fog={{
              'horizon-blend': 0.02,
              'color': isDarkMode ? '#242424' : '#ffffff',
              'high-color': isDarkMode ? '#181818' : '#f8f8f8',
              'space-color': isDarkMode ? '#000000' : '#d8f2ff',
              'star-intensity': isDarkMode ? 0.5 : 0.0
            }}
            light={{
              anchor: 'viewport',
              color: isDarkMode ? '#666666' : 'white',
              intensity: isDarkMode ? 0.2 : 0.4
            }}
            terrain={currentStyle === 'standard' || currentStyle === 'outdoors' ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
          />
        ) : (
          <MapGL
            mapStyle={isDarkMode ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </DeckGL>
      {renderTooltip()}
      
      {/* Map Style Selector */}
      {mapboxToken && (
        <div className="absolute top-20 lg:top-4 left-4 z-10">
          <div className="relative map-style-selector">
            <button
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className="glass-card p-2.5 rounded-lg hover:scale-105 transition-all flex items-center gap-2"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-md)'
              }}
              title="Change map style"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                {MAP_STYLES[currentStyle].name}
              </span>
            </button>
            
            {showStyleMenu && (
              <div 
                className="absolute top-full left-0 mt-2 glass-card rounded-lg overflow-hidden animate-fadeIn"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  boxShadow: 'var(--shadow-xl)',
                  minWidth: '220px'
                }}
              >
                {Object.entries(MAP_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCurrentStyle(key as keyof typeof MAP_STYLES);
                      setShowStyleMenu(false);
                      localStorage.setItem('mapStyle', key);
                    }}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{
                      backgroundColor: currentStyle === key ? 'var(--bg-tertiary)' : 'transparent'
                    }}
                  >
                    <span className="text-xl mt-0.5">{style.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {style.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {style.description}
                      </div>
                    </div>
                    {currentStyle === key && (
                      <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-primary-500)' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}