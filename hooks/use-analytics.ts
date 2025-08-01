import { useCallback } from 'react';
import {
  AnalyticsEvents,
  AnalyticsEventParams,
  logAnalyticsEvent,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  logPageView,
} from '@/lib/analytics';

export function useAnalytics() {
  // Log an event with type safety
  const logEvent = useCallback(<T extends typeof AnalyticsEvents[keyof typeof AnalyticsEvents]>(
    eventName: T,
    parameters?: AnalyticsEventParams[T]
  ) => {
    logAnalyticsEvent(eventName, parameters);
  }, []);

  // Set user ID (for future use if user accounts are added)
  const setUserId = useCallback((userId: string | null) => {
    setAnalyticsUserId(userId);
  }, []);

  // Set user properties
  const setUserProperties = useCallback((properties: Record<string, unknown>) => {
    setAnalyticsUserProperties(properties);
  }, []);

  // Log page view
  const trackPageView = useCallback((pageTitle: string, pagePath: string) => {
    logPageView(pageTitle, pagePath);
  }, []);

  // Convenience methods for common events
  const trackBSSIDSearch = useCallback((
    searchType: 'single' | 'with_surrounding',
    resultCount: number,
    searchSource: 'manual' | 'recent' | 'url',
    region?: 'global' | 'china'
  ) => {
    logEvent(AnalyticsEvents.BSSID_SEARCH, {
      search_type: searchType,
      result_count: resultCount,
      search_source: searchSource,
      region,
    });
  }, [logEvent]);

  const trackLocationSearch = useCallback((
    resultCount: number,
    latitude: number,
    longitude: number
  ) => {
    logEvent(AnalyticsEvents.LOCATION_SEARCH, {
      result_count: resultCount,
      latitude,
      longitude,
    });
  }, [logEvent]);

  const trackMultiBSSIDSearch = useCallback((
    bssidCount: number,
    resultCount: number
  ) => {
    logEvent(AnalyticsEvents.MULTI_BSSID_SEARCH, {
      bssid_count: bssidCount,
      result_count: resultCount,
    });
  }, [logEvent]);

  const trackMapStyleChange = useCallback((fromStyle: string, toStyle: string) => {
    logEvent(AnalyticsEvents.MAP_STYLE_CHANGED, {
      from_style: fromStyle,
      to_style: toStyle,
    });
  }, [logEvent]);

  const trackShareLocation = useCallback((shareSource: 'selected_marker' | 'search_history') => {
    logEvent(AnalyticsEvents.SHARE_LOCATION, {
      share_source: shareSource,
    });
  }, [logEvent]);

  const trackCopyAction = useCallback((
    type: 'bssid' | 'location',
    copySource: 'selected_marker' | 'mobile_sheet'
  ) => {
    const eventName = type === 'bssid' 
      ? AnalyticsEvents.COPY_BSSID 
      : AnalyticsEvents.COPY_LOCATION;
    
    logEvent(eventName, {
      copy_source: copySource,
    });
  }, [logEvent]);

  const trackClearAllMarkers = useCallback((markerCount: number) => {
    logEvent(AnalyticsEvents.CLEAR_ALL_MARKERS, {
      marker_count: markerCount,
    });
  }, [logEvent]);

  const trackSearchError = useCallback((
    errorType: string,
    searchType: 'bssid' | 'location' | 'multi'
  ) => {
    logEvent(AnalyticsEvents.SEARCH_ERROR, {
      error_type: errorType,
      search_type: searchType,
    });
  }, [logEvent]);

  const trackTabSwitch = useCallback((
    fromTab: 'bssid' | 'location',
    toTab: 'bssid' | 'location'
  ) => {
    logEvent(AnalyticsEvents.TAB_SWITCH, {
      from_tab: fromTab,
      to_tab: toTab,
    });
  }, [logEvent]);

  return {
    logEvent,
    setUserId,
    setUserProperties,
    trackPageView,
    trackBSSIDSearch,
    trackLocationSearch,
    trackMultiBSSIDSearch,
    trackMapStyleChange,
    trackShareLocation,
    trackCopyAction,
    trackClearAllMarkers,
    trackSearchError,
    trackTabSwitch,
  };
}