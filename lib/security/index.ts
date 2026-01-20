/**
 * Security Module
 * Export all security utilities from a single entry point
 */

// Sanitization utilities
export {
  escapeHtml,
  stripDangerousHtml,
  containsDangerousPatterns,
  containsSqlInjection,
  sanitizeInput,
  sanitizeForDisplay,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFormData,
  createSafeErrorMessage,
} from './sanitize'

// CSRF protection
export {
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  clearCsrfToken,
  refreshCsrfToken,
  getCsrfHeaders,
  addCsrfToFormData,
  useCsrfToken,
  extendCsrfToken,
  shouldRefreshCsrfToken,
} from './csrf'

// Secure storage
export {
  secureStorage,
  tokenStorage,
  tokenCache,
} from './secure-storage'

// Validation utilities
export {
  ValidationPatterns,
  ValidationSchemas,
  validateField,
  validateFormData,
  isInputSafe,
  validateApiResponse,
  clientRateLimiter,
  validateFileUpload,
  safeDisplayString,
} from './validation'

// Security configuration
export {
  SecurityConfig,
  buildCspHeader,
  getSecurityHeaders,
} from './config'

// Re-export types
export type { } from './sanitize'
