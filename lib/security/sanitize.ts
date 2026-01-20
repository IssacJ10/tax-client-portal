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
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
]

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g,
  /['"]\s*;\s*--/gi,
  /['"]\s*OR\s*['"]/gi,
  /['"]\s*AND\s*['"]/gi,
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
  result = result.replace(/data:/gi, '')

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
 * Sanitize user input - main function to use throughout the app
 * Removes dangerous content and escapes HTML entities
 */
export function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) return input

  if (typeof input === 'string') {
    // First strip dangerous HTML
    let result = stripDangerousHtml(input)
    // Then escape remaining HTML entities
    result = escapeHtml(result)
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
      // Also sanitize keys to prevent prototype pollution
      const sanitizedKey = typeof key === 'string' ? escapeHtml(key) : key
      if (sanitizedKey === '__proto__' || sanitizedKey === 'constructor' || sanitizedKey === 'prototype') {
        continue // Skip dangerous keys
      }
      sanitized[sanitizedKey] = sanitizeInput(value)
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
