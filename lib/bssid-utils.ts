export function normalizeBSSID(bssid: string): string | null {
  // Remove all non-hex characters
  const cleaned = bssid.replace(/[^0-9A-Fa-f]/g, '');
  
  // Check if we have exactly 12 hex digits
  if (cleaned.length !== 12) {
    return null;
  }
  
  // Convert to uppercase and add colons
  const upper = cleaned.toUpperCase();
  const parts = [];
  for (let i = 0; i < 12; i += 2) {
    parts.push(upper.substring(i, i + 2));
  }
  
  return parts.join(':');
}

// Normalize BSSID for comparison (handles non-padded format like "11:5:33:44:3d:62")
export function normalizeBSSIDForComparison(bssid: string): string {
  // Split by colon or dash separator
  const parts = bssid.trim().split(/[:\-]/);
  
  if (parts.length === 6) {
    // Pad each part to 2 characters and join with colons
    return parts.map(part => part.padStart(2, '0')).join(':').toUpperCase();
  } else if (bssid.length === 12 && /^[0-9a-fA-F]{12}$/i.test(bssid)) {
    // No separators, split into pairs
    return bssid.toUpperCase().match(/.{2}/g)!.join(':');
  }
  
  // Try to extract hex characters and format
  const hexOnly = bssid.replace(/[^0-9A-Fa-f]/g, '');
  if (hexOnly.length === 12) {
    return hexOnly.toUpperCase().match(/.{2}/g)!.join(':');
  }
  
  // Fallback to original
  return bssid.toUpperCase();
}

export function validateBSSID(bssid: string): boolean {
  // Valid BSSID patterns:
  // XX:XX:XX:XX:XX:XX (colons)
  // XX-XX-XX-XX-XX-XX (dashes)
  // XXXXXXXXXXXX (no separators)
  const patterns = [
    /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
    /^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/,
    /^[0-9A-Fa-f]{12}$/
  ];
  
  return patterns.some(pattern => pattern.test(bssid));
}

export function formatBSSIDForDisplay(bssid: string): string {
  // Use normalizeBSSIDForComparison which handles padding zeros
  return normalizeBSSIDForComparison(bssid);
}

// Format BSSID for URLs using hyphens instead of colons
export function formatBSSIDForURL(bssid: string): string {
  const normalized = normalizeBSSIDForComparison(bssid);
  // Replace colons with hyphens for cleaner URLs
  return normalized.replace(/:/g, '-');
}

// Parse BSSID from URL (accepts both hyphen and colon formats)
export function parseBSSIDFromURL(bssid: string): string {
  // First normalize it (handles colons, hyphens, or no separators)
  return normalizeBSSID(bssid) || bssid;
}

export interface BSSIDValidationResult {
  isValid: boolean;
  normalized: string | null;
  error?: string;
}

export function validateAndNormalizeBSSID(input: string): BSSIDValidationResult {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      normalized: null,
      error: 'BSSID cannot be empty'
    };
  }
  
  const normalized = normalizeBSSID(trimmed);
  
  if (!normalized) {
    return {
      isValid: false,
      normalized: null,
      error: 'Invalid BSSID format. Expected 12 hexadecimal digits (e.g., AA:BB:CC:DD:EE:FF)'
    };
  }
  
  return {
    isValid: true,
    normalized
  };
}