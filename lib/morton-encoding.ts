// Morton encoding/decoding for tile keys
// Based on apple-corelocation-experiments implementation

// Pre-calculated powers of 2 for performance
const powerOfTwo: number[] = Array.from({ length: 64 }, (_, i) => Math.pow(2, i));

// Convert lat/lng to tile coordinates at given zoom level
export function toTile(lat: number, lng: number, level: number): { x: number; y: number } {
  const n = Math.pow(2, level);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  
  return { x, y };
}

// Convert tile coordinates back to lat/lng
export function fromTile(x: number, y: number, level: number): { lat: number; lng: number } {
  const n = Math.pow(2, level);
  const lng = x / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = latRad * 180 / Math.PI;
  
  return { lat, lng };
}

// Pack tile coordinates and level into a Morton-encoded tile key
export function pack(x: number, y: number, level: number): number {
  // Note: The Go implementation uses (row, column) = (y, x) ordering
  let row = y;
  let column = x;
  let result = powerOfTwo[level * 2];
  
  for (let i = 0; i < level; i++) {
    if (column & 0x1) {
      result += powerOfTwo[2 * i];
    }
    if (row & 0x1) {
      result += powerOfTwo[2 * i + 1];
    }
    column = column >> 1;
    row = row >> 1;
  }
  
  return result;
}

// Unpack Morton-encoded tile key to tile coordinates and level
export function unpack(tileKey: number): { x: number; y: number; level: number } {
  let row = 0;
  let column = 0;
  let level = 0;
  let quadKey = tileKey;
  
  while (quadKey > 1) {
    const mask = 1 << level;
    if (quadKey & 0x1) {
      column |= mask;
    }
    if (quadKey & 0x2) {
      row |= mask;
    }
    level++;
    quadKey = Math.floor((quadKey - (quadKey & 0x3)) / 4);
  }
  
  return { x: column, y: row, level };
}

// Encode lat/lng to tile key at given zoom level
export function encode(lat: number, lng: number, level: number): number {
  const tile = toTile(lat, lng, level);
  return pack(tile.x, tile.y, level);
}

// Decode tile key to lat/lng and level
export function decode(tileKey: number): { lat: number; lng: number; level: number } {
  const { x, y, level } = unpack(tileKey);
  const coords = fromTile(x, y, level);
  return { ...coords, level };
}

// Get the best zoom level for a given search radius (in meters)
export function getOptimalZoomLevel(radiusMeters: number): number {
  // Approximate: each zoom level doubles the resolution
  // Level 16 = ~610m per tile at equator
  // Level 17 = ~305m per tile at equator
  // Level 18 = ~152m per tile at equator
  // Level 19 = ~76m per tile at equator
  // Level 20 = ~38m per tile at equator
  
  if (radiusMeters > 1000) return 16;
  if (radiusMeters > 500) return 17;
  if (radiusMeters > 250) return 18;
  if (radiusMeters > 125) return 19;
  return 20;
}