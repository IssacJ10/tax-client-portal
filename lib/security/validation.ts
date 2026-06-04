/**
 * Input Validation Utilities
 * Validates user input before sending to API
 */

import { z } from 'zod'
import { sanitizeInput, escapeHtml, containsSqlInjection, containsDangerousPatterns } from './sanitize'
import { isValidSin, isValidSinFormat, maskSin, redactSinFromObject } from './sin-protection'

/**
 * Common passwords that pass complexity requirements but are still weak
 * These passwords contain uppercase, lowercase, numbers, and special characters
 * but are commonly used and appear in password breach databases
 *
 * Source: Compiled from common password lists filtered for complexity requirements
 */
const COMMON_PASSWORDS = new Set([
  // Classic weak passwords with complexity
  'Password1!', 'Password123!', 'Password1@', 'Password12!',
  'Passw0rd!', 'Passw0rd1!', 'P@ssw0rd!', 'P@ssword1!',
  'Welcome1!', 'Welcome123!', 'Welcome1@', 'W3lcome1!',
  'Qwerty123!', 'Qwerty1!', 'Qwerty12!', 'Q1w2e3r4!',
  'Admin123!', 'Admin1!', 'Adm1n123!', 'Admin@123',
  'Letmein1!', 'Letmein123!', 'L3tm31n!', 'Letme1n!',
  'Monkey123!', 'Monkey1!', 'M0nkey1!', 'Monkey12!',
  'Dragon123!', 'Dragon1!', 'Drag0n1!', 'Dragon12!',
  'Master123!', 'Master1!', 'M@ster1!', 'Master12!',
  'Michael1!', 'Michael123!', 'M1chael!', 'Michael12!',
  'Shadow123!', 'Shadow1!', 'Sh@dow1!', 'Shadow12!',
  'Sunshine1!', 'Sunshine123!', 'Sunsh1ne!', 'Sunshine12!',
  'Princess1!', 'Princess123!', 'Pr1ncess!', 'Princess12!',
  'Football1!', 'Football123!', 'F00tball!', 'Football12!',
  'Baseball1!', 'Baseball123!', 'B@seball1!', 'Baseball12!',
  'Iloveyou1!', 'Iloveyou123!', 'Il0vey0u!', 'Iloveyou12!',
  'Trustno1!', 'Trustno123!', 'Trustn01!', 'Trustno12!',
  'Superman1!', 'Superman123!', 'Sup3rman!', 'Superman12!',
  'Batman123!', 'Batman1!', 'B@tman1!', 'Batman12!',
  'Starwars1!', 'Starwars123!', 'St@rwars!', 'Starwars12!',

  // Year-based patterns (common in corporate environments)
  'Summer2023!', 'Summer2024!', 'Summer2025!', 'Summer2026!',
  'Winter2023!', 'Winter2024!', 'Winter2025!', 'Winter2026!',
  'Spring2023!', 'Spring2024!', 'Spring2025!', 'Spring2026!',
  'Autumn2023!', 'Autumn2024!', 'Autumn2025!', 'Autumn2026!',
  'January2024!', 'February2024!', 'March2024!', 'April2024!',
  'Company123!', 'Company1!', 'C0mpany1!', 'Company12!',
  'Change123!', 'Changeme1!', 'Ch@ngeme!', 'Changeme123!',

  // Keyboard patterns with complexity
  'Qwerty123!', 'Asdfgh123!', 'Zxcvbn123!', 'Qazwsx123!',
  'Qwer1234!', 'Asdf1234!', 'Zxcv1234!', 'Qaz123!@#',
  '1Qaz2wsx!', '1Qaz!@#$', 'Qweasd123!', 'Asdqwe123!',

  // Number sequences with text
  'Abc12345!', 'Abcd1234!', 'Abcdef1!', 'Abc123!@#',
  'Test1234!', 'Test123!', 'T3st1234!', 'Testing1!',
  'Hello123!', 'Hello1!', 'H3llo123!', 'HelloWorld1!',

  // Canadian/Tax-specific (relevant to this application)
  'Canada123!', 'Canada1!', 'C@nada1!', 'Canada2024!',
  'Toronto123!', 'Toronto1!', 'T0ronto1!', 'Toronto2024!',
  'Ontario123!', 'Ontario1!', '0ntario1!', 'Ontario2024!',
  'Taxreturn1!', 'Taxfile123!', 'T@xes2024!', 'Filing123!',

  // Common name + number patterns
  'Jennifer1!', 'Jennifer123!', 'J3nnifer!', 'Jennifer12!',
  'Jessica123!', 'Jessica1!', 'J3ssica1!', 'Jessica12!',
  'Charlie123!', 'Charlie1!', 'Ch@rlie1!', 'Charlie12!',
  'Matthew123!', 'Matthew1!', 'M@tthew1!', 'Matthew12!',
  'Ashley123!', 'Ashley1!', '@shley1!', 'Ashley12!',
  'Andrew123!', 'Andrew1!', '@ndrew1!', 'Andrew12!',
  'Joshua123!', 'Joshua1!', 'J0shua1!', 'Joshua12!',
  'Daniel123!', 'Daniel1!', 'D@niel1!', 'Daniel12!',

  // Corporate/IT defaults
  'Temp1234!', 'Temp123!', 'T3mp1234!', 'Temporary1!',
  'Default123!', 'Default1!', 'D3fault1!', 'Default12!',
  'Initial123!', 'Initial1!', '1nitial1!', 'Initial12!',
  'Reset123!', 'Reset1!', 'R3set123!', 'Resetme1!',
  'NewUser123!', 'Newuser1!', 'N3wuser1!', 'Newuser12!',
])

/**
 * Check if a password is in the common passwords list
 * Uses case-insensitive comparison and checks common variations
 */
export function isCommonPassword(password: string): boolean {
  // Direct match (case-sensitive for exact matches)
  if (COMMON_PASSWORDS.has(password)) {
    return true
  }

  // Check with first letter capitalized (common pattern)
  const capitalized = password.charAt(0).toUpperCase() + password.slice(1)
  if (COMMON_PASSWORDS.has(capitalized)) {
    return true
  }

  // Check lowercase version against lowercase set entries
  const lowerPassword = password.toLowerCase()
  for (const commonPwd of COMMON_PASSWORDS) {
    if (commonPwd.toLowerCase() === lowerPassword) {
      return true
    }
  }

  // Check for common base patterns (without trailing special char/numbers)
  const basePatterns = [
    /^(password|passw0rd|p@ssword|p@ssw0rd)/i,
    /^(welcome|w3lcome)/i,
    /^(qwerty|asdfgh|zxcvbn)/i,
    /^(admin|adm1n)/i,
    /^(letmein|l3tm31n)/i,
    /^(changeme|ch@ngeme)/i,
    /^(test|t3st)ing?/i,
  ]

  for (const pattern of basePatterns) {
    if (pattern.test(password)) {
      return true
    }
  }

  return false
}

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

  /**
   * SIN (Social Insurance Number) validation with Luhn checksum
   * SECURITY: SIN is highly sensitive PII
   * - Use maskSin() for display
   * - Use redactSinFromObject() before logging
   * - Never log raw SIN values
   */
  sin: z
    .string()
    .refine(
      (val) => !val || val.trim() === '' || isValidSinFormat(val),
      'Please enter a valid SIN format (9 digits)'
    )
    .refine(
      (val) => !val || val.trim() === '' || isValidSin(val),
      'Please enter a valid Social Insurance Number'
    )
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
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .refine(
      (password) => !isCommonPassword(password),
      'This password is too common. Please choose a more unique password.'
    ),
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

/**
 * Re-export SIN protection utilities for convenience
 * SECURITY: Always use these when handling SIN data
 */
export {
  isValidSin,
  isValidSinFormat,
  maskSin,
  redactSinFromObject,
} from './sin-protection'
