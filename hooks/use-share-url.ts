import { useCallback } from 'react';
import { formatBSSIDForURL } from '@/lib/bssid-utils';

interface ShareUrlOptions {
  bssid?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  mode?: 'single' | 'multi';
  // Cell tower parameters
  mcc?: number;
  mnc?: number;
  tac?: number;
  cellId?: number;
  returnAll?: boolean;
  tab?: 'bssid' | 'location' | 'celltower';
}

export function useShareUrl() {
  const generateShareUrl = useCallback((options: ShareUrlOptions): string => {
    const params = new URLSearchParams();
    
    // Check if this is a cell tower share (has MCC/MNC/TAC/CellID)
    if (options.mcc !== undefined && options.mnc !== undefined && 
        options.tac !== undefined && options.cellId !== undefined) {
      // Cell tower parameters
      params.set('mcc', options.mcc.toString());
      params.set('mnc', options.mnc.toString());
      params.set('tac', options.tac.toString());
      params.set('cellId', options.cellId.toString());
      
      if (options.returnAll !== undefined) {
        params.set('returnAll', options.returnAll.toString());
      }
      
      // Set tab to celltower for cell tower shares
      params.set('tab', 'celltower');
    } else if (options.bssid) {
      // Format BSSID with hyphens for cleaner URLs
      params.set('bssid', formatBSSIDForURL(options.bssid));
    }
    
    if (options.latitude !== undefined && options.longitude !== undefined) {
      params.set('lat', options.latitude.toFixed(6));
      params.set('lng', options.longitude.toFixed(6));
    }
    
    if (options.zoom !== undefined) {
      params.set('zoom', options.zoom.toString());
    }
    
    if (options.mode === 'multi') {
      params.set('mode', 'multi');
    }
    
    // Add tab parameter if specified and not already set
    if (options.tab && !params.has('tab')) {
      params.set('tab', options.tab);
    }
    
    const queryString = params.toString();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    return queryString ? `${baseUrl}/?${queryString}` : baseUrl;
  }, []);
  
  return { generateShareUrl };
}