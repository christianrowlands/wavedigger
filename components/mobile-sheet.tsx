'use client';

import React, { useState, useRef } from 'react';
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
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  // Calculate max height based on window size
  const getMaxHeight = () => {
    return window.innerHeight - SHEET_TOP_OFFSET;
  };

  // Handle drag start - moved to drag handle element
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent browser touch gestures
    setIsDragging(true);
    setStartY(e.clientY);
    setDragStartX(e.clientX);
    setStartHeight(sheetHeight);
    setDragStartTime(Date.now());
    setHasMoved(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent browser touch gestures
    
    const deltaY = startY - e.clientY;
    const deltaX = Math.abs(e.clientX - dragStartX);
    
    // Mark as moved if the pointer has moved more than 5 pixels
    if (!hasMoved && (Math.abs(deltaY) > 5 || deltaX > 5)) {
      setHasMoved(true);
    }
    
    const maxHeight = getMaxHeight();
    const newHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(maxHeight, startHeight + deltaY));
    setSheetHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent browser touch gestures
    
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // If didn't move much, treat as click
    if (!hasMoved) {
      toggleExpanded();
      return;
    }
    
    const maxHeight = getMaxHeight();
    const currentHeight = sheetHeight;
    const dragDistance = currentHeight - startHeight;
    const dragDuration = Date.now() - dragStartTime;
    const velocity = dragDuration > 0 ? dragDistance / dragDuration : 0;
    
    // Threshold for triggering state change (20% of the distance between states)
    const threshold = 0.2;
    
    // Determine target state based on current state, drag direction, and velocity
    let targetState = sheetState;
    let targetHeight = sheetHeight;
    
    if (sheetState === 'closed') {
      const peekThreshold = (SHEET_PEEK_HEIGHT - SHEET_CLOSED_HEIGHT) * threshold;
      if (dragDistance > peekThreshold || velocity > 0.5) {
        targetState = 'peek';
        targetHeight = SHEET_PEEK_HEIGHT;
      } else {
        targetHeight = SHEET_CLOSED_HEIGHT;
      }
    } else if (sheetState === 'peek') {
      const upThreshold = (maxHeight - SHEET_PEEK_HEIGHT) * threshold;
      const downThreshold = (SHEET_PEEK_HEIGHT - SHEET_CLOSED_HEIGHT) * threshold;
      
      if (dragDistance > upThreshold || velocity > 0.5) {
        targetState = 'full';
        targetHeight = maxHeight;
      } else if (dragDistance < -downThreshold || velocity < -0.5) {
        targetState = 'closed';
        targetHeight = SHEET_CLOSED_HEIGHT;
      } else {
        targetHeight = SHEET_PEEK_HEIGHT;
      }
    } else if (sheetState === 'full') {
      const peekThreshold = (maxHeight - SHEET_PEEK_HEIGHT) * threshold;
      if (dragDistance < -peekThreshold || velocity < -0.5) {
        // Determine if we should go to peek or closed based on drag distance
        if (dragDistance < -(maxHeight - SHEET_CLOSED_HEIGHT) * 0.5) {
          targetState = 'closed';
          targetHeight = SHEET_CLOSED_HEIGHT;
        } else {
          targetState = 'peek';
          targetHeight = SHEET_PEEK_HEIGHT;
        }
      } else {
        targetHeight = maxHeight;
      }
    }
    
    setSheetState(targetState);
    setSheetHeight(targetHeight);
  };

  const handlePointerCancel = () => {
    if (!isDragging) return;
    
    // Reset to previous state if drag is cancelled
    setIsDragging(false);
    setSheetHeight(startHeight);
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
          className="drag-handle relative flex flex-col items-center py-3 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="w-12 h-1.5 rounded-full" style={{ 
            backgroundColor: isDragging ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
            transform: isDragging ? 'scaleX(1.5)' : 'scaleX(1)',
            transition: 'all 0.2s'
          }} />
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
            height: sheetState === 'closed' ? 'calc(100% - 40px)' : 'calc(100% - 56px)',
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
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                Selected Location
                {selectedMarker.source === 'china' && (
                  <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ 
                    backgroundColor: '#EE1C25', 
                    color: 'white' 
                  }}>
                    CN
                  </span>
                )}
              </h4>
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
                {selectedMarker.source === 'china' && (
                  <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Source</span>
                    <span>China Database</span>
                  </div>
                )}
              </div>
            </div>
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
                      location: result.location,
                      source: result.source
                    });
                  }}
                >
                  <p className="font-mono font-medium flex items-center gap-2">
                    {result.bssid}
                    {result.source === 'china' && (
                      <span className="text-xs font-normal px-1 py-0.5 rounded" style={{ 
                        backgroundColor: '#EE1C25', 
                        color: 'white',
                        fontSize: '0.65rem'
                      }}>
                        CN
                      </span>
                    )}
                  </p>
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