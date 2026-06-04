/**
 * Input Sanitization Utilities
 * Protects against XSS attacks by sanitizing user input
 *
 * SECURITY: Patterns are designed to avoid ReDoS (Regular Expression Denial of Service)
 * - No nested quantifiers
 * - Input length limits before regex execution
 * - Simple, linear-time patterns
 */

// Maximum input length for regex processing (prevents ReDoS)
const MAX_REGEX_INPUT_LENGTH = 10000

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

/**
 * Truncate input for safe regex processing
 * Prevents ReDoS by limiting input length
 */
function truncateForRegex(str: string): string {
  if (str.length <= MAX_REGEX_INPUT_LENGTH) return str
  return str.slice(0, MAX_REGEX_INPUT_LENGTH)
}

/**
 * Dangerous patterns that could indicate XSS attempts
 * SECURITY: Patterns are simplified to avoid catastrophic backtracking
 * - No nested quantifiers like (a*)*
 * - No overlapping alternations
 * - Linear time complexity
 */
const DANGEROUS_PATTERNS = [
  // Script tags - simplified pattern (just detect opening tag)
  /<script\b/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /data:\s*text\/html/gi, // Dangerous data: URI
  /data:\s*application\/x/gi, // Dangerous data: URI
  /data:\s*image\/svg/gi, // SVG can contain scripts
  /vbscript:/gi,
  /expression\s*\(/gi,
]

/**
 * SQL injection patterns - simplified to avoid ReDoS
 * SECURITY: Using simpler patterns without unbounded quantifiers
 */
const SQL_INJECTION_PATTERNS = [
  // SQL comment injection
  /['"]\s*;\s*--/gi,
  // Boolean injection patterns with quotes (simplified)
  /['"]\s*OR\s+\d+\s*=\s*\d+/gi,
  /['"]\s*AND\s+\d+\s*=\s*\d+/gi,
  // UNION-based injection (simplified)
  /\bUNION\s+SELECT\b/gi,
  /\bUNION\s+ALL\s+SELECT\b/gi,
  // DROP/DELETE statements (simplified - just detect the dangerous keyword combo)
  /\bDROP\s+TABLE\b/gi,
  /\bDELETE\s+FROM\b/gi,
  /\bINSERT\s+INTO\b/gi,
  /\bUPDATE\s+\w+\s+SET\b/gi,
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
 * SECURITY: Uses ReDoS-safe patterns with length limits
 */
export function stripDangerousHtml(str: string): string {
  if (typeof str !== 'string') return ''

  // Limit input length for regex safety
  let result = str.length > MAX_REGEX_INPUT_LENGTH
    ? str.slice(0, MAX_REGEX_INPUT_LENGTH)
    : str

  // Remove script tags and their content using a safe two-step approach
  // Step 1: Remove complete script blocks (safe pattern without nested quantifiers)
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  // Step 2: Remove any remaining unclosed script tags
  result = result.replace(/<script[^>]*>/gi, '')

  // Remove event handlers (onclick, onload, etc.) - safe patterns
  result = result.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')

  // Remove javascript: and vbscript: protocols
  result = result.replace(/javascript:/gi, '')
  result = result.replace(/vbscript:/gi, '')

  // Only remove dangerous data: URIs (text/html, application/x, image/svg can contain executable code)
  // Don't remove plain "data:" as it breaks legitimate form field values
  result = result.replace(/data:\s*text\/html/gi, '')
  result = result.replace(/data:\s*application\/x-/gi, '')
  result = result.replace(/data:\s*image\/svg/gi, '')

  // Remove expression() in CSS - safe bounded pattern
  result = result.replace(/expression\s*\([^)]{0,500}\)/gi, '')

  // Remove dangerous attributes with expression - safe bounded pattern
  result = result.replace(/\s+(style|class)\s*=\s*"[^"]{0,500}expression[^"]{0,500}"/gi, '')
  result = result.replace(/\s+(style|class)\s*=\s*'[^']{0,500}expression[^']{0,500}'/gi, '')

  return result
}

/**
 * Check if string contains dangerous XSS patterns
 * SECURITY: Truncates input to prevent ReDoS
 */
export function containsDangerousPatterns(str: string): boolean {
  if (typeof str !== 'string') return false

  // Truncate for regex safety
  const safeStr = truncateForRegex(str)

  // Reset lastIndex for all patterns (global flag can cause issues)
  DANGEROUS_PATTERNS.forEach(p => { p.lastIndex = 0 })

  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(safeStr))
}

/**
 * Check if string contains SQL injection patterns
 * SECURITY: Truncates input to prevent ReDoS
 */
export function containsSqlInjection(str: string): boolean {
  if (typeof str !== 'string') return false

  // Truncate for regex safety
  const safeStr = truncateForRegex(str)

  // Reset lastIndex for all patterns (global flag can cause issues)
  SQL_INJECTION_PATTERNS.forEach(p => { p.lastIndex = 0 })

  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(safeStr))
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
