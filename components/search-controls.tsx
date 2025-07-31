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
}

export default function SearchControls({
  isMultiMode,
  onToggleMode,
  onSearchResult,
  onSearchResults,
  compact = false
}: SearchControlsProps) {
  return (
    <div>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        {!compact && <h2 className="text-lg font-semibold">Search for BSSID</h2>}
        <button
          onClick={onToggleMode}
          className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg transition-all hover:scale-105 ${
            isMultiMode ? 'gradient-card-1' : 'glass-card'
          } ${compact ? 'ml-auto' : ''}`}
          style={{
            color: 'var(--text-primary)',
            fontWeight: isMultiMode ? '600' : '500'
          }}
          title={isMultiMode ? 'Switch to single BSSID mode' : 'Switch to multi BSSID mode'}
        >
          {isMultiMode ? (
            <>
              <ToggleRight className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: 'var(--color-primary-600)' }} />
              <span>Multi</span>
            </>
          ) : (
            <>
              <ToggleLeft className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: 'var(--color-primary-400)' }} />
              <span>Single</span>
            </>
          )}
        </button>
      </div>
      {isMultiMode ? (
        <MultiBSSIDSearch onSearchResults={onSearchResults} />
      ) : (
        <BSSIDSearch onSearchResult={onSearchResult} />
      )}
    </div>
  );
}