import { Analytics, getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { app } from './firebase';

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';
const isClient = typeof window !== 'undefined';

// Initialize analytics only in production and on client side
let analytics: Analytics | null = null;

if (isProduction && isClient && app) {
  try {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized for production');
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
  }
}

// Type-safe event names for WaveDigger
export const AnalyticsEvents = {
  // Search events
  BSSID_SEARCH: 'bssid_search',
  LOCATION_SEARCH: 'location_search',
  MULTI_BSSID_SEARCH: 'multi_bssid_search',
  SEARCH_HISTORY_CLICK: 'search_history_click',
  
  // Map interactions
  MAP_STYLE_CHANGED: 'map_style_changed',
  MAP_CLICK: 'map_click',
  MARKER_CLICK: 'marker_click',
  
  // User actions
  SHARE_LOCATION: 'share_location',
  COPY_BSSID: 'copy_bssid',
  COPY_LOCATION: 'copy_location',
  CLEAR_ALL_MARKERS: 'clear_all_markers',
  TOGGLE_SURROUNDING_APS: 'toggle_surrounding_aps',
  
  // Navigation
  PAGE_VIEW: 'page_view',
  TAB_SWITCH: 'tab_switch',
  
  // Data operations
  URL_BSSID_LOAD: 'url_bssid_load',
  
  // Errors
  SEARCH_ERROR: 'search_error',
  API_ERROR: 'api_error',
} as const;

// Type for event parameters
export interface AnalyticsEventParams {
  [AnalyticsEvents.BSSID_SEARCH]: {
    search_type: 'single' | 'with_surrounding';
    result_count: number;
    search_source: 'manual' | 'recent' | 'url';
    region?: 'global' | 'china';
  };
  [AnalyticsEvents.LOCATION_SEARCH]: {
    result_count: number;
    latitude: number;
    longitude: number;
  };
  [AnalyticsEvents.MULTI_BSSID_SEARCH]: {
    bssid_count: number;
    result_count: number;
  };
  [AnalyticsEvents.SEARCH_HISTORY_CLICK]: {
    position_in_list: number;
  };
  [AnalyticsEvents.MAP_STYLE_CHANGED]: {
    from_style: string;
    to_style: string;
  };
  [AnalyticsEvents.MAP_CLICK]: {
    has_location_tab_active: boolean;
  };
  [AnalyticsEvents.MARKER_CLICK]: {
    marker_source?: 'global' | 'china';
  };
  [AnalyticsEvents.SHARE_LOCATION]: {
    share_source: 'selected_marker' | 'search_history';
  };
  [AnalyticsEvents.COPY_BSSID]: {
    copy_source: 'selected_marker' | 'mobile_sheet';
  };
  [AnalyticsEvents.COPY_LOCATION]: {
    copy_source: 'selected_marker' | 'mobile_sheet';
  };
  [AnalyticsEvents.CLEAR_ALL_MARKERS]: {
    marker_count: number;
  };
  [AnalyticsEvents.TOGGLE_SURROUNDING_APS]: {
    enabled: boolean;
  };
  [AnalyticsEvents.PAGE_VIEW]: {
    page_title: string;
    page_path: string;
  };
  [AnalyticsEvents.TAB_SWITCH]: {
    from_tab: 'bssid' | 'location';
    to_tab: 'bssid' | 'location';
  };
  [AnalyticsEvents.URL_BSSID_LOAD]: {
    success: boolean;
    has_lat_lng: boolean;
  };
  [AnalyticsEvents.SEARCH_ERROR]: {
    error_type: string;
    search_type: 'bssid' | 'location' | 'multi';
  };
  [AnalyticsEvents.API_ERROR]: {
    endpoint: string;
    status_code: number;
    error_message?: string;
  };
}

// Safe event logging function with type safety
export function logAnalyticsEvent<T extends typeof AnalyticsEvents[keyof typeof AnalyticsEvents]>(
  eventName: T,
  parameters?: AnalyticsEventParams[T]
): void {
  if (!analytics || !isProduction) {
    if (!isProduction) {
      console.log('[Analytics Dev] Event:', eventName, parameters);
    }
    return;
  }
  
  try {
    logEvent(analytics, eventName as string, parameters as Record<string, unknown>);
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

// Set user ID for analytics (if you add user accounts in the future)
export function setAnalyticsUserId(userId: string | null): void {
  if (!analytics || !isProduction) {
    if (!isProduction) {
      console.log('[Analytics Dev] Set user ID:', userId);
    }
    return;
  }
  
  try {
    setUserId(analytics, userId);
  } catch (error) {
    console.error('Failed to set analytics user ID:', error);
  }
}

// Set user properties
export function setAnalyticsUserProperties(properties: Record<string, unknown>): void {
  if (!analytics || !isProduction) {
    if (!isProduction) {
      console.log('[Analytics Dev] Set user properties:', properties);
    }
    return;
  }
  
  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    console.error('Failed to set analytics user properties:', error);
  }
}

// Log page view
export function logPageView(pageTitle: string, pagePath: string): void {
  logAnalyticsEvent(AnalyticsEvents.PAGE_VIEW, {
    page_title: pageTitle,
    page_path: pagePath,
  });
}

// Export analytics instance for advanced usage
export { analytics };