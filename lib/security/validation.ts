/**
 * Input Validation Utilities
 * Validates user input before sending to API
 */

import { z } from 'zod'
import { sanitizeInput, escapeHtml, containsSqlInjection, containsDangerousPatterns } from './sanitize'

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  // Names: letters, spaces, hyphens, apostrophes
  name: /^[a-zA-Z\s\-']{2,100}$/,

  // Email: standard email format
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Phone: digits, spaces, dashes, parentheses, plus sign
  phone: /^[+]?[\d\s\-()]{7,20}$/,

  // SIN (Social Insurance Number): 9 digits, optionally with dashes
  sin: /^(\d{3}[-\s]?\d{3}[-\s]?\d{3}|\d{9})$/,

  // Postal code (Canadian): A1A 1A1 format
  postalCode: /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/,

  // Business Number: 9 or 15 digits
  businessNumber: /^\d{9}(\w{6})?$/,

  // Date: YYYY-MM-DD format
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,

  // Currency: optional negative, digits with optional decimal
  currency: /^-?\d{1,12}(\.\d{1,2})?$/,

  // UUID: standard UUID format
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // Alphanumeric with common punctuation
  alphanumeric: /^[a-zA-Z0-9\s.,!?'"()-]+$/,
}

/**
 * Zod schemas for common validations
 */
export const ValidationSchemas = {
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(ValidationPatterns.name, 'Name contains invalid characters'),

  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),

  phone: z
    .string()
    .regex(ValidationPatterns.phone, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),

  sin: z
    .string()
    .regex(ValidationPatterns.sin, 'Please enter a valid SIN (9 digits)')
    .optional()
    .or(z.literal('')),

  postalCode: z
    .string()
    .regex(ValidationPatterns.postalCode, 'Please enter a valid Canadian postal code')
    .optional()
    .or(z.literal('')),

  businessNumber: z
    .string()
    .regex(ValidationPatterns.businessNumber, 'Please enter a valid business number')
    .optional()
    .or(z.literal('')),

  date: z
    .string()
    .regex(ValidationPatterns.date, 'Please enter a valid date (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),

  currency: z
    .string()
    .regex(ValidationPatterns.currency, 'Please enter a valid amount')
    .optional()
    .or(z.literal('')),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
}

/**
 * Validate a single field
 */
export function validateField(
  value: unknown,
  schema: z.ZodSchema
): { valid: boolean; error?: string; sanitizedValue: unknown } {
  try {
    // Sanitize before validation
    const sanitized = sanitizeInput(value)
    const result = schema.safeParse(sanitized)

    if (result.success) {
      return { valid: true, sanitizedValue: result.data }
    }

    return {
      valid: false,
      error: result.error.errors[0]?.message || 'Invalid value',
      sanitizedValue: sanitized,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Validation error',
      sanitizedValue: value,
    }
  }
}

/**
 * Validate form data against a schema
 */
export function validateFormData<T>(
  data: Record<string, unknown>,
  schema: z.ZodSchema<T>
): { valid: boolean; errors: Record<string, string>; sanitizedData: T | null } {
  try {
    // Sanitize all input
    const sanitized = sanitizeInput(data) as Record<string, unknown>

    // Check for SQL injection attempts
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && containsSqlInjection(value)) {
        return {
          valid: false,
          errors: { [key]: 'Input contains potentially dangerous content' },
          sanitizedData: null,
        }
      }
    }

    // Validate with Zod
    const result = schema.safeParse(sanitized)

    if (result.success) {
      return { valid: true, errors: {}, sanitizedData: result.data }
    }

    // Extract errors
    const errors: Record<string, string> = {}
    for (const error of result.error.errors) {
      const path = error.path.join('.')
      errors[path] = error.message
    }

    return { valid: false, errors, sanitizedData: null }
  } catch (error) {
    return {
      valid: false,
      errors: { _form: 'Validation error occurred' },
      sanitizedData: null,
    }
  }
}

/**
 * Check if input is safe (no XSS or SQL injection patterns)
 */
export function isInputSafe(value: unknown): boolean {
  if (typeof value !== 'string') return true

  return !containsDangerousPatterns(value) && !containsSqlInjection(value)
}

/**
 * Validate API response data
 */
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { valid: boolean; data: T | null; error?: string } {
  try {
    const result = schema.safeParse(data)

    if (result.success) {
      return { valid: true, data: result.data }
    }

    return {
      valid: false,
      data: null,
      error: result.error.errors[0]?.message || 'Invalid response data',
    }
  } catch {
    return { valid: false, data: null, error: 'Response validation failed' }
  }
}

/**
 * Rate limit check for client-side operations
 */
class ClientRateLimiter {
  private operations: Map<string, number[]> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  check(operationKey: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const timestamps = this.operations.get(operationKey) || []

    // Filter out old timestamps
    const recentTimestamps = timestamps.filter((ts) => now - ts < this.windowMs)

    if (recentTimestamps.length >= this.maxRequests) {
      const oldestTimestamp = recentTimestamps[0]
      const retryAfter = this.windowMs - (now - oldestTimestamp)
      return { allowed: false, retryAfter }
    }

    // Add current timestamp
    recentTimestamps.push(now)
    this.operations.set(operationKey, recentTimestamps)

    return { allowed: true }
  }

  reset(operationKey: string): void {
    this.operations.delete(operationKey)
  }
}

export const clientRateLimiter = new ClientRateLimiter()

/**
 * Validate and sanitize file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'],
  } = options

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' }
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File extension not allowed' }
  }

  // Check for suspicious filename patterns
  if (file.name.includes('..') || /[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    return { valid: false, error: 'Invalid filename' }
  }

  return { valid: true }
}

/**
 * Create a safe display string from user input
 */
export function safeDisplayString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return ''
  }

  const escaped = escapeHtml(input)
  return escaped.slice(0, maxLength)
}
