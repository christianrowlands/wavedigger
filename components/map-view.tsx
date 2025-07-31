'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl';
import { IconLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { ViewState, MapMarker } from '@/types';
import { getMapIcon } from './map-icons';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMarkerHover?: (marker: MapMarker | null) => void;
  mapboxToken?: string;
}

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 4,
  pitch: 0,
  bearing: 0
};



export default function MapView({ 
  markers, 
  onMarkerClick, 
  onMarkerHover,
  mapboxToken 
}: MapViewProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [iconColors, setIconColors] = useState({
    gradientStart: '#9381FF',
    gradientEnd: '#C7A3FF',
    hoverGradientStart: '#22D3EE',
    hoverGradientEnd: '#5EEAD4'
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null);

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

  // Zoom to marker when new marker is added
  useEffect(() => {
    if (markers.length > 0) {
      const lastMarker = markers[markers.length - 1];
      setViewState(v => ({
        ...v,
        longitude: lastMarker.position[0],
        latitude: lastMarker.position[1],
        zoom: 15
      }));
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

  // Create icons with current theme colors
  const wifiIcon = getMapIcon('location-pin', iconColors.gradientStart, iconColors.hoverGradientStart, false);
  const wifiIconHover = getMapIcon('location-pin', iconColors.gradientStart, iconColors.hoverGradientStart, true);

  const layers = [
    new IconLayer({
      id: 'bssid-markers',
      data: markers,
      pickable: true,
      getPosition: (d: MapMarker) => d.position,
      getIcon: (d: MapMarker) => ({
        url: hoveredMarker?.id === d.id ? wifiIconHover : wifiIcon,
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
        onViewStateChange={({ viewState }) => setViewState(viewState as ViewState)}
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
            // @ts-expect-error - Mapbox GL JS v3 has updated types not yet in react-map-gl
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