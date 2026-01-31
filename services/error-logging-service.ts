// tax-client-portal/services/error-logging-service.ts

/**
 * Error Logging Service
 * Sends errors to Strapi for debugging and monitoring
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export type ErrorType = "VALIDATION" | "SAVE" | "NETWORK" | "AUTH" | "UNKNOWN";
export type FilingType = "INDIVIDUAL" | "CORPORATE" | "TRUST" | "UNKNOWN";

export interface ErrorLogData {
  filingId?: string;
  filingType?: FilingType;
  phase?: string;
  section?: string;
  questionId?: string;
  errorType?: ErrorType;
  errorMessage: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an error to Strapi
 * This is a fire-and-forget operation - it won't throw or block
 */
export async function logError(data: ErrorLogData): Promise<void> {
  try {
    // Don't log in development if not connected to Strapi
    if (typeof window === "undefined") return;

    // Enrich with browser context
    const enrichedData = {
      ...data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getUserId(),
      errorType: data.errorType || "UNKNOWN",
      filingType: data.filingType || "UNKNOWN",
    };

    // Fire and forget - don't await or handle errors
    fetch(`${STRAPI_URL}/api/error-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: enrichedData }),
    }).catch(() => {
      // Silently fail - we don't want error logging to cause more errors
      console.warn("[ErrorLogging] Failed to log error to server");
    });
  } catch {
    // Silently fail
    console.warn("[ErrorLogging] Failed to prepare error log");
  }
}

/**
 * Get user ID from localStorage if available
 */
function getUserId(): string | undefined {
  try {
    const userStr = localStorage.getItem("tax-auth-user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id?.toString() || user.documentId;
    }
  } catch {
    // Ignore
  }
  return undefined;
}

/**
 * Helper to log validation errors
 */
export function logValidationError(
  message: string,
  context: {
    filingId?: string;
    filingType?: FilingType;
    phase?: string;
    section?: string;
    questionId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  logError({
    ...context,
    errorType: "VALIDATION",
    errorMessage: message,
  });
}

/**
 * Helper to log save errors
 */
export function logSaveError(
  message: string,
  context: {
    filingId?: string;
    filingType?: FilingType;
    phase?: string;
    section?: string;
    metadata?: Record<string, unknown>;
  },
  error?: Error
): void {
  logError({
    ...context,
    errorType: "SAVE",
    errorMessage: message,
    errorStack: error?.stack,
  });
}

/**
 * Helper to log network errors
 */
export function logNetworkError(
  message: string,
  context: {
    filingId?: string;
    metadata?: Record<string, unknown>;
  },
  error?: Error
): void {
  logError({
    ...context,
    errorType: "NETWORK",
    errorMessage: message,
    errorStack: error?.stack,
  });
}

/**
 * Helper to log auth errors
 */
export function logAuthError(
  message: string,
  metadata?: Record<string, unknown>
): void {
  logError({
    errorType: "AUTH",
    errorMessage: message,
    metadata,
  });
}

/**
 * Global error handler for unhandled errors
 * Call this in your app's error boundary or _app.tsx
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === "undefined") return;

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    logError({
      errorType: "UNKNOWN",
      errorMessage: event.reason?.message || "Unhandled Promise Rejection",
      errorStack: event.reason?.stack,
      metadata: {
        type: "unhandledrejection",
      },
    });
  });

  // Handle uncaught errors
  window.addEventListener("error", (event) => {
    logError({
      errorType: "UNKNOWN",
      errorMessage: event.message || "Uncaught Error",
      errorStack: event.error?.stack,
      metadata: {
        type: "error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
