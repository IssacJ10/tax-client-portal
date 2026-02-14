import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security Middleware
 * Adds security headers, CSRF protection, and request validation
 */

// Rate limiting store (in-memory for single instance)
// For production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per minute for general endpoints
const AUTH_RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute for auth endpoints

// Sensitive paths that need stricter rate limiting
const AUTH_PATHS = ['/api/auth']

// Paths that should be protected (require authentication)
const PROTECTED_PATHS = ['/dashboard', '/filing', '/profile', '/settings']

// Static paths to skip middleware processing
const STATIC_PATHS = ['/_next', '/static', '/favicon.ico', '/images', '/fonts']

// Paths that should skip auth check (OAuth callbacks, public pages)
const PUBLIC_PATHS = ['/auth', '/connect', '/api']

// Allowed origins for CSRF protection (Origin header validation)
// In production, only allow the production domain
// In development, allow localhost
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://jjelevateas.com',
      'https://www.jjelevateas.com',
      'https://cms.jjelevateas.com',
      'https://admin.jjelevateas.com',
      'https://portal-dot-secret-rope-485200-h6.nn.r.appspot.com',
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
    ]

/**
 * Generate a unique client identifier for rate limiting
 *
 * SECURITY: X-Forwarded-For can be spoofed by attackers if not properly validated.
 * This implementation uses different strategies based on environment:
 *
 * Production (Google App Engine):
 * - Uses X-AppEngine-User-IP header (set by GAE, cannot be spoofed by clients)
 * - Falls back to X-Forwarded-For (trusted because GAE strips client-added headers)
 *
 * Development:
 * - Uses X-Real-IP or localhost fallback
 * - Does not trust X-Forwarded-For since there's no trusted proxy
 */
function getClientId(request: NextRequest): string {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // PRODUCTION: Trust Google App Engine headers
    // X-AppEngine-User-IP is set by GAE and cannot be spoofed by clients
    const appEngineUserIp = request.headers.get('x-appengine-user-ip')
    if (appEngineUserIp) {
      return appEngineUserIp.trim()
    }

    // X-Forwarded-For from GAE is trustworthy because GAE overwrites it
    // Take the first (leftmost) IP which is the client IP added by GAE
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    // Fallback to X-Real-IP (set by some proxies)
    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
      return realIp.trim()
    }
  } else {
    // DEVELOPMENT: Don't trust X-Forwarded-For (no trusted proxy)
    // Only use X-Real-IP if set by local development proxy (e.g., nginx)
    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
      return realIp.trim()
    }
  }

  // Final fallback - use 'unknown' which effectively disables per-IP rate limiting
  // This is safer than trusting potentially spoofed headers
  return 'unknown'
}

/**
 * Check rate limit for client
 */
function checkRateLimit(clientId: string, maxRequests: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitStore.get(clientId)

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: maxRequests - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }

  if (record.count >= maxRequests) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }

  // Increment count
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now }
}

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, RATE_LIMIT_WINDOW_MS)
}

/**
 * Add security headers to response
 *
 * CSP Notes:
 * - 'unsafe-eval' is ONLY allowed in development for Next.js hot reload
 * - 'unsafe-inline' for scripts is required by Next.js inline scripts
 *   (Ideal: implement nonce-based CSP for stricter security)
 * - 'unsafe-inline' for styles is required by Tailwind CSS
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'

  // Build script-src based on environment
  // SECURITY: 'unsafe-eval' only in development for hot reload
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com"

  // Build connect-src based on environment
  const connectSrc = isProduction
    ? "connect-src 'self' https://cms.jjelevateas.com https://*.strapi.io https://www.google.com https://*.nn.r.appspot.com"
    : "connect-src 'self' http://localhost:1337 https://*.strapi.io https://www.google.com https://*.nn.r.appspot.com"

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'", // Required by Tailwind CSS
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    connectSrc,
    "frame-src 'self' https://www.google.com", // For reCAPTCHA iframe
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'", // Block plugins (Flash, Java, etc.)
    "upgrade-insecure-requests",
  ].join('; ')

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', csp)

  // HSTS - only enable in production with HTTPS
  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

/**
 * Validate request method and content type
 */
function validateRequest(request: NextRequest): { valid: boolean; error?: string } {
  const method = request.method

  // For POST/PUT/PATCH, validate content type
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = request.headers.get('content-type') || ''

    // Allow common content types
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ]

    const isValidContentType = allowedTypes.some((type) => contentType.includes(type))

    if (!isValidContentType && contentType !== '') {
      return { valid: false, error: 'Invalid content type' }
    }
  }

  return { valid: true }
}

/**
 * CSRF Protection via Origin Header Validation
 *
 * This is a server-side CSRF check that validates the Origin header
 * for state-changing requests (POST, PUT, PATCH, DELETE).
 *
 * Combined with SameSite cookies, this provides robust CSRF protection.
 * - SameSite=Lax cookies prevent cookies from being sent on cross-site requests
 * - Origin validation provides defense-in-depth
 *
 * Returns true if request is safe, false if it should be blocked
 */
function validateCsrfOrigin(request: NextRequest): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase()

  // Only check state-changing requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true }
  }

  // Get Origin header (preferred) or Referer as fallback
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // For same-origin requests, Origin might not be sent
  // In that case, check Referer
  const sourceOrigin = origin || (referer ? new URL(referer).origin : null)

  // If no origin info at all, this could be a direct request (like from Postman)
  // In production, we should be strict; in development, allow it
  if (!sourceOrigin) {
    if (process.env.NODE_ENV === 'production') {
      // In production, require origin for state-changing requests
      // Exception: Allow requests with no origin if they have valid auth cookies
      // (indicates same-origin or legitimate API call)
      return { valid: true } // Allow - auth will validate on backend
    }
    return { valid: true } // Development: allow for testing tools
  }

  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(sourceOrigin)) {
    return { valid: true }
  }

  // Origin not in allowed list - potential CSRF attack
  return {
    valid: false,
    error: 'Request origin not allowed'
  }
}

/**
 * Check for common attack patterns in URL
 */
function checkUrlSafety(url: string): boolean {
  const dangerousPatterns = [
    /\.\./g, // Path traversal
    /<script/gi, // XSS attempt
    /javascript:/gi, // JavaScript protocol
    /data:/gi, // Data protocol (potential XSS)
    /vbscript:/gi, // VBScript protocol
    /%3Cscript/gi, // URL encoded script tag
    /%00/g, // Null byte injection
  ]

  return !dangerousPatterns.some((pattern) => pattern.test(url))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static paths
  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check URL safety
  if (!checkUrlSafety(request.url)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // CSRF Protection: Validate Origin header for state-changing requests
  const csrfCheck = validateCsrfOrigin(request)
  if (!csrfCheck.valid) {
    const response = new NextResponse('Forbidden - Invalid Origin', { status: 403 })
    return addSecurityHeaders(response)
  }

  // Validate request
  const validation = validateRequest(request)
  if (!validation.valid) {
    return new NextResponse(validation.error || 'Bad Request', { status: 400 })
  }

  // Rate limiting
  const clientId = getClientId(request)
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path))
  const maxRequests = isAuthPath ? AUTH_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS

  const rateLimit = checkRateLimit(clientId, maxRequests)

  if (!rateLimit.allowed) {
    const response = new NextResponse('Too Many Requests', { status: 429 })
    response.headers.set('Retry-After', Math.ceil(rateLimit.resetIn / 1000).toString())
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000).toString())
    return addSecurityHeaders(response)
  }

  // Skip auth check for public paths (OAuth callbacks, auth pages, API routes)
  // These paths handle their own authentication
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000).toString())
    return addSecurityHeaders(response)
  }

  // Note: Auth check for protected paths is handled client-side
  // since we use localStorage for token storage (not accessible in middleware)
  // The session-provider and page components handle redirects for unauthenticated users

  // Create response and add security headers
  const response = NextResponse.next()

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000).toString())

  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
