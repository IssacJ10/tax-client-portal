/**
 * SIN (Social Insurance Number) Protection Module
 *
 * SECURITY: SIN is highly sensitive PII (Personally Identifiable Information)
 * This module provides:
 * - Validation using Luhn algorithm
 * - Masking for display (XXX-XXX-123)
 * - Redaction for logging
 * - Safe handling utilities
 *
 * IMPORTANT GUIDELINES:
 * - NEVER log raw SIN values
 * - ALWAYS use maskSin() for display
 * - ALWAYS use redactSinFromObject() before logging objects
 * - SIN should be encrypted at rest (server-side responsibility)
 * - SIN transmission is protected by HTTPS (in-transit encryption)
 */

// Pattern to detect SIN in strings (9 digits, optionally with dashes/spaces)
const SIN_PATTERN = /\b(\d{3})[-\s]?(\d{3})[-\s]?(\d{3})\b/g
const SIN_PATTERN_STRICT = /^(\d{3})[-\s]?(\d{3})[-\s]?(\d{3})$/

// Fields that commonly contain SIN data
const SIN_FIELD_NAMES = [
  'sin',
  'SIN',
  'socialInsuranceNumber',
  'social_insurance_number',
  'personalInfo.sin',
  'spouse.sin',
]

/**
 * Validate SIN format (9 digits, optionally with separators)
 */
export function isValidSinFormat(sin: string): boolean {
  if (typeof sin !== 'string') return false
  return SIN_PATTERN_STRICT.test(sin.trim())
}

/**
 * Validate SIN using the Luhn algorithm (Canadian SIN checksum)
 * Returns true if SIN passes checksum validation
 *
 * The Luhn algorithm for Canadian SIN:
 * 1. Double every second digit
 * 2. If result > 9, subtract 9
 * 3. Sum all digits
 * 4. Valid if sum is divisible by 10
 */
export function isValidSin(sin: string): boolean {
  if (typeof sin !== 'string') return false

  // Remove separators and whitespace
  const digits = sin.replace(/[-\s]/g, '')

  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(digits)) return false

  // Special case: All zeros is not valid
  if (digits === '000000000') return false

  // Luhn algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(digits[i], 10)

    // Double every second digit (0-indexed, so positions 1, 3, 5, 7)
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  return sum % 10 === 0
}

/**
 * Mask SIN for display
 * Shows only last 3 digits: XXX-XXX-123
 *
 * @param sin - The SIN to mask
 * @param showLast - Number of digits to show (default: 3)
 */
export function maskSin(sin: string | null | undefined, showLast: number = 3): string {
  if (!sin || typeof sin !== 'string') return ''

  // Remove separators
  const digits = sin.replace(/[-\s]/g, '')

  if (digits.length < showLast) return 'XXX-XXX-XXX'

  // Get last N digits
  const visible = digits.slice(-showLast)
  const masked = 'X'.repeat(9 - showLast) + visible

  // Format with dashes
  return `${masked.slice(0, 3)}-${masked.slice(3, 6)}-${masked.slice(6, 9)}`
}

/**
 * Completely redact SIN (for logging)
 * Returns [SIN REDACTED]
 */
export function redactSin(sin: string | null | undefined): string {
  if (!sin) return ''
  return '[SIN REDACTED]'
}

/**
 * Redact all SIN patterns from a string
 * Useful for sanitizing log messages
 */
export function redactSinFromString(str: string): string {
  if (typeof str !== 'string') return str

  // Replace any 9-digit patterns that look like SIN
  return str.replace(SIN_PATTERN, '[SIN REDACTED]')
}

/**
 * Redact SIN from an object (deep)
 * Returns a new object with all SIN fields redacted
 * Use this before logging any user data
 */
export function redactSinFromObject<T>(obj: T, depth: number = 0): T {
  // Prevent infinite recursion
  if (depth > 10) return obj

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    // Check if this string looks like a SIN
    if (SIN_PATTERN_STRICT.test(obj.trim())) {
      return '[SIN REDACTED]' as unknown as T
    }
    // Also redact any embedded SIN patterns
    return redactSinFromString(obj) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSinFromObject(item, depth + 1)) as unknown as T
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      // Check if this key is a SIN field
      const lowerKey = key.toLowerCase()
      if (lowerKey === 'sin' || lowerKey.endsWith('.sin') || lowerKey.includes('socialinsurance')) {
        redacted[key] = '[SIN REDACTED]'
      } else {
        redacted[key] = redactSinFromObject(value, depth + 1)
      }
    }

    return redacted as T
  }

  return obj
}

/**
 * Format SIN with dashes for display
 * Input: 123456789 -> Output: 123-456-789
 * SECURITY: Only use this for masked values, never raw SIN
 */
export function formatSin(sin: string): string {
  if (typeof sin !== 'string') return ''

  const digits = sin.replace(/[-\s]/g, '')
  if (digits.length !== 9) return sin

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`
}

/**
 * Normalize SIN to digits only (for storage/comparison)
 * SECURITY: Only use this when actually processing SIN data
 */
export function normalizeSin(sin: string): string {
  if (typeof sin !== 'string') return ''
  return sin.replace(/[-\s]/g, '')
}

/**
 * Check if a value looks like it might contain a SIN
 * Use this to detect accidental SIN in logs
 */
export function mightContainSin(value: unknown): boolean {
  if (typeof value === 'string') {
    return SIN_PATTERN.test(value)
  }

  if (typeof value === 'object' && value !== null) {
    const str = JSON.stringify(value)
    return SIN_PATTERN.test(str)
  }

  return false
}

/**
 * Create a safe version of console that auto-redacts SIN
 * Use this for development debugging
 */
export const safeConsole = {
  log: (...args: unknown[]): void => {
    const safeArgs = args.map(arg =>
      typeof arg === 'object' ? redactSinFromObject(arg) : redactSinFromString(String(arg))
    )
    console.log(...safeArgs)
  },

  warn: (...args: unknown[]): void => {
    const safeArgs = args.map(arg =>
      typeof arg === 'object' ? redactSinFromObject(arg) : redactSinFromString(String(arg))
    )
    console.warn(...safeArgs)
  },

  error: (...args: unknown[]): void => {
    const safeArgs = args.map(arg =>
      typeof arg === 'object' ? redactSinFromObject(arg) : redactSinFromString(String(arg))
    )
    console.error(...safeArgs)
  },

  debug: (...args: unknown[]): void => {
    const safeArgs = args.map(arg =>
      typeof arg === 'object' ? redactSinFromObject(arg) : redactSinFromString(String(arg))
    )
    console.debug(...safeArgs)
  },
}

/**
 * Zod refinement for SIN validation
 * Use with .refine() in Zod schemas
 */
export function sinValidationRefinement(sin: string): boolean {
  // Empty/optional SIN is valid (field might be optional)
  if (!sin || sin.trim() === '') return true
  return isValidSin(sin)
}

/**
 * Get SIN validation error message
 */
export function getSinValidationMessage(sin: string): string | null {
  if (!sin || sin.trim() === '') return null

  if (!isValidSinFormat(sin)) {
    return 'Please enter a valid SIN format (9 digits)'
  }

  if (!isValidSin(sin)) {
    return 'Please enter a valid Social Insurance Number'
  }

  return null
}

/**
 * Create audit log entry for SIN access
 * SECURITY: Call this whenever SIN is accessed/viewed
 * Returns an object suitable for sending to audit logging service
 */
export function createSinAccessAuditEntry(
  action: 'view' | 'update' | 'delete',
  userId: string | number,
  resourceType: string,
  resourceId: string | number,
  metadata?: Record<string, unknown>
): {
  timestamp: string
  action: string
  sensitiveDataType: string
  userId: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, unknown>
} {
  return {
    timestamp: new Date().toISOString(),
    action: `sin_${action}`,
    sensitiveDataType: 'SIN',
    userId: String(userId),
    resourceType,
    resourceId: String(resourceId),
    metadata: metadata ? redactSinFromObject(metadata) : undefined,
  }
}

// Export field names for reference
export { SIN_FIELD_NAMES }
