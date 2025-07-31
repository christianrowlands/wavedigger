'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAndNormalizeBSSID } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, SearchError } from '@/types';

interface BSSIDSearchProps {
  onSearchResult: (result: BSSIDSearchResult) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: SearchError) => void;
  mobileToggle?: React.ReactNode;
}

export default function BSSIDSearch({ 
  onSearchResult, 
  onSearchStart,
  onSearchError,
  mobileToggle 
}: BSSIDSearchProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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
    // Clear previous error
    setError(null);
    
    // Use provided BSSID or fall back to input state
    const bssidToValidate = bssidOverride || input;
    
    // Validate BSSID
    const validation = validateAndNormalizeBSSID(bssidToValidate);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid BSSID format');
      return;
    }
    
    if (!validation.normalized) {
      setError('Failed to normalize BSSID');
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
        body: JSON.stringify({ bssid: validation.normalized }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = data.error as SearchError;
        setError(error.message);
        onSearchError?.(error);
        return;
      }
      
      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [validation.normalized!, ...prev.filter(b => b !== validation.normalized)];
        return updated.slice(0, 5); // Keep only last 5 searches
      });
      
      // Clear input after successful search
      setInput('');
      onSearchResult(data.result);
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please try again.');
      onSearchError?.({
        type: 'NETWORK_ERROR',
        message: 'Failed to connect to server'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const handleRecentSearch = (bssid: string) => {
    setInput(bssid);
    handleSearch(bssid);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-1 sm:gap-2">
        {mobileToggle && <div className="lg:hidden">{mobileToggle}</div>}
        <Input
          type="text"
          placeholder="Enter BSSID"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className={`flex-1 min-w-0 ${error ? 'border-red-500' : ''}`}
          variant="modern"
        />
        <button 
          onClick={() => handleSearch()} 
          disabled={isLoading || !input.trim()}
          className={`btn-primary flex items-center justify-center px-2 sm:px-3 flex-shrink-0 ${isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            background: isLoading || !input.trim() ? 'var(--bg-tertiary)' : undefined,
            color: isLoading || !input.trim() ? 'var(--text-tertiary)' : undefined,
            boxShadow: isLoading || !input.trim() ? 'none' : undefined
          }}
          title={isLoading ? 'Searching...' : 'Search for BSSID'}
        >
          {isLoading ? (
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
                onClick={() => handleRecentSearch(bssid)}
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
                disabled={isLoading}
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