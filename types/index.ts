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
  source?: 'global' | 'china';
}

export interface SearchError {
  type: 'NOT_FOUND' | 'INVALID_BSSID' | 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_LOCATION' | 'INVALID_REQUEST' | 'RATE_LIMITED';
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
  source?: 'global' | 'china';
  accuracy?: number;
  type?: 'wifi' | 'cell';
}

export interface CellTowerInfo {
  mcc: number;
  mnc: number;
  cellId: number;
  tacId: number;
}

export interface CellTowerSearchResult {
  tower: CellTowerInfo;
  location: Location;
  accuracy?: number;
  source?: 'global' | 'china';
}