'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAndNormalizeBSSID } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, SearchError } from '@/types';

interface BSSIDSearchProps {
  onSearchResult: (result: BSSIDSearchResult) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: SearchError) => void;
}

export default function BSSIDSearch({ 
  onSearchResult, 
  onSearchStart,
  onSearchError 
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

  const handleSearch = async () => {
    // Clear previous error
    setError(null);
    
    // Validate BSSID
    const validation = validateAndNormalizeBSSID(input);
    
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
    handleSearch();
  };

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter BSSID (e.g., AA:BB:CC:DD:EE:FF)"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className={error ? 'border-red-500' : ''}
        />
        <Button 
          onClick={handleSearch} 
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">Search</span>
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Recent searches:</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(bssid => (
              <button
                key={bssid}
                onClick={() => handleRecentSearch(bssid)}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                disabled={isLoading}
              >
                {bssid}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        <p>Supported formats:</p>
        <ul className="ml-4 mt-1">
          <li>• AA:BB:CC:DD:EE:FF (colons)</li>
          <li>• AA-BB-CC-DD-EE-FF (dashes)</li>
          <li>• AABBCCDDEEFF (no separators)</li>
        </ul>
      </div>
    </div>
  );
}