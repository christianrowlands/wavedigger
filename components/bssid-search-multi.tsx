'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAndNormalizeBSSID } from '@/lib/bssid-utils';
import type { BSSIDSearchResult, SearchError } from '@/types';

interface MultiBSSIDSearchProps {
  onSearchResults: (results: BSSIDSearchResult[]) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: SearchError) => void;
  maxBSSIDs?: number;
}

interface BSSIDInput {
  id: string;
  value: string;
  isValid: boolean;
  error?: string;
}

export default function MultiBSSIDSearch({ 
  onSearchResults, 
  onSearchStart,
  onSearchError,
  maxBSSIDs = 10
}: MultiBSSIDSearchProps) {
  const [inputs, setInputs] = useState<BSSIDInput[]>([
    { id: '1', value: '', isValid: true }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState<number>(0);

  const handleInputChange = useCallback((id: string, value: string) => {
    setInputs(prev => prev.map(input => {
      if (input.id === id) {
        const validation = value ? validateAndNormalizeBSSID(value) : { isValid: true, normalized: '' };
        return {
          ...input,
          value: validation.normalized || value,
          isValid: validation.isValid,
          error: validation.error
        };
      }
      return input;
    }));
    
    if (error) {
      setError(null);
    }
  }, [error]);

  const addInput = useCallback(() => {
    if (inputs.length < maxBSSIDs) {
      setInputs(prev => [...prev, {
        id: Date.now().toString(),
        value: '',
        isValid: true
      }]);
    }
  }, [inputs.length, maxBSSIDs]);

  const removeInput = useCallback((id: string) => {
    setInputs(prev => prev.filter(input => input.id !== id));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by common delimiters (newline, comma, semicolon)
    const bssids = pastedText
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    if (bssids.length > 1) {
      // Multiple BSSIDs pasted
      const newInputs: BSSIDInput[] = bssids.slice(0, maxBSSIDs).map((bssid, index) => {
        const validation = validateAndNormalizeBSSID(bssid);
        return {
          id: Date.now().toString() + index,
          value: validation.normalized || bssid,
          isValid: validation.isValid,
          error: validation.error
        };
      });
      
      setInputs(newInputs);
    } else if (bssids.length === 1) {
      // Single BSSID pasted
      handleInputChange(inputs[0].id, bssids[0]);
    }
  }, [handleInputChange, inputs, maxBSSIDs]);

  const handleSearch = async () => {
    setError(null);
    setSearchProgress(0);
    
    // Get valid BSSIDs
    const validBSSIDs = inputs
      .filter(input => input.value && input.isValid)
      .map(input => input.value);
    
    if (validBSSIDs.length === 0) {
      setError('Please enter at least one valid BSSID');
      return;
    }
    
    setIsLoading(true);
    onSearchStart?.();
    
    try {
      const results: BSSIDSearchResult[] = [];
      const errors: string[] = [];
      
      // Search for each BSSID
      for (let i = 0; i < validBSSIDs.length; i++) {
        const bssid = validBSSIDs[i];
        setSearchProgress(((i + 1) / validBSSIDs.length) * 100);
        
        try {
          const response = await fetch('/api/bssid', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bssid }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.result) {
            results.push(data.result);
          } else {
            errors.push(`${bssid}: ${data.error?.message || 'Not found'}`);
          }
        } catch (err) {
          errors.push(`${bssid}: Network error`);
        }
      }
      
      if (results.length > 0) {
        onSearchResults(results);
      }
      
      if (errors.length > 0) {
        setError(`Failed to find ${errors.length} BSSID(s):\n${errors.join('\n')}`);
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please try again.');
      onSearchError?.({
        type: 'NETWORK_ERROR',
        message: 'Failed to connect to server'
      });
    } finally {
      setIsLoading(false);
      setSearchProgress(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        {inputs.map((input, index) => (
          <div key={input.id} className="flex gap-2 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
            <Input
              type="text"
              placeholder="Enter BSSID (e.g., AA:BB:CC:DD:EE:FF)"
              value={input.value}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isLoading}
              variant="modern"
              style={{
                borderColor: input.value && !input.isValid ? 'var(--color-error)' : undefined
              }}
            />
            {inputs.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeInput(input.id)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        {inputs.length < maxBSSIDs && (
          <Button
            variant="outline"
            size="sm"
            onClick={addInput}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add BSSID
          </Button>
        )}
        
        <button 
          onClick={handleSearch} 
          disabled={isLoading || inputs.every(i => !i.value)}
          className={`flex-1 btn-primary flex items-center justify-center gap-2 ${isLoading || inputs.every(i => !i.value) ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            background: isLoading || inputs.every(i => !i.value) ? 'var(--bg-tertiary)' : undefined,
            color: isLoading || inputs.every(i => !i.value) ? 'var(--text-tertiary)' : undefined,
            boxShadow: isLoading || inputs.every(i => !i.value) ? 'none' : undefined
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching... {searchProgress > 0 && `${Math.round(searchProgress)}%`}</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Search {inputs.filter(i => i.value && i.isValid).length} BSSID(s)</span>
            </>
          )}
        </button>
      </div>
      
      {isLoading && searchProgress > 0 && (
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${searchProgress}%`,
              background: 'var(--color-primary-500)'
            }}
          />
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <p className="mb-1">Tips:</p>
        <ul className="ml-4 space-y-0.5">
          <li>• Paste multiple BSSIDs separated by commas or new lines</li>
          <li>• Maximum {maxBSSIDs} BSSIDs per search</li>
          <li>• Supports formats: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABBCCDDEEFF</li>
        </ul>
      </div>
    </div>
  );
}