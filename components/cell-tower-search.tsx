'use client';

import React, { useState } from 'react';
import { HelpCircle, AlertCircle, Signal, AlertTriangle } from 'lucide-react';
import type { CellTowerSearchResult, SearchError } from '@/types';
import { validateCellTowerParams, COMMON_CARRIERS } from '@/lib/cell-tower-utils';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvents } from '@/lib/analytics';

interface CellTowerSearchProps {
  onSearchResults: (results: CellTowerSearchResult[], searchParams?: {
    mcc: number;
    mnc: number;
    tac: number;
    cellId: number;
    returnAll: boolean;
  }) => void;
  onError?: (error: SearchError) => void;
  compact?: boolean;
}

export default function CellTowerSearch({ 
  onSearchResults, 
  onError,
  compact = false 
}: CellTowerSearchProps) {
  const [mcc, setMcc] = useState('');
  const [mnc, setMnc] = useState('');
  const [tacId, setTacId] = useState('');
  const [cellId, setCellId] = useState('');
  const [includeSurrounding, setIncludeSurrounding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showLteWarning, setShowLteWarning] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hideLteWarning') !== 'true';
    }
    return true;
  });
  const { logEvent } = useAnalytics();

  const handleSearch = async () => {
    // Validate inputs
    const validation = validateCellTowerParams(mcc, mnc, cellId, tacId);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    setIsSearching(true);
    
    try {
      const params = new URLSearchParams({
        mcc,
        mnc,
        cellId,
        tacId,
        returnAll: includeSurrounding ? 'true' : 'false'
      });
      
      const response = await fetch(`/api/cell-tower?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error) {
          onError?.(data.error);
        }
        return;
      }
      
      if (data.results && data.results.length > 0) {
        onSearchResults(data.results, {
          mcc: parseInt(mcc, 10),
          mnc: parseInt(mnc, 10),
          tac: parseInt(tacId, 10),
          cellId: parseInt(cellId, 10),
          returnAll: includeSurrounding
        });
      }
    } catch (error) {
      console.error('Cell tower search error:', error);
      onError?.({
        type: 'NETWORK_ERROR',
        message: 'Failed to search for cell tower. Please try again.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg transition-all text-sm ${
    compact ? 'py-1.5' : ''
  }`;

  const handleNetworkSurveyClick = () => {
    logEvent(AnalyticsEvents.EXTERNAL_LINK_CLICK, {
      link_type: 'network_survey_app',
      link_url: 'https://www.networksurvey.app/'
    });
  };

  const dismissLteWarning = () => {
    setShowLteWarning(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hideLteWarning', 'true');
    }
  };

  return (
    <div className="space-y-3">
      {/* LTE-only info */}
      {showLteWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ 
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-secondary)'
        }}>
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary-400)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Only LTE towers are supported
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              5G NR, UMTS, and GSM towers are not available through this search
            </p>
          </div>
          <button
            onClick={dismissLteWarning}
            className="text-xs hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Help Section */}
      {showHelp && (
        <div className="p-3 rounded-lg animate-fadeIn" style={{ 
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-secondary)'
        }}>
          <h4 className="font-medium mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            Example Carriers:
          </h4>
          <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {COMMON_CARRIERS.slice(0, 6).map((carrier) => (
              <div key={`${carrier.mcc}-${carrier.mnc}`} className="flex justify-between">
                <span>{carrier.name} ({carrier.country})</span>
                <span className="font-mono">MCC:{carrier.mcc} MNC:{carrier.mnc}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Cell ID and TAC ID can be found using network diagnostic apps or cellular network scanners.
          </p>
        </div>
      )}

      {/* Input Grid */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'}`}>
        <div>
          <input
            type="text"
            value={mcc}
            onChange={(e) => setMcc(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onKeyPress={handleKeyPress}
            placeholder="MCC (e.g., 310)"
            className={inputClass}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            disabled={isSearching}
            title="Mobile Country Code"
          />
        </div>
        
        <div>
          <input
            type="text"
            value={mnc}
            onChange={(e) => setMnc(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onKeyPress={handleKeyPress}
            placeholder="MNC (e.g., 260)"
            className={inputClass}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            disabled={isSearching}
            title="Mobile Network Code"
          />
        </div>
        
        <div>
          <input
            type="text"
            value={tacId}
            onChange={(e) => setTacId(e.target.value.replace(/\D/g, '').slice(0, 5))}
            onKeyPress={handleKeyPress}
            placeholder="TAC"
            className={inputClass}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            disabled={isSearching}
            title="Tracking Area Code"
          />
        </div>
        
        <div>
          <input
            type="text"
            value={cellId}
            onChange={(e) => setCellId(e.target.value.replace(/\D/g, ''))}
            onKeyPress={handleKeyPress}
            placeholder="Cell ID"
            className={inputClass}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            disabled={isSearching}
            title="Cell Tower ID"
          />
        </div>
      </div>

      {/* Include surrounding checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="includeSurrounding"
          checked={includeSurrounding}
          onChange={(e) => setIncludeSurrounding(e.target.checked)}
          className="rounded border-gray-300"
          disabled={isSearching}
        />
        <label 
          htmlFor="includeSurrounding" 
          className="text-sm cursor-pointer select-none"
          style={{ color: 'var(--text-primary)' }}
        >
          Include surrounding towers
        </label>
        {includeSurrounding && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            (returns all towers in area)
          </span>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-lg" style={{ 
          backgroundColor: 'var(--color-error-light)',
          border: '1px solid var(--color-error)'
        }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
          <div className="text-xs space-y-0.5" style={{ color: 'var(--color-error-dark)' }}>
            {validationErrors.map((error, idx) => (
              <div key={idx}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={isSearching || !mcc || !mnc || !cellId || !tacId}
          className={`btn-primary flex-1 flex items-center justify-center gap-2 px-4 ${
            compact ? 'py-1.5' : 'py-2'
          } rounded-lg font-medium transition-all ${
            isSearching || !mcc || !mnc || !cellId || !tacId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            background: isSearching || !mcc || !mnc || !cellId || !tacId ? 'var(--bg-tertiary)' : undefined,
            color: isSearching || !mcc || !mnc || !cellId || !tacId ? 'var(--text-tertiary)' : undefined,
            boxShadow: isSearching || !mcc || !mnc || !cellId || !tacId ? 'none' : undefined
          }}
        >
          {isSearching ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="text-sm">Searching...</span>
            </>
          ) : (
            <>
              <Signal className="h-4 w-4" />
              <span className="text-sm">Search Tower</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={`px-3 ${
            compact ? 'py-1.5' : 'py-2'
          } rounded-lg transition-all hover:scale-105`}
          style={{
            backgroundColor: showHelp ? 'var(--color-primary-100)' : 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
            color: 'var(--text-primary)'
          }}
          title="Show carrier examples"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Info Text */}
      {!compact && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Enter LTE cell tower parameters. Use{' '}
          <a 
            href="https://www.networksurvey.app/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNetworkSurveyClick}
            className="underline hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            Network Survey
          </a>
          {' '}to find these values.
        </p>
      )}
    </div>
  );
}