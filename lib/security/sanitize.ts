/**
 * Input Sanitization Utilities
 * Protects against XSS attacks by sanitizing user input
 */

// HTML entity encoding map
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

// Dangerous patterns that could indicate XSS attempts
// Note: Patterns must be specific to avoid false positives with legitimate content
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /data:\s*(text\/html|application\/x|image\/svg)/gi, // Only dangerous data: URIs, not plain "data" word
  /vbscript:/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*["']?\s*data:/gi, // CSS url() with data: scheme
]

// SQL injection patterns - must be specific to avoid false positives
// Only match actual SQL injection attempts, not legitimate text containing SQL keywords
const SQL_INJECTION_PATTERNS = [
  // SQL statements with specific table/column patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b\s+.{0,20}\b(FROM|INTO|TABLE|WHERE|SET)\b)/gi,
  // SQL comment injection
  /['"]\s*;\s*--/gi,
  // Boolean injection patterns with quotes
  /['"]\s*OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, // 'OR 1=1
  /['"]\s*AND\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, // 'AND 1=1
  // UNION-based injection
  /\bUNION\s+(ALL\s+)?SELECT\b/gi,
]

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return ''
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove potentially dangerous HTML tags and attributes
 */
export function stripDangerousHtml(str: string): string {
  if (typeof str !== 'string') return ''

  let result = str

  // Remove script tags and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers (onclick, onload, etc.)
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: and vbscript: protocols
  result = result.replace(/javascript:/gi, '')
  result = result.replace(/vbscript:/gi, '')
  // Only remove dangerous data: URIs (text/html, application/x, image/svg can contain executable code)
  // Don't remove plain "data:" as it breaks legitimate form field values
  result = result.replace(/data:\s*(text\/html|application\/x-|image\/svg)/gi, '')

  // Remove expression() in CSS
  result = result.replace(/expression\s*\([^)]*\)/gi, '')

  // Remove dangerous attributes
  result = result.replace(/\s*(style|class)\s*=\s*["'][^"']*expression[^"']*["']/gi, '')

  return result
}

/**
 * Check if string contains dangerous XSS patterns
 */
export function containsDangerousPatterns(str: string): boolean {
  if (typeof str !== 'string') return false
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(str))
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSqlInjection(str: string): boolean {
  if (typeof str !== 'string') return false
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(str))
}

/**
 * Sanitize user input for API calls
 * Removes dangerous HTML content but preserves legitimate characters
 * Note: HTML entity escaping (escapeHtml) should only be used for DISPLAY output,
 * not for data being sent to APIs (the backend handles its own sanitization)
 */
export function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) return input

  if (typeof input === 'string') {
    // Strip dangerous HTML (script tags, event handlers, etc.)
    // but do NOT escape HTML entities - that corrupts legitimate data
    let result = stripDangerousHtml(input)
    // Trim whitespace
    result = result.trim()
    return result
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      // Check for prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue // Skip dangerous keys
      }
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}

/**
 * Sanitize for display - lighter sanitization for displaying user content
 * Only escapes HTML, doesn't modify structure
 */
export function sanitizeForDisplay(str: string): string {
  if (typeof str !== 'string') return ''
  return escapeHtml(str)
}

/**
 * Sanitize URL - validates and sanitizes URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null

  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    // Prevent javascript: in pathname (double-encoded)
    if (parsed.pathname.toLowerCase().includes('javascript')) {
      return null
    }

    return parsed.toString()
  } catch {
    // Invalid URL
    return null
  }
}

/**
 * Sanitize filename - removes dangerous characters from filenames
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return ''

  // Remove path traversal attempts
  let result = filename.replace(/\.\./g, '')

  // Remove dangerous characters
  result = result.replace(/[<>:"/\\|?*\x00-\x1f]/g, '')

  // Limit length
  result = result.slice(0, 255)

  return result.trim()
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') return null

  const trimmed = email.trim().toLowerCase()

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  if (!emailRegex.test(trimmed)) {
    return null
  }

  // Check for dangerous patterns
  if (containsDangerousPatterns(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * Sanitize phone number - keeps only digits and common phone characters
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return ''
  return phone.replace(/[^\d+\-() ]/g, '').slice(0, 20)
}

/**
 * Sanitize form data object recursively
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeInput(data) as T
}

/**
 * Create a safe error message from potentially unsafe input
 */
export function createSafeErrorMessage(message: unknown): string {
  if (typeof message !== 'string') {
    return 'An unexpected error occurred'
  }
  return escapeHtml(message.slice(0, 500))
}
