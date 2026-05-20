'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertCircle, Signal, Edit2 } from 'lucide-react';
import type { NrCellTowerSearchResult, SearchError } from '@/types';
import {
  validateNrCellTowerParams,
  COMMON_CARRIERS,
} from '@/lib/cell-tower-utils';
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

interface NrCellTowerSearchProps {
  onSearchResults: (results: NrCellTowerSearchResult[], searchParams?: {
    mcc: number;
    mnc: number;
    tac: number;
    nci: string;
    returnAll: boolean;
  }) => void;
  onError?: (error: SearchError) => void;
  compact?: boolean;
  initialMcc?: string;
  initialMnc?: string;
  initialTac?: string;
  initialNci?: string;
}

export default function NrCellTowerSearch({
  onSearchResults,
  onError,
  compact = false,
  initialMcc = '',
  initialMnc = '',
  initialTac = '',
  initialNci = '',
}: NrCellTowerSearchProps) {
  const [mcc, setMcc] = useState(initialMcc);
  const [mnc, setMnc] = useState(initialMnc);
  const [tac, setTac] = useState(initialTac);
  const [nci, setNci] = useState(initialNci);
  const [includeSurrounding, setIncludeSurrounding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<{ mcc: string; mnc: string; tac: string; nci: string; carrier?: string } | null>(null);
  const { logEvent } = useAnalytics();
  const { showToast } = useToast();

  useEffect(() => {
    if (initialMcc) setMcc(initialMcc);
    if (initialMnc) setMnc(initialMnc);
    if (initialTac) setTac(initialTac);
    if (initialNci) setNci(initialNci);
  }, [initialMcc, initialMnc, initialTac, initialNci]);

  const handleSearch = async () => {
    setSearchError(null);
    const validation = validateNrCellTowerParams(mcc, mnc, nci, tac);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setIsSearching(true);

    try {
      const response = await fetch('/api/cell-tower', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          radio: 'nr',
          mcc: parseInt(mcc, 10),
          mnc: parseInt(mnc, 10),
          tac: parseInt(tac, 10),
          nci,
          returnAll: includeSurrounding,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.error) {
          const error = data.error as SearchError;
          if (error.type === 'NOT_FOUND') {
            const msg = `NR cell not found in Apple's database (MCC:${mcc} MNC:${mnc} TAC:${tac} NCI:${nci})`;
            setSearchError(msg);
            showToast(msg, 'error');
          } else if (error.type === 'RATE_LIMITED') {
            const msg = 'Too many requests. Please wait a moment and try again.';
            setSearchError(msg);
            showToast(msg, 'error');
          } else {
            setSearchError(error.message);
            showToast(error.message, 'error');
          }
          onError?.(error);
        }
        return;
      }

      if (data.results && data.results.length > 0) {
        setSearchError(null);
        const carrier = COMMON_CARRIERS.find(c => c.mcc === parseInt(mcc, 10) && c.mnc === parseInt(mnc, 10));
        setLastSearchParams({ mcc, mnc, tac, nci, carrier: carrier?.name });
        if (compact) setIsCollapsed(true);
        onSearchResults(data.results, {
          mcc: parseInt(mcc, 10),
          mnc: parseInt(mnc, 10),
          tac: parseInt(tac, 10),
          nci,
          returnAll: includeSurrounding,
        });
        const count = data.results.length;
        const message = includeSurrounding
          ? `Found ${count} NR cell${count === 1 ? '' : 's'} in the cluster`
          : 'NR cell found';
        showToast(message, 'success');
      } else {
        const msg = 'No NR cells found in the response';
        setSearchError(msg);
        showToast(msg, 'error');
      }
    } catch (error) {
      console.error('NR cell tower search error:', error);
      const msg = 'Network error. Please check your connection and try again.';
      setSearchError(msg);
      showToast(msg, 'error');
      onError?.({ type: 'NETWORK_ERROR', message: 'Failed to search for NR cell.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) handleSearch();
  };

  const inputClass = `w-full px-3 py-2 rounded-lg transition-all text-sm ${compact ? 'py-1.5' : ''}`;

  const handleNetworkSurveyClick = () => {
    logEvent(AnalyticsEvents.EXTERNAL_LINK_CLICK, {
      link_type: 'network_survey_app',
      link_url: 'https://www.networksurvey.app/'
    });
  };

  if (isCollapsed && lastSearchParams && compact) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg glass-card animate-fadeIn" style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
      }}>
        <div className="flex-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-primary)' }}>
          <Signal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-primary-500)' }} />
          <div className="flex flex-wrap items-center gap-1">
            {lastSearchParams.carrier && <span className="font-medium">{lastSearchParams.carrier}</span>}
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              {lastSearchParams.mcc}/{lastSearchParams.mnc}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>&bull;</span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              TAC:{lastSearchParams.tac} NCI:{lastSearchParams.nci}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-2 py-1 rounded-md flex items-center gap-1 hover:scale-105 transition-all"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-secondary)',
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
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'}`}>
        <div>
          <label htmlFor="nr-mcc" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>MCC</label>
          <input
            id="nr-mcc"
            type="text"
            inputMode="numeric"
            value={mcc}
            onChange={(e) => { setMcc(e.target.value.replace(/\D/g, '').slice(0, 3)); setSearchError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 310"
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            disabled={isSearching}
            title="Mobile Country Code"
          />
        </div>
        <div>
          <label htmlFor="nr-mnc" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>MNC</label>
          <input
            id="nr-mnc"
            type="text"
            inputMode="numeric"
            value={mnc}
            onChange={(e) => { setMnc(e.target.value.replace(/\D/g, '').slice(0, 3)); setSearchError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 260"
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            disabled={isSearching}
            title="Mobile Network Code"
          />
        </div>
        <div>
          <label htmlFor="nr-tac" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>TAC (24-bit)</label>
          <input
            id="nr-tac"
            type="text"
            inputMode="numeric"
            value={tac}
            onChange={(e) => { setTac(e.target.value.replace(/\D/g, '').slice(0, 8)); setSearchError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 8112896"
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            disabled={isSearching}
            title="Tracking Area Code (24-bit for NR)"
          />
        </div>
        <div>
          <label htmlFor="nr-nci" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>NCI (36-bit)</label>
          <input
            id="nr-nci"
            type="text"
            inputMode="numeric"
            value={nci}
            onChange={(e) => { setNci(e.target.value.replace(/\D/g, '').slice(0, 11)); setSearchError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 5459972399"
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            disabled={isSearching}
            title="NR Cell Identity"
            aria-label="NR Cell Identity"
          />
        </div>
      </div>

      {/* Include surrounding checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="nrIncludeSurrounding"
          checked={includeSurrounding}
          onChange={(e) => setIncludeSurrounding(e.target.checked)}
          className="checkbox-themed"
          disabled={isSearching}
        />
        <label
          htmlFor="nrIncludeSurrounding"
          className="text-sm cursor-pointer select-none"
          style={{ color: 'var(--text-primary)' }}
        >
          Include surrounding cells
        </label>
        {includeSurrounding && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            (returns all cells in cluster)
          </span>
        )}
      </div>

      {searchError && (
        <div className="flex items-start gap-2 p-2 rounded-lg animate-fadeIn" style={{
          backgroundColor: 'var(--color-error-light)',
          border: '1px solid var(--color-error)',
        }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
          <div className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{searchError}</div>
        </div>
      )}

      {validationErrors.length > 0 && !searchError && (
        <div className="flex items-start gap-2 p-2 rounded-lg" style={{
          backgroundColor: 'var(--color-error-light)',
          border: '1px solid var(--color-error)',
        }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
          <div className="text-xs space-y-0.5" style={{ color: 'var(--color-error-dark)' }}>
            {validationErrors.map((err, idx) => <div key={idx}>{err}</div>)}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={isSearching || !mcc || !mnc || !tac || !nci}
          className={`btn-primary flex-1 flex items-center justify-center gap-2 px-4 ${compact ? 'py-1.5' : 'py-2'} rounded-lg font-medium transition-all ${isSearching || !mcc || !mnc || !tac || !nci ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            background: isSearching || !mcc || !mnc || !tac || !nci ? 'var(--bg-tertiary)' : undefined,
            color: isSearching || !mcc || !mnc || !tac || !nci ? 'var(--text-tertiary)' : undefined,
            boxShadow: isSearching || !mcc || !mnc || !tac || !nci ? 'none' : undefined,
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
              <span className="text-sm">Search NR Cell</span>
            </>
          )}
        </button>

        <Dialog>
          <DialogTrigger asChild>
            <button
              className={`px-3 ${compact ? 'py-1.5' : 'py-2'} rounded-lg transition-all hover:scale-105`}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
              title="Show NR search help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl mb-4">5G NR Cell Search Help</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <section>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>What you need</h3>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li><strong>MCC:</strong> Mobile Country Code (3 digits)</li>
                  <li><strong>MNC:</strong> Mobile Network Code (2-3 digits)</li>
                  <li><strong>TAC:</strong> 5G Tracking Area Code, up to 24 bits (0-16,777,215)</li>
                  <li><strong>NCI:</strong> NR Cell Identity, up to 36 bits (0-68,719,476,735)</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  How to Find Cell Parameters
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Use network diagnostic apps or cellular network scanners like{' '}
                  <a
                    href="https://www.networksurvey.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleNetworkSurveyClick}
                    className="underline hover:opacity-80"
                    style={{ color: 'var(--color-link)' }}
                  >
                    Network Survey
                  </a>{' '}
                  to find your cell&apos;s MCC, MNC, TAC, and NCI values.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>About the results</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  By default this returns just the target cell. Enable &quot;Include surrounding cells&quot; to also get the ~100 surrounding NR cells Apple returns in the same cluster. Each cell has a real lat/lng with per-cell accuracy typically in the 1-2 km range; the cell whose NCI matches your query is marked as the primary result.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Text */}
      {!compact && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Enter 5G NR cell parameters. Use{' '}
          <a
            href="https://networksurvey.app/android"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNetworkSurveyClick}
            className="underline hover:opacity-80"
            style={{ color: 'var(--color-link)' }}
          >
            Network Survey
          </a>
          {' '}to find these values.
        </p>
      )}
    </div>
  );
}
