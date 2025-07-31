import { useCallback } from 'react';

interface ShareUrlOptions {
  bssid?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  mode?: 'single' | 'multi';
}

export function useShareUrl() {
  const generateShareUrl = useCallback((options: ShareUrlOptions): string => {
    const params = new URLSearchParams();
    
    if (options.bssid) {
      params.set('bssid', options.bssid);
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
    
    const queryString = params.toString();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    return queryString ? `${baseUrl}/?${queryString}` : baseUrl;
  }, []);
  
  return { generateShareUrl };
}