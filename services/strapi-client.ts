// tax-client-portal/services/strapi-client.ts

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { sanitizeInput, sanitizeFormData, containsDangerousPatterns, containsSqlInjection } from "@/lib/security/sanitize";
import { getCsrfHeaders } from "@/lib/security/csrf";
import { validateFileUpload } from "@/lib/security/validation";
import { logError } from "@/services/error-logging-service";
import { useLocalStorageAuth } from "@/lib/security/environment";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

// Max retry attempts for failed requests
const MAX_RETRIES = 3;

// Retry delay base (exponential backoff)
const RETRY_DELAY_BASE = 1000;

/**
 * Security-enhanced Axios client
 * Features:
 * - Automatic JWT injection via httpOnly cookies
 * - Request/response sanitization
 * - CSRF protection
 * - Rate limiting awareness
 * - Auto-logout on 401
 * - Request timeout
 * - Retry logic with exponential backoff
 */
export const strapiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: REQUEST_TIMEOUT,
  // CRITICAL: Enable credentials for httpOnly cookie authentication
  withCredentials: true,
});

/**
 * Request retry queue for handling rate limits
 */
const pendingRetries = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Generate a unique request key for retry tracking
 */
function getRequestKey(config: AxiosRequestConfig): string {
  return `${config.method}:${config.url}`;
}

/**
 * Check if request data contains dangerous patterns
 */
function validateRequestData(data: unknown): { safe: boolean; error?: string } {
  if (data === null || data === undefined) {
    return { safe: true };
  }

  const checkValue = (value: unknown, path: string = ''): { safe: boolean; error?: string } => {
    if (typeof value === 'string') {
      if (containsDangerousPatterns(value)) {
        return { safe: false, error: `Potentially dangerous content detected in ${path || 'input'}` };
      }
      if (containsSqlInjection(value)) {
        return { safe: false, error: `Invalid input detected in ${path || 'input'}` };
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = checkValue(value[i], `${path}[${i}]`);
        if (!result.safe) return result;
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        const result = checkValue(val, path ? `${path}.${key}` : key);
        if (!result.safe) return result;
      }
    }
    return { safe: true };
  };

  return checkValue(data);
}

// Security Step 1: Request interceptor - sanitization, CSRF, auth
// Dual-mode authentication:
// - Production (jjelevateas.com): httpOnly cookies (more secure, shared parent domain)
// - Development (App Engine, localhost): localStorage + Bearer token
strapiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      // Only add Authorization header in development mode
      // Production uses httpOnly cookies which are sent automatically via withCredentials
      if (useLocalStorageAuth()) {
        const token = localStorage.getItem("tax-auth-token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
        const csrfHeaders = getCsrfHeaders();
        Object.assign(config.headers, csrfHeaders);
      }
    }

    // Validate request data for dangerous patterns
    if (config.data) {
      const validation = validateRequestData(config.data);
      if (!validation.safe) {
        return Promise.reject(new Error(validation.error || 'Invalid request data'));
      }

      // Sanitize request data (skip for FormData)
      if (!(config.data instanceof FormData)) {
        config.data = sanitizeInput(config.data);
      }
    }

    // Add request timestamp for timeout tracking
    (config as any).metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Security Step 2: Response interceptor - Error handling, auto-logout, retry logic
strapiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

    // Handle 401 Unauthorized
    // IMPORTANT: Do NOT auto-redirect here - let session-provider handle session management
    // This prevents race conditions where a single failed request (e.g., 2025 filings query
    // that runs before token is loaded) causes logout even though user is authenticated
    if (error.response?.status === 401) {
      // Just reject the error - let the calling code and session-provider decide what to do
      return Promise.reject(error);
    }

    // Handle 403 Forbidden - Access denied
    if (error.response?.status === 403) {
      return Promise.reject(new Error('You do not have permission to access this resource'));
    }

    // Handle 429 Too Many Requests - Rate limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return Promise.reject(new Error(`Too many requests. Please wait ${retryAfter || 60} seconds.`));
    }

    // Handle 400 Bad Request - Validation errors from Strapi
    if (error.response?.status === 400) {
      const responseData = error.response.data as any;

      // Strapi returns validation errors in error.message or error.details.errors
      let validationMessage = 'Validation failed';

      if (responseData?.error?.message) {
        validationMessage = responseData.error.message;
      } else if (responseData?.error?.details?.errors?.length > 0) {
        // Extract field-specific errors
        const fieldErrors = responseData.error.details.errors
          .map((e: any) => {
            const field = e.path?.join('.') || 'field';
            return `${field}: ${e.message}`;
          })
          .join('; ');
        validationMessage = fieldErrors || validationMessage;
      } else if (responseData?.message) {
        validationMessage = responseData.message;
      }

      // Log validation error to Strapi
      logError({
        errorType: "VALIDATION",
        errorMessage: validationMessage,
        metadata: {
          url: config?.url,
          method: config?.method,
          statusCode: 400,
          responseData: responseData?.error,
        },
      });

      return Promise.reject(new Error(validationMessage));
    }

    // Handle network errors with retry logic
    if (!error.response && config && !config._retryCount) {
      const requestKey = getRequestKey(config);
      const retryInfo = pendingRetries.get(requestKey) || { count: 0, lastAttempt: 0 };

      if (retryInfo.count < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryInfo.count);
        retryInfo.count++;
        retryInfo.lastAttempt = Date.now();
        pendingRetries.set(requestKey, retryInfo);

        await new Promise((resolve) => setTimeout(resolve, delay));
        config._retryCount = retryInfo.count;

        return strapiClient.request(config);
      } else {
        pendingRetries.delete(requestKey);
      }
    }

    // Clean error message (don't expose internal details)
    const cleanError = new Error(
      error.response?.status === 500
        ? 'Server error. Please try again later.'
        : error.message || 'An error occurred'
    );

    // Log server/network errors
    logError({
      errorType: error.response ? "SAVE" : "NETWORK",
      errorMessage: cleanError.message,
      errorStack: error.stack,
      metadata: {
        url: config?.url,
        method: config?.method,
        statusCode: error.response?.status,
        originalMessage: error.message,
      },
    });

    return Promise.reject(cleanError);
  }
);

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface UploadedFile {
  id: number;
  documentId: string;
  name: string;
  url: string;
  mime: string;
  size: number;
}

/**
 * Allowed file types for upload
 */
const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'];
const MAX_FILE_SIZE_MB = 10;

/**
 * Upload a file to Strapi's media library
 * Includes security validations for file type, size, and content
 * Uses httpOnly cookies for authentication
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  // Validate file
  const validation = validateFileUpload(file, {
    maxSizeMB: MAX_FILE_SIZE_MB,
    allowedTypes: ALLOWED_UPLOAD_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  });

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  // Sanitize filename
  const sanitizedName = file.name
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove dangerous chars
    .slice(0, 255); // Limit length

  // Create FormData with sanitized file
  const formData = new FormData();
  const sanitizedFile = new File([file], sanitizedName, { type: file.type });
  formData.append('files', sanitizedFile);

  // Get token from localStorage for auth header (development mode only)
  const authToken = useLocalStorageAuth() && typeof window !== 'undefined'
    ? localStorage.getItem('tax-auth-token')
    : null;

  try {
    const response = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include', // Sends httpOnly cookies (works in production)
      headers: {
        // Authorization header for development, cookies for production
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...getCsrfHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 413) {
        throw new Error('File is too large');
      }
      if (response.status === 429) {
        throw new Error('Too many uploads. Please wait before trying again.');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to upload file');
    }

    const uploadedFiles = await response.json();

    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error('No file was uploaded');
    }

    const uploaded = uploadedFiles[0];

    // Validate response data
    if (!uploaded.id || !uploaded.url) {
      throw new Error('Invalid upload response');
    }

    return {
      id: uploaded.id,
      documentId: uploaded.documentId || String(uploaded.id),
      name: uploaded.name,
      url: uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`,
      mime: uploaded.mime,
      size: uploaded.size,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Upload failed. Please try again.');
  }
}

/**
 * Safe API request wrapper with additional security checks
 */
export async function safeRequest<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  // Sanitize data before sending
  const sanitizedData = data ? sanitizeFormData(data as Record<string, unknown>) : undefined;

  try {
    const response = await strapiClient.request<T>({
      method,
      url,
      data: sanitizedData,
      ...config,
    });

    return response.data;
  } catch (error) {
    // Re-throw with clean message
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Request failed');
  }
}
