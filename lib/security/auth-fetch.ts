/**
 * Authenticated Fetch Utilities
 *
 * Provides consistent authentication handling for fetch calls:
 * - Production (HTTPS): Uses httpOnly cookies via credentials: 'include'
 * - Development (HTTP): Uses localStorage token as Authorization header fallback
 *   (because sameSite='lax' cookies don't work on cross-origin fetch)
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get authentication headers for fetch requests
 * In development, returns Authorization header from localStorage
 * In production, returns empty object (cookies handle auth)
 */
export function getAuthHeaders(): HeadersInit {
  if (isProduction) {
    return {};
  }

  // Development: use localStorage token
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tax-auth-token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }

  return {};
}

/**
 * Get fetch options for authenticated requests
 * Includes credentials: 'include' for cookies and auth headers for development
 */
export function getAuthFetchOptions(additionalHeaders?: HeadersInit): RequestInit {
  return {
    credentials: 'include', // Sends httpOnly cookies (works in production)
    headers: {
      ...getAuthHeaders(),
      ...additionalHeaders,
    },
  };
}

/**
 * Make an authenticated fetch request
 * Automatically handles auth for both development and production
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { headers, ...restOptions } = options;

  return fetch(url, {
    ...restOptions,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(headers || {}),
    },
  });
}

/**
 * Check if user has an auth token available
 * In development: checks localStorage
 * In production: always returns true (assumes cookies are present if authenticated)
 */
export function hasAuthToken(): boolean {
  if (isProduction) {
    // In production, we can't check httpOnly cookies from JS
    // Return true and let the server validate
    return true;
  }

  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('tax-auth-token');
  }

  return false;
}
