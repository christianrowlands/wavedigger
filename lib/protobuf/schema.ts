import * as protobuf from 'protobufjs';

// Define the protobuf schema inline for browser compatibility
export const protoSchema = `
syntax = "proto3";

message WifiDevice {
  string bssid = 1;
  optional Location location = 2;
}

message AppleWLoc {
  // optional int64 unknown_value0 = 1;
  repeated WifiDevice wifi_devices = 2;
  optional sint32 num_cell_results = 3;
  optional sint32 num_wifi_results = 4; // Set to -1 to disable
  optional string app_bundle_id = 5;
  // optional string unknown_value2 = 6;
  // optional int64 unknown_value7 = 7;
  repeated CellTower cell_tower_response = 22; // LTE cell towers?
  optional CellTower cell_tower_request = 25;
  // optional int32 unknown_value31 = 31;
  // optional int32 unknown_value32 = 32;
  optional DeviceType device_type = 33;
}

message CellTower {
  uint32 mcc = 1;
  uint32 mnc = 2;
  uint32 cell_id = 3;
  uint32 tac_id = 4;
  optional Location location = 5;
  optional uint32 uarfcn = 6;
  optional uint32 pid = 7;
}

message DeviceType {
  string operating_system = 1;
  string model = 2;
}

message Location {
  optional int64 latitude = 1;
  optional int64 longitude = 2;
  optional int64 horizontal_accuracy = 3;
  optional int64 unknown_value4 = 4;
  optional int64 altitude = 5;
  optional int64 vertical_accuracy = 6;
  optional int64 speed = 7;
  optional int64 course = 8;
  optional int64 timestamp = 9;
  optional int64 unknown_context = 10;
  optional int64 motion_activity_type = 11;
  optional int64 motion_activity_confidence = 12;
  optional int64 provider = 13;
  optional int64 floor = 14;
  optional int64 unknown15 = 15;
  optional int64 motion_vehicle_connected_state_changed = 16;
  optional int64 motion_vehicle_connected = 17;
  optional int64 raw_motion_activity = 18;
  optional int64 motion_activity = 19;
  optional int64 dominant_motion_activity = 20;
  optional int64 course_accuracy = 21;
  optional int64 speed_accuracy = 22;
  optional int64 mode_indicator = 23;
  optional int64 horzUncSemiMaj = 24;
  optional int64 horzUncSemiMin = 25;
  optional int64 horzUncSemiMajAz = 26;
  optional int64 satellite_report = 27;
  optional int64 is_from_location_controller = 28;
  optional int64 pipeline_diagnostic_report = 29;
  optional int64 baro_calibration_indication = 30;
  optional int64 processing_metadata = 31;
}
`;

// Parse the schema
const root = protobuf.parse(protoSchema).root;

// Export message types
export const AppleWLoc = root.lookupType('AppleWLoc');
export const WifiDevice = root.lookupType('WifiDevice');
export const Location = root.lookupType('Location');
export const DeviceType = root.lookupType('DeviceType');
export const CellTower = root.lookupType('CellTower');

// TypeScript interfaces for the messages
export interface ILocation {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  horizontalAccuracy?: number;
  verticalAccuracy?: number;
}

export interface IWifiDevice {
  bssid: string;
  location?: ILocation;
}

export interface IDeviceType {
  operatingSystem: string;
  model: string;
}

export interface IAppleWLoc {
  wifi_devices?: IWifiDevice[];
  wifiDevices?: IWifiDevice[];  // Support both for compatibility
  num_cell_results?: number;
  numCellResults?: number;
  num_wifi_results?: number;
  numWifiResults?: number;
  app_bundle_id?: string;
  appBundleId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cell_tower_response?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellTowerResponse?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cell_tower_request?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellTowerRequest?: any;
  device_type?: IDeviceType;
  deviceType?: IDeviceType;
}

// Coordinate conversion utilities
export function coordFromInt(n: number, pow: number = -8): number {
  return n * Math.pow(10, pow);
}

export function intFromCoord(coord: number, pow: number = -8): number {
  return Math.round(coord * Math.pow(10, -pow));
}

// Initial bytes that need to be prepended to the request
export const INITIAL_WLOC_BYTES = Buffer.from(
  '0001000a656e2d3030315f3030310013636f6d2e6170706c652e6c6f636174696f6e64000c31372e352e312e323146393000000001000000',
  'hex'
);

// Request headers
export const WLOC_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': '*/*',
  'Accept-Charset': 'utf-8',
  'Accept-Language': 'en-us',
  'User-Agent': 'locationd/2890.16.16 CFNetwork/1496.0.7 Darwin/23.5.0'
};

// API endpoints
export const WLOC_API_ENDPOINTS = {
  default: 'https://gs-loc.apple.com/clls/wloc',
  china: 'https://gs-loc-cn.apple.com/clls/wloc'
};

// Serialize protobuf message with initial bytes prefix
export function serializeRequest(wlocData: IAppleWLoc): Buffer {
  
  // Build the protobuf data structure properly
  // IMPORTANT: protobufjs expects camelCase field names, not snake_case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protoData: any = {
    wifiDevices: [],           // camelCase, not wifi_devices
    numWifiResults: -1,        // Use -1 to get results
    numCellResults: 0          // camelCase, not num_cell_results
  };
  
  // Add wifi devices
  const wifiDevices = wlocData.wifiDevices || wlocData.wifi_devices || [];
  if (wifiDevices.length > 0) {
    protoData.wifiDevices = wifiDevices.map((device: IWifiDevice) => ({
      bssid: device.bssid
      // Don't include location in request
    }));
  }
  
  // Add device type if provided
  const deviceType = wlocData.deviceType || wlocData.device_type;
  if (deviceType) {
    protoData.deviceType = {                  // camelCase, not device_type
      operatingSystem: deviceType.operatingSystem,  // camelCase
      model: deviceType.model
    };
  }
  
  // Create and verify the message
  const errMsg = AppleWLoc.verify(protoData);
  if (errMsg) {
    throw new Error(`Invalid protobuf data: ${errMsg}`);
  }
  
  // Create the message
  const message = AppleWLoc.create(protoData);
  
  // Encode the message
  const encodedMessage = AppleWLoc.encode(message).finish();
  
  // Create length byte (single byte, not uint16)
  const lengthByte = Buffer.from([encodedMessage.length]);
  
  // Concatenate: initial bytes + length + message
  const fullRequest = Buffer.concat([
    INITIAL_WLOC_BYTES,
    lengthByte,
    Buffer.from(encodedMessage)
  ]);
  
  return fullRequest;
}

// Parse response (skip first 10 bytes)
export function parseResponse(data: Buffer): IAppleWLoc {
  
  if (data.length < 10) {
    throw new Error(`Response too short: ${data.length} bytes`);
  }
  
  // Skip first 10 bytes and decode
  const protobufData = data.slice(10);
  
  try {
    const message = AppleWLoc.decode(protobufData);
    const obj = AppleWLoc.toObject(message, {
      longs: Number,  // Convert longs to numbers
      defaults: true, // Include default values
      arrays: true,   // Always create arrays
      objects: true   // Always create objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    
    // protobufjs returns camelCase field names
    // Add snake_case versions for compatibility if needed
    if (obj.wifiDevices && !obj.wifi_devices) {
      obj.wifi_devices = obj.wifiDevices;
    }
    if (obj.numWifiResults !== undefined && obj.num_wifi_results === undefined) {
      obj.num_wifi_results = obj.numWifiResults;
    }
    if (obj.numCellResults !== undefined && obj.num_cell_results === undefined) {
      obj.num_cell_results = obj.numCellResults;
    }
    
    return obj as IAppleWLoc;
  } catch (error) {
    throw new Error(`Failed to decode protobuf: ${error}`);
  }
}

// Convert location from response
export function parseLocation(location?: ILocation): { lat: number; lng: number; alt?: number } | null {
  if (!location || location.latitude === undefined || location.longitude === undefined) {
    return null;
  }
  
  const lng = coordFromInt(location.longitude);
  const lat = coordFromInt(location.latitude);
  
  // Check for invalid coordinates (-180, -180)
  if (lng === -180 && lat === -180) {
    return null;
  }
  
  return {
    lat,
    lng,
    alt: location.altitude ? coordFromInt(location.altitude) : undefined
  };
}