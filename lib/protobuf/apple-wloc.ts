import protobuf from 'protobufjs';
import path from 'path';

// Initialize the protobuf root
const root = new protobuf.Root();

// Load the proto file
export async function loadProto() {
  try {
    await root.load(path.join(process.cwd(), 'proto/BSSIDApple.proto'));
    return root;
  } catch (error) {
    console.error('Failed to load proto file:', error);
    throw error;
  }
}

// Get message types
export function getMessageTypes(root: protobuf.Root) {
  return {
    AppleWLoc: root.lookupType('AppleWLoc'),
    WifiDevice: root.lookupType('WifiDevice'),
    Location: root.lookupType('Location'),
    DeviceType: root.lookupType('DeviceType'),
    CellTower: root.lookupType('CellTower')
  };
}

// Coordinate conversion utilities
export function coordFromInt(n: number, pow: number): number {
  return n * Math.pow(10, pow);
}

export function intFromCoord(coord: number, pow: number): number {
  return Math.floor(coord * Math.pow(10, -pow));
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

// Serialize protobuf with initial bytes
export function serializeWithPrefix(message: protobuf.Message, initialBytes: Buffer): Buffer {
  const messageBuffer = Buffer.from(message.constructor.encode(message).finish());
  const lengthByte = Buffer.from([messageBuffer.length]);
  return Buffer.concat([initialBytes, lengthByte, messageBuffer]);
}

// Parse response (skip first 10 bytes)
export function parseResponse(data: Buffer, messageType: protobuf.Type): any {
  if (data.length < 10) {
    throw new Error('Response too short');
  }
  return messageType.decode(data.slice(10));
}