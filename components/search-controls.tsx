'use client';

import React from 'react';
import BSSIDSearch from '@/components/bssid-search';
import MultiBSSIDSearch from '@/components/bssid-search-multi';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import type { BSSIDSearchResult } from '@/types';

interface SearchControlsProps {
  isMultiMode: boolean;
  onToggleMode: () => void;
  onSearchResult: (result: BSSIDSearchResult) => void;
  onSearchResults: (results: BSSIDSearchResult[]) => void;
  compact?: boolean;
  isLoadingFromUrl?: boolean;
  urlBssid?: string | null;
}

export default function SearchControls({
  isMultiMode,
  onToggleMode,
  onSearchResult,
  onSearchResults,
  compact = false,
  isLoadingFromUrl = false,
  urlBssid = null
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
    // Pass toggle button to search components for inline display
    return (
      <div>
        {isMultiMode ? (
          <MultiBSSIDSearch onSearchResults={onSearchResults} mobileToggle={toggleButton} />
        ) : (
          <BSSIDSearch 
            onSearchResult={onSearchResult} 
            mobileToggle={toggleButton}
            isLoadingFromUrl={isLoadingFromUrl}
            urlBssid={urlBssid}
          />
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Search for BSSID</h2>
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
          isLoadingFromUrl={isLoadingFromUrl}
          urlBssid={urlBssid}
        />
      )}
    </div>
  );
}