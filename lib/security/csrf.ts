/**
 * CSRF Protection Utilities
 * Generates and validates CSRF tokens for form submissions
 */

const CSRF_TOKEN_KEY = 'tax-csrf-token'
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour
const CSRF_TOKEN_REFRESH_BUFFER = 10 * 60 * 1000 // Refresh 10 minutes before expiry

interface CsrfToken {
  token: string
  expiry: number
}

/**
 * Generate a cryptographically secure random token
 */
function generateRandomToken(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  // Fallback for non-browser environments
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Generate a new CSRF token and store it
 */
export function generateCsrfToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const token = generateRandomToken()
  const expiry = Date.now() + CSRF_TOKEN_EXPIRY

  const csrfData: CsrfToken = { token, expiry }

  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfData))
  } catch {
    // sessionStorage not available
  }

  return token
}

/**
 * Get the current CSRF token, generating one if needed
 * Proactively refreshes token if it will expire soon (within buffer period)
 * This ensures tokens don't expire during active form sessions
 */
export function getCsrfToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY)

    if (stored) {
      const csrfData: CsrfToken = JSON.parse(stored)
      const now = Date.now()

      // Check if token is still valid and not about to expire
      if (now < csrfData.expiry) {
        // Proactively refresh if token will expire within buffer period
        // This prevents tokens from expiring during form submission
        if (csrfData.expiry - now < CSRF_TOKEN_REFRESH_BUFFER) {
          return generateCsrfToken() // Generate new token before expiry
        }
        return csrfData.token
      }
    }
  } catch {
    // Error parsing stored token
  }

  // Generate new token
  return generateCsrfToken()
}

/**
 * Validate a CSRF token against the stored token
 */
export function validateCsrfToken(token: string): boolean {
  if (typeof window === 'undefined' || !token) {
    return false
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY)

    if (!stored) {
      return false
    }

    const csrfData: CsrfToken = JSON.parse(stored)

    // Check expiry
    if (Date.now() >= csrfData.expiry) {
      sessionStorage.removeItem(CSRF_TOKEN_KEY)
      return false
    }

    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(token, csrfData.token)
  } catch {
    return false
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY)
  } catch {
    // sessionStorage not available
  }
}

/**
 * Refresh the CSRF token (for sensitive operations)
 */
export function refreshCsrfToken(): string {
  clearCsrfToken()
  return generateCsrfToken()
}

/**
 * Get CSRF headers for API requests
 */
export function getCsrfHeaders(): Record<string, string> {
  return {
    'X-CSRF-Token': getCsrfToken(),
  }
}

/**
 * Add CSRF token to form data
 */
export function addCsrfToFormData(formData: FormData): FormData {
  formData.append('_csrf', getCsrfToken())
  return formData
}

/**
 * React hook for CSRF token (can be imported in components)
 */
export function useCsrfToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return getCsrfToken()
}

/**
 * Extend CSRF token expiry on user activity
 * Call this when user interacts with forms to prevent token expiry during filing
 */
export function extendCsrfToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY)

    if (stored) {
      const csrfData: CsrfToken = JSON.parse(stored)

      // Extend expiry by another hour from now
      csrfData.expiry = Date.now() + CSRF_TOKEN_EXPIRY
      sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfData))
    }
  } catch {
    // If extension fails, generate a fresh token
    generateCsrfToken()
  }
}

/**
 * Check if CSRF token needs refresh (for proactive UI updates)
 */
export function shouldRefreshCsrfToken(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY)

    if (!stored) {
      return true
    }

    const csrfData: CsrfToken = JSON.parse(stored)
    const now = Date.now()

    // Should refresh if expired or will expire within buffer
    return now >= csrfData.expiry || (csrfData.expiry - now < CSRF_TOKEN_REFRESH_BUFFER)
  } catch {
    return true
  }
}
