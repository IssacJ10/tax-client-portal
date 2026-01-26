/**
 * Security Configuration
 * Central configuration for all security settings
 */

export const SecurityConfig = {
  /**
   * Rate Limiting Configuration
   */
  rateLimit: {
    // General API requests
    general: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    },
    // Authentication endpoints (login, register, password reset)
    auth: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    },
    // File uploads
    upload: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 uploads per minute
    },
    // Form submissions
    form: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 submissions per minute
    },
  },

  /**
   * Session Configuration
   */
  session: {
    idleWarningMs: 13 * 60 * 1000, // 13 minutes
    idleLogoutMs: 15 * 60 * 1000, // 15 minutes
    tokenRefreshBufferMs: 5 * 60 * 1000, // 5 minutes before expiry
    checkIntervalMs: 60 * 1000, // Check every 60 seconds
  },

  /**
   * Password Requirements
   */
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    specialCharacters: '!@#$%^&*(),.?":{}|<>',
  },

  /**
   * Input Validation Limits
   */
  input: {
    maxStringLength: 10000, // Maximum characters in any text field
    maxNameLength: 100,
    maxEmailLength: 254,
    maxPhoneLength: 20,
    maxAddressLength: 500,
    maxNotesLength: 5000,
  },

  /**
   * File Upload Configuration
   */
  upload: {
    maxFileSizeMB: 10,
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'],
  },

  /**
   * Content Security Policy
   */
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.google.com', 'https://www.gstatic.com'], // Needed for Next.js + reCAPTCHA
    'style-src': ["'self'", "'unsafe-inline'"], // Needed for Tailwind
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'http://localhost:1337', 'https://*.strapi.io', 'https://www.google.com'],
    'frame-src': ["'self'", 'https://www.google.com'], // For reCAPTCHA iframe
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  },

  /**
   * CORS Configuration (for reference - configured in Strapi)
   */
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'https://yourdomain.com', // Add production domain
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  /**
   * CSRF Configuration
   */
  csrf: {
    tokenExpiry: 60 * 60 * 1000, // 1 hour
    headerName: 'X-CSRF-Token',
    cookieName: 'csrf-token',
  },

  /**
   * Request Timeout
   */
  timeout: {
    default: 30000, // 30 seconds
    upload: 120000, // 2 minutes for uploads
    download: 60000, // 1 minute for downloads
  },

  /**
   * Retry Configuration
   */
  retry: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
  },

  /**
   * Error Messages (sanitized for user display)
   */
  errorMessages: {
    unauthorized: 'Your session has expired. Please log in again.',
    forbidden: 'You do not have permission to access this resource.',
    notFound: 'The requested resource was not found.',
    rateLimited: 'Too many requests. Please wait before trying again.',
    serverError: 'An unexpected error occurred. Please try again later.',
    networkError: 'Network connection error. Please check your internet connection.',
    validationError: 'Please check your input and try again.',
    uploadError: 'File upload failed. Please try again.',
    invalidInput: 'Invalid input detected. Please check your data.',
  },
} as const

/**
 * Build CSP header string from config
 */
export function buildCspHeader(): string {
  return Object.entries(SecurityConfig.csp)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive
      }
      return `${directive} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * Get security headers object
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': buildCspHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}

export default SecurityConfig
