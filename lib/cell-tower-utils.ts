// Cell tower validation and utility functions

export interface CarrierInfo {
  name: string;
  mcc: number;
  mnc: number;
  country: string;
}

// Common carrier examples for help text
export const COMMON_CARRIERS: CarrierInfo[] = [
  // USA
  { name: 'Verizon', mcc: 311, mnc: 480, country: 'USA' },
  { name: 'AT&T', mcc: 310, mnc: 410, country: 'USA' },
  { name: 'T-Mobile US', mcc: 310, mnc: 260, country: 'USA' },
  { name: 'Sprint', mcc: 310, mnc: 120, country: 'USA' },
  
  // UK
  { name: 'EE', mcc: 234, mnc: 30, country: 'UK' },
  { name: 'O2 UK', mcc: 234, mnc: 10, country: 'UK' },
  { name: 'Vodafone UK', mcc: 234, mnc: 15, country: 'UK' },
  { name: 'Three UK', mcc: 234, mnc: 20, country: 'UK' },
  
  // Germany
  { name: 'Telekom', mcc: 262, mnc: 1, country: 'Germany' },
  { name: 'Vodafone DE', mcc: 262, mnc: 2, country: 'Germany' },
  { name: 'O2 Germany', mcc: 262, mnc: 7, country: 'Germany' },
  
  // Canada
  { name: 'Rogers', mcc: 302, mnc: 720, country: 'Canada' },
  { name: 'Bell', mcc: 302, mnc: 610, country: 'Canada' },
  { name: 'Telus', mcc: 302, mnc: 220, country: 'Canada' },
  
  // Australia
  { name: 'Telstra', mcc: 505, mnc: 1, country: 'Australia' },
  { name: 'Optus', mcc: 505, mnc: 2, country: 'Australia' },
  { name: 'Vodafone AU', mcc: 505, mnc: 3, country: 'Australia' },
];

export function validateMCC(mcc: string): boolean {
  const mccNum = parseInt(mcc, 10);
  return !isNaN(mccNum) && mccNum >= 0 && mccNum <= 999;
}

export function validateMNC(mnc: string): boolean {
  const mncNum = parseInt(mnc, 10);
  return !isNaN(mncNum) && mncNum >= 0 && mncNum <= 999;
}

export function validateCellId(cellId: string): boolean {
  const cellIdNum = parseInt(cellId, 10);
  return !isNaN(cellIdNum) && cellIdNum >= 0 && cellIdNum <= 4294967295; // Max 32-bit unsigned
}

export function validateTacId(tacId: string): boolean {
  const tacIdNum = parseInt(tacId, 10);
  return !isNaN(tacIdNum) && tacIdNum >= 0 && tacIdNum <= 65535; // Max 16-bit unsigned
}

// NR-specific validators. NCI is 36-bit per 3GPP; NR TAC is 24-bit.
// NCI is validated as a string via BigInt to safely cover the full 2^36 - 1
// range without floating-point rounding.
const NCI_MAX = BigInt('68719476735'); // 2^36 - 1
const NR_TAC_MAX = BigInt('16777215'); // 2^24 - 1
const BIG_ZERO = BigInt(0);

export function validateNci(nci: string): boolean {
  if (!nci || !/^\d+$/.test(nci)) return false;
  try {
    const n = BigInt(nci);
    return n >= BIG_ZERO && n <= NCI_MAX;
  } catch {
    return false;
  }
}

export function validateNrTac(tac: string): boolean {
  if (!tac || !/^\d+$/.test(tac)) return false;
  try {
    const n = BigInt(tac);
    return n >= BIG_ZERO && n <= NR_TAC_MAX;
  } catch {
    return false;
  }
}

export function validateNrCellTowerParams(mcc: string, mnc: string, nci: string, tac: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mcc || !validateMCC(mcc)) {
    errors.push('MCC must be 0-999');
  }

  if (!mnc || !validateMNC(mnc)) {
    errors.push('MNC must be 0-999');
  }

  if (!nci || !validateNci(nci)) {
    errors.push(`NCI must be 0-${NCI_MAX.toString()} (36-bit)`);
  }

  if (!tac || !validateNrTac(tac)) {
    errors.push(`TAC must be 0-${NR_TAC_MAX.toString()} (24-bit)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCellTowerParams(mcc: string, mnc: string, cellId: string, tacId: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!mcc || !validateMCC(mcc)) {
    errors.push('MCC must be 0-999');
  }
  
  if (!mnc || !validateMNC(mnc)) {
    errors.push('MNC must be 0-999');
  }
  
  if (!cellId || !validateCellId(cellId)) {
    errors.push('Cell ID must be a positive number');
  }
  
  if (!tacId || !validateTacId(tacId)) {
    errors.push('TAC must be 0-65535');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatCellTowerInfo(
  mcc: number, 
  mnc: number, 
  cellId: number, 
  tacId: number,
  uarfcn?: number,
  pid?: number
): string {
  // Find carrier name if known
  const carrier = COMMON_CARRIERS.find(c => c.mcc === mcc && c.mnc === mnc);
  const carrierName = carrier ? `${carrier.name} (${carrier.country})` : 'Unknown Carrier';
  
  // Base format
  let format = `${carrierName} - MCC:${mcc} MNC:${mnc} TAC:${tacId} Cell:${cellId}`;
  
  // Add optional fields if present (using LTE terminology)
  if (uarfcn !== undefined) {
    format += ` EARFCN:${uarfcn}`;
  }
  if (pid !== undefined) {
    format += ` PCI:${pid}`;
  }
  
  return format;
}

export function getCarrierExamples(country?: string): CarrierInfo[] {
  if (country) {
    return COMMON_CARRIERS.filter(c => c.country.toLowerCase() === country.toLowerCase());
  }
  return COMMON_CARRIERS.slice(0, 6); // Return first 6 as examples
}

// Check if a string is a cell tower label (vs a BSSID)
export function isCellTowerLabel(label: string): boolean {
  // Cell tower labels have the format: "Carrier - MCC:xxx MNC:xxx TAC:xxx Cell:xxx"
  // or the NR variant ending in NCI:xxx (see isNrCellTowerLabel).
  return label.includes(' - MCC:') && label.includes(' MNC:') && label.includes(' TAC:') && (label.includes(' Cell:') || label.includes(' NCI:'));
}

// NR-specific label discriminator.
export function isNrCellTowerLabel(label: string): boolean {
  return label.includes(' - MCC:') && label.includes(' MNC:') && label.includes(' TAC:') && label.includes(' NCI:');
}

export function formatNrCellTowerInfo(
  mcc: number,
  mnc: number,
  nci: string,
  tac: number,
  nrArfcn?: number
): string {
  const carrier = COMMON_CARRIERS.find(c => c.mcc === mcc && c.mnc === mnc);
  const carrierName = carrier ? `${carrier.name} (${carrier.country})` : 'Unknown Carrier';
  let format = `${carrierName} - MCC:${mcc} MNC:${mnc} TAC:${tac} NCI:${nci} [NR]`;
  if (nrArfcn !== undefined) {
    format += ` ARFCN:${nrArfcn}`;
  }
  return format;
}

export function parseNrCellTowerInfo(label: string): {
  carrier: string;
  mcc: number;
  mnc: number;
  tac: number;
  nci: string;
  nrArfcn?: number;
} | null {
  const baseMatch = label.match(/^(.*?) - MCC:(\d+) MNC:(\d+) TAC:(\d+) NCI:(\d+)/);
  if (!baseMatch) return null;
  const result: {
    carrier: string;
    mcc: number;
    mnc: number;
    tac: number;
    nci: string;
    nrArfcn?: number;
  } = {
    carrier: baseMatch[1],
    mcc: parseInt(baseMatch[2], 10),
    mnc: parseInt(baseMatch[3], 10),
    tac: parseInt(baseMatch[4], 10),
    nci: baseMatch[5],
  };
  const arfcnMatch = label.match(/ARFCN:(\d+)/);
  if (arfcnMatch) {
    result.nrArfcn = parseInt(arfcnMatch[1], 10);
  }
  return result;
}

// Parse cell tower info from formatted string
export function parseCellTowerInfo(label: string): { 
  carrier: string; 
  mcc: number; 
  mnc: number; 
  tacId: number; 
  cellId: number;
  uarfcn?: number;
  pid?: number;
} | null {
  // Format: "Carrier - MCC:xxx MNC:xxx TAC:xxx Cell:xxx [EARFCN:xxx] [PCI:xxx]"
  // Also supports old format with UARFCN/PID for backward compatibility
  const baseMatch = label.match(/^(.*?) - MCC:(\d+) MNC:(\d+) TAC:(\d+) Cell:(\d+)/);
  if (!baseMatch) return null;
  
  const result: {
    carrier: string;
    mcc: number;
    mnc: number;
    tacId: number;
    cellId: number;
    uarfcn?: number;
    pid?: number;
  } = {
    carrier: baseMatch[1],
    mcc: parseInt(baseMatch[2], 10),
    mnc: parseInt(baseMatch[3], 10),
    tacId: parseInt(baseMatch[4], 10),
    cellId: parseInt(baseMatch[5], 10)
  };
  
  // Extract optional EARFCN (new format) or UARFCN (old format)
  const earfcnMatch = label.match(/EARFCN:(\d+)/);
  const uarfcnMatch = label.match(/UARFCN:(\d+)/);
  if (earfcnMatch) {
    result.uarfcn = parseInt(earfcnMatch[1], 10);
  } else if (uarfcnMatch) {
    result.uarfcn = parseInt(uarfcnMatch[1], 10);
  }
  
  // Extract optional PCI (new format) or PID (old format)
  const pciMatch = label.match(/PCI:(\d+)/);
  const pidMatch = label.match(/PID:(\d+)/);
  if (pciMatch) {
    result.pid = parseInt(pciMatch[1], 10);
  } else if (pidMatch) {
    result.pid = parseInt(pidMatch[1], 10);
  }
  
  return result;
}