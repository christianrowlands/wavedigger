'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl';
import { IconLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { ViewState, MapMarker } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMarkerHover?: (marker: MapMarker | null) => void;
  mapboxToken?: string;
}

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 11,
  pitch: 0,
  bearing: 0
};

// WiFi icon SVG as data URL
const WIFI_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wifi-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
      </filter>
    </defs>
    <!-- Background circle -->
    <circle cx="24" cy="38" r="18" fill="white" filter="url(#shadow)"/>
    <circle cx="24" cy="38" r="16" fill="url(#wifi-gradient)"/>
    <!-- WiFi signal bars -->
    <path d="M24 30 Q20 26 16 26 Q24 20 32 26 Q28 26 24 30" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    <path d="M24 33 Q21 30 18 30 Q24 25 30 30 Q27 30 24 33" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <path d="M24 36 Q22.5 34 20 34 Q24 30 28 34 Q25.5 34 24 36" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Center dot -->
    <circle cx="24" cy="38" r="2.5" fill="white"/>
  </svg>
`)}`;

const WIFI_ICON_HOVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wifi-gradient-hover" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#F97316;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FB923C;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow-hover" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- Background circle -->
    <circle cx="24" cy="38" r="20" fill="white" filter="url(#shadow-hover)"/>
    <circle cx="24" cy="38" r="18" fill="url(#wifi-gradient-hover)"/>
    <!-- WiFi signal bars with animation -->
    <path d="M24 30 Q20 26 16 26 Q24 20 32 26 Q28 26 24 30" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <path d="M24 33 Q21 30 18 30 Q24 25 30 30 Q27 30 24 33" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <path d="M24 36 Q22.5 34 20 34 Q24 30 28 34 Q25.5 34 24 36" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <!-- Center dot -->
    <circle cx="24" cy="38" r="3" fill="white"/>
  </svg>
`)}`;

export default function MapView({ 
  markers, 
  onMarkerClick, 
  onMarkerHover,
  mapboxToken 
}: MapViewProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const deckRef = useRef<any>(null);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    // Initial check
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Zoom to marker when new marker is added
  useEffect(() => {
    if (markers.length > 0) {
      const lastMarker = markers[markers.length - 1];
      setViewState({
        ...viewState,
        longitude: lastMarker.position[0],
        latitude: lastMarker.position[1],
        zoom: 15,
        transitionDuration: 1000
      });
    }
  }, [markers]);

  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      setHoveredMarker(info.object as MapMarker);
      onMarkerHover?.(info.object as MapMarker);
    } else {
      setHoveredMarker(null);
      onMarkerHover?.(null);
    }
  }, [onMarkerHover]);

  const handleClick = useCallback((info: PickingInfo) => {
    if (info.object) {
      onMarkerClick?.(info.object as MapMarker);
    }
  }, [onMarkerClick]);

  const layers = [
    new IconLayer({
      id: 'bssid-markers',
      data: markers,
      pickable: true,
      getPosition: (d: MapMarker) => d.position,
      getIcon: (d: MapMarker) => ({
        url: hoveredMarker?.id === d.id ? WIFI_ICON_HOVER : WIFI_ICON,
        width: 48,
        height: 48,
        anchorY: 38
      }),
      getSize: 48,
      sizeScale: 1,
      sizeMinPixels: 32,
      sizeMaxPixels: 64,
      onHover: handleHover,
      onClick: handleClick
    })
  ];

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
          {hoveredMarker.bssid}
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
        </div>
      </div>
    );
  };

  return (
    <div className="map-container relative w-full h-full" style={{ width: '100%', height: '100%' }}>
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
      >
        {mapboxToken ? (
          <MapGL
            mapStyle={isDarkMode ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard"}
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
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
            // @ts-ignore
            configureMapStyle={(style) => {
              if (isDarkMode) {
                return {
                  ...style,
                  lightPreset: 'dusk',
                  basemap: {
                    lightPreset: 'dusk'
                  }
                };
              }
              return {
                ...style,
                lightPreset: 'day',
                basemap: {
                  lightPreset: 'day'
                }
              };
            }}
          />
        ) : (
          <MapGL
            mapStyle={isDarkMode ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </DeckGL>
      {renderTooltip()}
    </div>
  );
}