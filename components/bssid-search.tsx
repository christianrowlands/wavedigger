'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAndNormalizeBSSID, normalizeBSSIDForComparison } from '@/lib/bssid-utils';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvents } from '@/lib/analytics';
import type { BSSIDSearchResult, SearchError } from '@/types';

interface BSSIDSearchProps {
  onSearchResult: (result: BSSIDSearchResult) => void;
  onManualSearchResult?: (result: BSSIDSearchResult) => void;
  onSearchResults?: (results: BSSIDSearchResult[]) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: SearchError) => void;
  mobileToggle?: React.ReactNode;
  isLoadingFromUrl?: boolean;
  urlBssid?: string | null;
}

export default function BSSIDSearch({ 
  onSearchResult, 
  onManualSearchResult,
  onSearchResults,
  onSearchStart,
  onSearchError,
  mobileToggle,
  isLoadingFromUrl = false,
  urlBssid = null
}: BSSIDSearchProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [includeSurrounding, setIncludeSurrounding] = useState(false);
  const [lastSearchCount, setLastSearchCount] = useState<number | null>(null);
  
  const searchInProgressRef = useRef(false);
  const { trackBSSIDSearch, trackSearchError, logEvent } = useAnalytics();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Auto-format as user types
    const cleaned = value.replace(/[^0-9A-Fa-f]/g, '');
    if (cleaned.length === 12) {
      const validation = validateAndNormalizeBSSID(cleaned);
      if (validation.isValid && validation.normalized) {
        setInput(validation.normalized);
      }
    }
  }, [error]);

  const handleSearch = async (bssidOverride?: string) => {
    // Prevent duplicate searches
    if (searchInProgressRef.current) {
      return;
    }
    
    // Mark search as in progress immediately
    searchInProgressRef.current = true;
    
    // Clear previous error
    setError(null);
    
    // Use provided BSSID or fall back to input state
    const bssidToValidate = bssidOverride || input;
    
    // Validate BSSID
    const validation = validateAndNormalizeBSSID(bssidToValidate);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid BSSID format');
      searchInProgressRef.current = false;
      return;
    }
    
    if (!validation.normalized) {
      setError('Failed to normalize BSSID');
      searchInProgressRef.current = false;
      return;
    }
    setIsLoading(true);
    onSearchStart?.();
    
    try {
      const response = await fetch('/api/bssid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bssid: validation.normalized,
          returnAll: includeSurrounding 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = data.error as SearchError;
        setError(error.message);
        onSearchError?.(error);
        trackSearchError(error.message, 'bssid');
        return;
      }
      
      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [validation.normalized!, ...prev.filter(b => b !== validation.normalized)];
        return updated.slice(0, 5); // Keep only last 5 searches
      });
      
      // Clear input after successful search
      setInput('');
      
      // Handle response based on whether we got single or multiple results
      if (data.results && Array.isArray(data.results)) {
        // Multiple results (surrounding APs)
        setLastSearchCount(data.results.length);
        
        // Track search with surrounding APs
        trackBSSIDSearch(
          'with_surrounding',
          data.results.length,
          bssidOverride ? 'url' : 'manual'
        );
        
        // When surrounding APs are included, handle the searched BSSID specially
        if (includeSurrounding && !bssidOverride) {
          // Find the result matching the BSSID that was searched
          const searchedResult = data.results.find(
            (result: BSSIDSearchResult) => 
              normalizeBSSIDForComparison(result.bssid) === normalizeBSSIDForComparison(validation.normalized!)
          );
          
          if (searchedResult && onManualSearchResult) {
            // Add only the searched BSSID to history and fly to it
            onManualSearchResult(searchedResult);
            
            // Add OTHER results as regular markers (no history, no fly-to)
            const otherResults = data.results.filter(
              (result: BSSIDSearchResult) => 
                normalizeBSSIDForComparison(result.bssid) !== normalizeBSSIDForComparison(validation.normalized!)
            );
            
            otherResults.forEach((result: BSSIDSearchResult) => {
              onSearchResult(result);
            });
            
            return; // Don't call onSearchResults to avoid conflicts
          }
        }
        
        // Only call onSearchResults if we didn't handle it above
        if (onSearchResults) {
          onSearchResults(data.results);
        } else {
          // Fallback: call onSearchResult for each
          data.results.forEach((result: BSSIDSearchResult) => {
            onSearchResult(result);
          });
        }
      } else if (data.result) {
        // Single result - this is a manual search
        setLastSearchCount(null);
        
        // Track single BSSID search
        trackBSSIDSearch(
          'single',
          1,
          bssidOverride ? 'url' : 'manual'
        );
        
        if (onManualSearchResult && !includeSurrounding) {
          // Use manual handler for single BSSID searches
          onManualSearchResult(data.result);
        } else {
          onSearchResult(data.result);
        }
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please try again.');
      onSearchError?.({
        type: 'NETWORK_ERROR',
        message: 'Failed to connect to server'
      });
      trackSearchError('Network error', 'bssid');
    } finally {
      setIsLoading(false);
      searchInProgressRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const handleRecentSearch = (bssid: string, position: number) => {
    // Track recent search click
    logEvent(AnalyticsEvents.SEARCH_HISTORY_CLICK, { position_in_list: position });
    setInput(bssid);
    handleSearch(bssid);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-1 sm:gap-2">
        {mobileToggle && <div className="lg:hidden">{mobileToggle}</div>}
        <Input
          type="text"
          placeholder={isLoadingFromUrl ? "Loading shared BSSID..." : "Enter BSSID"}
          value={isLoadingFromUrl && urlBssid ? urlBssid : input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading || isLoadingFromUrl}
          className={`flex-1 min-w-0 ${error ? 'border-red-500' : ''} ${isLoadingFromUrl ? 'animate-pulse' : ''}`}
          variant="modern"
        />
        <button 
          onClick={() => handleSearch()} 
          disabled={isLoading || (!input.trim() && !isLoadingFromUrl) || isLoadingFromUrl}
          className={`btn-primary flex items-center justify-center px-2 sm:px-3 flex-shrink-0 ${isLoading || (!input.trim() && !isLoadingFromUrl) || isLoadingFromUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            background: isLoading || (!input.trim() && !isLoadingFromUrl) || isLoadingFromUrl ? 'var(--bg-tertiary)' : undefined,
            color: isLoading || (!input.trim() && !isLoadingFromUrl) || isLoadingFromUrl ? 'var(--text-tertiary)' : undefined,
            boxShadow: isLoading || (!input.trim() && !isLoadingFromUrl) || isLoadingFromUrl ? 'none' : undefined
          }}
          title={isLoadingFromUrl ? 'Loading shared BSSID...' : isLoading ? 'Searching...' : 'Search for BSSID'}
        >
          {isLoadingFromUrl || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline ml-2">Searching</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Search</span>
            </>
          )}
        </button>
      </div>
      
      {/* Include Surrounding Toggle */}
      <div className="flex items-center gap-3 px-1">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={includeSurrounding}
            onChange={(e) => {
              const newValue = e.target.checked;
              setIncludeSurrounding(newValue);
              logEvent(AnalyticsEvents.TOGGLE_SURROUNDING_APS, { enabled: newValue });
            }}
            className="w-4 h-4 rounded border-2 transition-colors"
            style={{
              borderColor: 'var(--border-primary)',
              accentColor: 'var(--color-primary-500)'
            }}
          />
          <span className="text-sm select-none transition-colors group-hover:text-primary-600" 
                style={{ color: 'var(--text-secondary)' }}>
            Include surrounding access points
          </span>
        </label>
        {includeSurrounding && (
          <span className="text-xs px-2 py-0.5 rounded-full animate-fadeIn"
                style={{ 
                  backgroundColor: 'var(--color-primary-100)', 
                  color: 'var(--color-primary-700)' 
                }}>
            Returns all APs near target
          </span>
        )}
      </div>
      
      {/* Show result count when multiple APs found */}
      {lastSearchCount !== null && lastSearchCount > 1 && (
        <div className="flex items-center gap-2 px-1 animate-fadeIn">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Found {lastSearchCount} access points</span>
          </div>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {recentSearches.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600">Recent:</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((bssid, index) => (
              <button
                key={bssid}
                onClick={() => handleRecentSearch(bssid, index)}
                className={`text-xs px-3 py-1 rounded-full transition-all hover:scale-105 hover:-translate-y-0.5 hover:shadow-md ${
                  index % 3 === 0 
                    ? 'gradient-card-1' 
                    : index % 3 === 1 
                    ? 'gradient-card-2'
                    : 'gradient-card-3'
                }`}
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}
                disabled={isLoading || isLoadingFromUrl}
              >
                {bssid}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}