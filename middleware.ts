import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  ipRequestCounts, 
  blockedIPs, 
  RATE_LIMIT_CONFIG,
  isIPBlocked,
  cleanupExpiredData 
} from './lib/rate-limit';

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}


export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getClientIP(request);
  const now = Date.now();
  const userAgent = request.headers.get('user-agent') || '';
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  
  // Basic bot detection
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper|curl|wget|python-requests|postman/i,
    /^$/  // Empty user agent
  ];
  
  const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  // In production, check if origin/referer match your domain
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = ['https://wavedigger.networksurvey.app', 'http://localhost:3000'];
  
  if (isProduction && request.nextUrl.pathname === '/api/bssid') {
    // Check origin for POST requests
    if (request.method === 'POST' && !allowedOrigins.includes(origin)) {
      console.log(`[Suspicious Request] Blocked request from IP ${ip} - Invalid origin: ${origin}`);
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
    }
    
    // Log suspicious user agents but don't block them yet (to avoid false positives)
    if (isSuspiciousUA) {
      console.log(`[Suspicious UA] IP ${ip} - User-Agent: ${userAgent}`);
    }
  }
  
  // Cleanup expired data periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredData();
  }
  
  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    console.log(`[Blocked IP] ${ip} attempted to access ${request.nextUrl.pathname}`);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  // Get or create request count data for this IP
  let ipData = ipRequestCounts.get(ip);
  if (!ipData || ipData.resetTime < now) {
    ipData = { 
      count: 0, 
      resetTime: now + RATE_LIMIT_CONFIG.RATE_LIMIT_WINDOW, 
      errors404: 0 
    };
    ipRequestCounts.set(ip, ipData);
  }
  
  // Increment request count
  ipData.count++;
  
  // Check rate limit
  if (ipData.count > RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    console.log(`[Rate Limit] IP ${ip} exceeded limit: ${ipData.count} requests`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((ipData.resetTime - now) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(ipData.resetTime)
        }
      }
    );
  }
  
  // Clone the response to check status
  const response = NextResponse.next();
  
  // Track 404 errors for blocking malicious IPs
  if (request.nextUrl.pathname === '/api/bssid') {
    response.headers.set('X-Client-IP', ip);
    
    // Note: We can't check response status in edge middleware
    // The 404 tracking will be handled in the API route itself
  }
  
  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW));
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - ipData.count));
  response.headers.set('X-RateLimit-Reset', String(ipData.resetTime));
  
  // Add security headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // CORS headers (restrictive by default)
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};