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
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-all hover:scale-105 ${
            isMultiMode ? 'gradient-card-1' : 'glass-card'
          } ${compact ? 'ml-auto' : ''}`}
          style={{
            color: 'var(--text-primary)',
            fontWeight: isMultiMode ? '600' : '500'
          }}
        >
          {isMultiMode ? (
            <>
              <ToggleRight className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
              Multi
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4" style={{ color: 'var(--color-primary-400)' }} />
              Single
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