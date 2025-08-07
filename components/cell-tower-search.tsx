'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, AlertCircle, Signal, AlertTriangle, Edit2, ChevronUp } from 'lucide-react';
import type { CellTowerSearchResult, SearchError } from '@/types';
import { validateCellTowerParams, COMMON_CARRIERS } from '@/lib/cell-tower-utils';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvents } from '@/lib/analytics';
import { useToast } from '@/components/toast-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  initialMcc?: string;
  initialMnc?: string;
  initialTac?: string;
  initialCellId?: string;
  isActive?: boolean;
  shouldStartCollapsed?: boolean;
}

export default function CellTowerSearch({ 
  onSearchResults, 
  onError,
  compact = false,
  initialMcc = '',
  initialMnc = '',
  initialTac = '',
  initialCellId = '',
  isActive = true,
  shouldStartCollapsed = false
}: CellTowerSearchProps) {
  const [mcc, setMcc] = useState(initialMcc);
  const [mnc, setMnc] = useState(initialMnc);
  const [tacId, setTacId] = useState(initialTac);
  const [cellId, setCellId] = useState(initialCellId);
  const [includeSurrounding, setIncludeSurrounding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showLteWarning, setShowLteWarning] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hideLteWarning') !== 'true';
    }
    return true;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<{ mcc: string; mnc: string; tac: string; cellId: string; carrier?: string } | null>(null);
  const { logEvent } = useAnalytics();
  const { showToast } = useToast();
  const hasAppliedUrlCollapse = useRef(false);

  // Update state when initial values change (for auto-populate)
  useEffect(() => {
    if (initialMcc) setMcc(initialMcc);
    if (initialMnc) setMnc(initialMnc);
    if (initialTac) setTacId(initialTac);
    if (initialCellId) setCellId(initialCellId);
  }, [initialMcc, initialMnc, initialTac, initialCellId]);

  // Reset collapsed state when tab becomes inactive
  useEffect(() => {
    if (!isActive && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isActive, isCollapsed]);

  // Handle starting collapsed when loaded from URL
  useEffect(() => {
    if (shouldStartCollapsed && compact && !hasAppliedUrlCollapse.current) {
      // Only collapse if we have the initial values (meaning results were loaded)
      if (initialMcc && initialMnc && initialTac && initialCellId) {
        setIsCollapsed(true);
        // Set last search params for the collapsed view
        const carrier = COMMON_CARRIERS.find(c => c.mcc === parseInt(initialMcc, 10) && c.mnc === parseInt(initialMnc, 10));
        setLastSearchParams({
          mcc: initialMcc,
          mnc: initialMnc,
          tac: initialTac,
          cellId: initialCellId,
          carrier: carrier?.name
        });
        // Mark that we've applied the URL collapse
        hasAppliedUrlCollapse.current = true;
      }
    }
    
    // Reset the flag when shouldStartCollapsed becomes false
    if (!shouldStartCollapsed && hasAppliedUrlCollapse.current) {
      hasAppliedUrlCollapse.current = false;
    }
  }, [shouldStartCollapsed, compact, initialMcc, initialMnc, initialTac, initialCellId]);


  const handleSearch = async () => {
    // Clear previous errors
    setSearchError(null);
    
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
          const error = data.error as SearchError;
          
          // Show appropriate error message based on error type
          if (error.type === 'NOT_FOUND') {
            const errorMsg = `Tower not found in Apple's database (MCC: ${mcc}, MNC: ${mnc}, TAC: ${tacId}, Cell ID: ${cellId})`;
            setSearchError(errorMsg);
            showToast(errorMsg, 'error');
          } else if (error.type === 'RATE_LIMITED') {
            const errorMsg = 'Too many requests. Please wait a moment and try again.';
            setSearchError(errorMsg);
            showToast(errorMsg, 'error');
          } else {
            setSearchError(error.message);
            showToast(error.message, 'error');
          }
          
          onError?.(error);
        }
        return;
      }
      
      if (data.results && data.results.length > 0) {
        // Clear any previous errors on successful search
        setSearchError(null);
        
        // Find carrier name from common carriers
        const carrier = COMMON_CARRIERS.find(c => c.mcc === parseInt(mcc, 10) && c.mnc === parseInt(mnc, 10));
        
        // Store last search params for collapsed view
        setLastSearchParams({
          mcc,
          mnc,
          tac: tacId,
          cellId,
          carrier: carrier?.name
        });
        
        // Auto-collapse on successful search (only on mobile/compact mode)
        if (compact) {
          setIsCollapsed(true);
        }
        
        onSearchResults(data.results, {
          mcc: parseInt(mcc, 10),
          mnc: parseInt(mnc, 10),
          tac: parseInt(tacId, 10),
          cellId: parseInt(cellId, 10),
          returnAll: includeSurrounding
        });
        
        // Show success message
        const foundCount = data.results.length;
        const message = includeSurrounding 
          ? `Found ${foundCount} tower${foundCount > 1 ? 's' : ''} in the area`
          : `Tower found successfully`;
        showToast(message, 'success');
      } else {
        // This shouldn't happen if API is working correctly, but handle it
        const errorMsg = 'No towers found in the response';
        setSearchError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Cell tower search error:', error);
      const errorMsg = 'Network error. Please check your connection and try again.';
      setSearchError(errorMsg);
      showToast(errorMsg, 'error');
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

  // Collapsed view - show compact summary
  if (isCollapsed && lastSearchParams && compact) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg glass-card animate-fadeIn" style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)'
      }}>
        <div className="flex-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-primary)' }}>
          <Signal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-primary-500)' }} />
          <div className="flex flex-wrap items-center gap-1">
            {lastSearchParams.carrier && (
              <span className="font-medium">{lastSearchParams.carrier}</span>
            )}
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              {lastSearchParams.mcc}/{lastSearchParams.mnc}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              TAC:{lastSearchParams.tac} Cell:{lastSearchParams.cellId}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-2 py-1 rounded-md flex items-center gap-1 hover:scale-105 transition-all"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-secondary)'
          }}
        >
          <Edit2 className="h-3 w-3" />
          <span className="text-xs">Edit</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* LTE-only info */}
      {showLteWarning && (
        <div className="flex items-start gap-2 p-2 rounded-lg" style={{ 
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
      {/* Input Grid */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'}`}>
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={mcc}
            onChange={(e) => {
              setMcc(e.target.value.replace(/\D/g, '').slice(0, 3));
              setSearchError(null); // Clear error when user types
            }}
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
            inputMode="numeric"
            value={mnc}
            onChange={(e) => {
              setMnc(e.target.value.replace(/\D/g, '').slice(0, 3));
              setSearchError(null); // Clear error when user types
            }}
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
            inputMode="numeric"
            value={tacId}
            onChange={(e) => {
              setTacId(e.target.value.replace(/\D/g, '').slice(0, 5));
              setSearchError(null); // Clear error when user types
            }}
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
            inputMode="numeric"
            value={cellId}
            onChange={(e) => {
              setCellId(e.target.value.replace(/\D/g, ''));
              setSearchError(null); // Clear error when user types
            }}
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

      {/* Search Error - Display NOT_FOUND and other errors */}
      {searchError && (
        <div className="flex items-start gap-2 p-2 rounded-lg animate-fadeIn" style={{ 
          backgroundColor: 'var(--color-error-light)',
          border: '1px solid var(--color-error)'
        }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
          <div className="text-xs" style={{ color: 'var(--color-error-dark)' }}>
            {searchError}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && !searchError && (
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
        
        {/* Collapse button - mobile only */}
        {compact && (
          <button
            onClick={() => {
              // Only allow collapse if we have values to show
              if (mcc && mnc && tacId && cellId) {
                // Find carrier name for the collapsed view
                const carrier = COMMON_CARRIERS.find(c => 
                  c.mcc === parseInt(mcc, 10) && c.mnc === parseInt(mnc, 10)
                );
                setLastSearchParams({
                  mcc,
                  mnc,
                  tac: tacId,
                  cellId,
                  carrier: carrier?.name
                });
                setIsCollapsed(true);
              }
            }}
            className={`px-3 ${
              compact ? 'py-1.5' : 'py-2'
            } rounded-lg transition-all hover:scale-105`}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              color: mcc && mnc && tacId && cellId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: mcc && mnc && tacId && cellId ? 1 : 0.5,
              cursor: mcc && mnc && tacId && cellId ? 'pointer' : 'not-allowed'
            }}
            disabled={!(mcc && mnc && tacId && cellId)}
            title="Minimize search"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        
        <Dialog>
          <DialogTrigger asChild>
            <button
              className={`px-3 ${
                compact ? 'py-1.5' : 'py-2'
              } rounded-lg transition-all hover:scale-105`}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)'
              }}
              title="Show carrier examples"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl mb-4">Cell Tower Search Help</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* LTE Support Section */}
              <section>
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-primary-400)' }} />
                  LTE Support Only
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This search only supports LTE towers. 5G NR, UMTS, and GSM towers are not available through Apple&apos;s location services.
                </p>
              </section>

              {/* How to Find Parameters */}
              <section>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  How to Find Tower Parameters
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Use network diagnostic apps or cellular network scanners like{' '}
                  <a 
                    href="https://www.networksurvey.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleNetworkSurveyClick}
                    className="underline hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Network Survey
                  </a>{' '}
                  to find your tower&apos;s MCC, MNC, TAC, and Cell ID values.
                </p>
              </section>

              {/* Required Parameters */}
              <section>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  Required Parameters
                </h3>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li><strong>MCC:</strong> Mobile Country Code (3 digits)</li>
                  <li><strong>MNC:</strong> Mobile Network Code (2-3 digits)</li>
                  <li><strong>TAC:</strong> Tracking Area Code</li>
                  <li><strong>Cell ID:</strong> Cell Tower Identifier</li>
                </ul>
              </section>
            </div>
          </DialogContent>
        </Dialog>
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