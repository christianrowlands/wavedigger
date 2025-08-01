// MAC address utilities for converting between int64 and string representations

/**
 * Decode int64 to MAC address string
 * @param i The int64 value representing a MAC address
 * @returns MAC address string in format "XX:XX:XX:XX:XX:XX"
 */
export function decodeMac(i: number): string {
  // Convert to hex string
  let macHex = i.toString(16).toUpperCase();
  
  // Pad with zeros to ensure 12 characters
  while (macHex.length < 12) {
    macHex = '0' + macHex;
  }
  
  // Insert colons between every 2 characters
  const parts: string[] = [];
  for (let j = 0; j < macHex.length; j += 2) {
    parts.push(macHex.substr(j, 2));
  }
  
  return parts.join(':');
}

/**
 * Encode MAC address string to int64
 * @param mac MAC address string (with or without colons/hyphens)
 * @returns int64 representation of the MAC address
 */
export function encodeMac(mac: string): number {
  // Remove colons and hyphens
  const macHex = mac.replace(/[:-]/g, '');
  
  // Validate length
  if (macHex.length !== 12) {
    throw new Error('Invalid MAC address length');
  }
  
  // Convert to number
  return parseInt(macHex, 16);
}

/**
 * Convert tile location coordinate with factor 10^-7
 * @param n The integer coordinate value
 * @returns The decimal coordinate
 */
export function tileCoordFromInt(n: number): number {
  return n * Math.pow(10, -7);
}

/**
 * Convert decimal coordinate to tile integer with factor 10^-7
 * @param coord The decimal coordinate
 * @returns The integer coordinate value
 */
export function intFromTileCoord(coord: number): number {
  return Math.round(coord * Math.pow(10, 7));
}