'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl';
import { ScatterplotLayer } from '@deck.gl/layers';
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

export default function MapView({ 
  markers, 
  onMarkerClick, 
  onMarkerHover,
  mapboxToken 
}: MapViewProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const deckRef = useRef<any>(null);

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
    new ScatterplotLayer({
      id: 'bssid-markers',
      data: markers,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 6,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: MapMarker) => d.position,
      getRadius: 10,
      getFillColor: (d: MapMarker) => 
        hoveredMarker?.id === d.id ? [255, 140, 0] : [79, 70, 229],
      getLineColor: [255, 255, 255],
      onHover: handleHover,
      onClick: handleClick
    })
  ];

  const renderTooltip = () => {
    if (!hoveredMarker) return null;

    return (
      <div 
        className="absolute z-10 pointer-events-none bg-white px-3 py-2 rounded-lg shadow-lg"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -120%)'
        }}
      >
        <div className="text-sm font-semibold text-gray-900">
          {hoveredMarker.bssid}
        </div>
        <div className="text-xs text-gray-600">
          Lat: {hoveredMarker.location.latitude.toFixed(6)}
        </div>
        <div className="text-xs text-gray-600">
          Lng: {hoveredMarker.location.longitude.toFixed(6)}
        </div>
        {hoveredMarker.location.altitude && (
          <div className="text-xs text-gray-600">
            Alt: {hoveredMarker.location.altitude.toFixed(1)}m
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
      >
        {mapboxToken ? (
          <MapGL
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={mapboxToken}
          />
        ) : (
          <MapGL
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          />
        )}
      </DeckGL>
      {renderTooltip()}
    </div>
  );
}