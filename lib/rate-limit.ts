// Shared rate limiting and request guard utilities
// Note: This uses in-memory storage which resets per function instance and on
// deployment. That is acceptable as a second layer of defense behind Vercel
// Firewall rules; for durable limits, use Redis or Vercel KV.

import { NextRequest, NextResponse } from 'next/server';
import type { SearchError } from '@/types';

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
  // Must stay above legitimate burst usage: multi-BSSID search fires up to 10
  // sequential requests per click
  MAX_REQUESTS_PER_WINDOW: 60,
  MAX_404_ERRORS: 200, // Block after 200 404s
  BLOCK_DURATION: 60 * 60 * 1000, // 1 hour block
  AGGRESSIVE_BLOCK_THRESHOLD: 1000, // Longer block after 1000 404s
  AGGRESSIVE_BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hour block
  MAX_TRACKED_IPS: 10000, // Sweep expired entries when the map grows past this
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

export function getClientIp(request: NextRequest): string {
  // x-forwarded-for may be a comma-separated list; the client is the first entry
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Counts the request against the IP's per-minute window. Returns false when
// the IP is over the limit. The 404 counter intentionally survives window
// resets so sustained scanners escalate to a block; it clears when the entry
// is swept after inactivity.
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let ipData = ipRequestCounts.get(ip);
  if (!ipData) {
    ipData = { count: 0, resetTime: now + RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW, errors404: 0 };
    ipRequestCounts.set(ip, ipData);
  } else if (ipData.resetTime <= now) {
    ipData.count = 0;
    ipData.resetTime = now + RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW;
  }
  ipData.count++;
  return ipData.count <= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW;
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

// Browser-only policy: the request must come from a page served by this same
// host (production domain, preview deployment, or localhost dev). POST always
// carries Origin; same-origin GET only carries Referer, so accept either.
export function validateOrigin(request: NextRequest): boolean {
  // URL.host lowercases, so normalize the raw header to match
  const host = request.headers.get('host')?.toLowerCase();
  if (!host) return false;

  const origin = request.headers.get('origin');
  if (origin) {
    return hostFromUrl(origin) === host;
  }
  return hostFromUrl(request.headers.get('referer')) === host;
}

// Throttles the over-cap sweep: under sustained IP rotation the map can stay
// above the cap even right after a sweep, and sweeping per request would make
// every request pay an O(map size) scan
let lastSweepTime = 0;

// Runs all request checks. Returns a response to send when the request should
// be rejected, or null to proceed. Call before any body parsing so rejected
// requests cost near-zero CPU.
export function guardRequest(request: NextRequest): NextResponse | null {
  const now = Date.now();
  if (ipRequestCounts.size > RATE_LIMIT_CONFIG.MAX_TRACKED_IPS && now - lastSweepTime > 30 * 1000) {
    cleanupExpiredData();
    lastSweepTime = now;
  }

  const ip = getClientIp(request);

  if (isIPBlocked(ip)) {
    const blockExpiry = blockedIPs.get(ip) ?? now;
    const error: SearchError = {
      type: 'RATE_LIMITED',
      message: 'Too many failed requests. This is a temporary block; please try again later.'
    };
    return NextResponse.json(
      { error },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((blockExpiry - now) / 1000))) } }
    );
  }

  if (!validateOrigin(request)) {
    const error: SearchError = {
      type: 'INVALID_REQUEST',
      message: 'This API only accepts requests from the WaveDigger web app.'
    };
    return NextResponse.json({ error }, { status: 403 });
  }

  if (!checkRateLimit(ip)) {
    const error: SearchError = {
      type: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment and try again.'
    };
    return NextResponse.json({ error }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  return null;
}
