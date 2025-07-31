'use client';

import React, { useState, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import type { MapMarker, BSSIDSearchResult } from '@/types';

interface MobileSheetProps {
  selectedMarker: MapMarker | null;
  searchHistory: BSSIDSearchResult[];
  children: React.ReactNode;
  onMarkerSelect: (marker: MapMarker) => void;
}

// Sheet states
type SheetState = 'closed' | 'peek' | 'full';

// Sheet positions
const SHEET_CLOSED_HEIGHT = 60;
const SHEET_PEEK_HEIGHT = 350;
const SHEET_MIN_HEIGHT = 50;
const SHEET_TOP_OFFSET = 80; // Space to leave for search UI

export default function MobileSheet({ 
  selectedMarker, 
  searchHistory, 
  children,
  onMarkerSelect 
}: MobileSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('closed');
  const [sheetHeight, setSheetHeight] = useState(SHEET_CLOSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  // Calculate max height based on window size
  const getMaxHeight = () => {
    return window.innerHeight - SHEET_TOP_OFFSET;
  };

  // Use pointer events for better compatibility
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only start drag from the drag handle
    if (dragHandleRef.current && dragHandleRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setStartY(e.clientY);
      setStartHeight(sheetHeight);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.clientY;
    const maxHeight = getMaxHeight();
    const newHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(maxHeight, startHeight + deltaY));
    setSheetHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Snap to positions based on current height
    const maxHeight = getMaxHeight();
    const currentHeight = sheetHeight;
    
    // Determine which snap point we're closest to
    const closedDist = Math.abs(currentHeight - SHEET_CLOSED_HEIGHT);
    const peekDist = Math.abs(currentHeight - SHEET_PEEK_HEIGHT);
    const fullDist = Math.abs(currentHeight - maxHeight);
    
    if (closedDist < peekDist && closedDist < fullDist) {
      setSheetHeight(SHEET_CLOSED_HEIGHT);
      setSheetState('closed');
    } else if (peekDist < fullDist) {
      setSheetHeight(SHEET_PEEK_HEIGHT);
      setSheetState('peek');
    } else {
      setSheetHeight(maxHeight);
      setSheetState('full');
    }
  };

  const toggleExpanded = () => {
    const maxHeight = getMaxHeight();
    
    switch (sheetState) {
      case 'closed':
        setSheetHeight(SHEET_PEEK_HEIGHT);
        setSheetState('peek');
        break;
      case 'peek':
        setSheetHeight(maxHeight);
        setSheetState('full');
        break;
      case 'full':
        setSheetHeight(SHEET_CLOSED_HEIGHT);
        setSheetState('closed');
        break;
    }
  };

  return (
    <div 
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 lg:hidden ${isDragging ? '' : 'transition-all duration-300 ease-out'} ${sheetState === 'full' ? 'z-40' : 'z-20'}`}
      style={{
        height: `${sheetHeight}px`,
        transform: 'translateY(0)',
        willChange: isDragging ? 'height' : 'auto'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div 
        className="glass-card rounded-t-2xl shadow-2xl h-full overflow-hidden"
        style={{ 
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-primary)'
        }}
      >
        {/* Drag Handle */}
        <div 
          ref={dragHandleRef}
          className="relative flex flex-col items-center py-2 cursor-grab active:cursor-grabbing select-none"
          onClick={toggleExpanded}
        >
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)' }} />
          {/* State indicator dots */}
          <div className="flex gap-1 mt-1">
            <div 
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ 
                backgroundColor: sheetState === 'closed' ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
                opacity: sheetState === 'closed' ? 1 : 0.3
              }} 
            />
            <div 
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ 
                backgroundColor: sheetState === 'peek' ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
                opacity: sheetState === 'peek' ? 1 : 0.3
              }} 
            />
            <div 
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ 
                backgroundColor: sheetState === 'full' ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
                opacity: sheetState === 'full' ? 1 : 0.3
              }} 
            />
          </div>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className={`px-4 overflow-y-auto ${sheetState === 'closed' ? 'pb-2' : 'pb-4'}`} 
          style={{ 
            height: sheetState === 'closed' ? 'calc(100% - 30px)' : 'calc(100% - 48px)',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            pointerEvents: isDragging ? 'none' : 'auto'
          }}
        >
          {/* Locations found text - always visible */}
          <div className={`text-center ${sheetState === 'closed' ? 'py-0' : 'mb-4'}`}>
            {children}
          </div>

          {/* Selected Marker - Only when expanded */}
          {selectedMarker && sheetState !== 'closed' && (
            <div className="mb-4 p-3 rounded-lg glass-primary">
              <h4 className="text-sm font-semibold mb-2">Selected Location</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>BSSID</span>
                  <span className="font-mono">{selectedMarker.bssid}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Latitude</span>
                  <span className="font-mono">{selectedMarker.location.latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Longitude</span>
                  <span className="font-mono">{selectedMarker.location.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Expand/Collapse Indicator */}
          {searchHistory.length > 0 && sheetState !== 'full' && (
            <button
              onClick={toggleExpanded}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronUp 
                className={`h-4 w-4 transition-transform ${sheetState === 'closed' ? '' : 'rotate-180'}`} 
              />
              {sheetState === 'closed' ? 'Show' : 'Hide'} History ({searchHistory.length})
            </button>
          )}

          {/* Search History - Only when expanded */}
          {sheetState !== 'closed' && searchHistory.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold mb-2">Search History</h4>
              {searchHistory.map((result, index) => (
                <div
                  key={`${result.bssid}-${index}`}
                  className={`p-3 rounded-lg cursor-pointer card-hover glass-card text-xs ${
                    selectedMarker?.bssid === result.bssid ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    onMarkerSelect({
                      id: `${result.bssid}-${Date.now()}`,
                      bssid: result.bssid,
                      position: [result.location.longitude, result.location.latitude],
                      location: result.location
                    });
                  }}
                >
                  <p className="font-mono font-medium">{result.bssid}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}