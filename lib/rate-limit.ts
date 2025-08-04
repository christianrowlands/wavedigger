// Shared rate limiting utilities
// Note: This uses in-memory storage which resets on deployment
// For production, consider using Redis or Vercel KV

interface IPData {
  count: number;
  resetTime: number;
  errors404: number;
}

// Shared maps for rate limiting
export const ipRequestCounts = new Map<string, IPData>();
export const blockedIPs = new Map<string, number>(); // IP -> block expiry timestamp

// Configuration
export const RATE_LIMIT_CONFIG = {
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 300, // 300 requests per minute
  MAX_404_ERRORS: 200, // Block after 200 404s
  BLOCK_DURATION: 60 * 60 * 1000, // 1 hour block
  AGGRESSIVE_BLOCK_THRESHOLD: 1000, // Longer block after 1000 404s
  AGGRESSIVE_BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hour block
};

export function recordError404(ip: string): boolean {
  const now = Date.now();
  
  // Get or create IP data
  let ipData = ipRequestCounts.get(ip);
  if (!ipData) {
    ipData = { 
      count: 0, 
      resetTime: now + RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW, 
      errors404: 0 
    };
    ipRequestCounts.set(ip, ipData);
  }
  
  // Increment 404 error count
  ipData.errors404++;
  
  // Check if IP should be blocked
  if (ipData.errors404 >= RATE_LIMIT_CONFIG.AGGRESSIVE_BLOCK_THRESHOLD) {
    // Aggressive blocking for severe abuse
    blockedIPs.set(ip, now + RATE_LIMIT_CONFIG.AGGRESSIVE_BLOCK_DURATION);
    console.log(`[AGGRESSIVE BLOCK] IP ${ip} blocked for 24 hours after ${ipData.errors404} 404 errors`);
    return true;
  } else if (ipData.errors404 >= RATE_LIMIT_CONFIG.MAX_404_ERRORS) {
    // Normal blocking
    blockedIPs.set(ip, now + RATE_LIMIT_CONFIG.BLOCK_DURATION);
    console.log(`[BLOCKED] IP ${ip} blocked for 1 hour after ${ipData.errors404} 404 errors`);
    return true;
  }
  
  return false;
}

export function isIPBlocked(ip: string): boolean {
  const blockExpiry = blockedIPs.get(ip);
  if (!blockExpiry) return false;
  
  const now = Date.now();
  if (blockExpiry > now) {
    return true;
  }
  
  // Remove expired block
  blockedIPs.delete(ip);
  return false;
}

export function getIPData(ip: string): IPData | undefined {
  return ipRequestCounts.get(ip);
}

export function cleanupExpiredData() {
  const now = Date.now();
  
  // Clean up expired blocks
  for (const [ip, expiry] of blockedIPs.entries()) {
    if (expiry < now) {
      blockedIPs.delete(ip);
    }
  }
  
  // Clean up old request counts
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (data.resetTime < now - RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW * 2) {
      ipRequestCounts.delete(ip);
    }
  }
}