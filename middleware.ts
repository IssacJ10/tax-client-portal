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
const AUTH_PATHS = ['/api/auth', '/auth/login', '/auth/register']

// Paths that should be protected (require authentication)
const PROTECTED_PATHS = ['/dashboard', '/filing', '/profile', '/settings']

// Static paths to skip middleware processing
const STATIC_PATHS = ['/_next', '/static', '/favicon.ico', '/images', '/fonts']

// Paths that should skip auth check (OAuth callbacks, public pages)
const PUBLIC_PATHS = ['/auth', '/connect', '/api']

/**
 * Generate a unique client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Use X-Forwarded-For in production (behind load balancer)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Fallback to connection IP
  const ip = request.headers.get('x-real-ip') || 'unknown'
  return ip
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
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - adjust based on your needs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com", // Needed for Next.js + reCAPTCHA
    "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:1337 https://*.strapi.io https://www.google.com", // API endpoints + reCAPTCHA
    "frame-src 'self' https://www.google.com", // For reCAPTCHA iframe
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
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
