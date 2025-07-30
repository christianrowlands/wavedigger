export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface BSSIDSearchResult {
  bssid: string;
  location: Location;
  accuracy?: number;
  timestamp?: string;
}

export interface SearchError {
  type: 'NOT_FOUND' | 'INVALID_BSSID' | 'API_ERROR' | 'NETWORK_ERROR';
  message: string;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapMarker {
  id: string;
  bssid: string;
  position: [number, number];
  location: Location;
}