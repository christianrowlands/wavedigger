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
  const normalized = normalizeBSSID(bssid);
  return normalized || bssid;
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