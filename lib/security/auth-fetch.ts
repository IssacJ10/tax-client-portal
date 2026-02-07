/**
 * Authenticated Fetch Utilities
 *
 * Dual-mode authentication:
 * - Production (jjelevateas.com): httpOnly cookies (more secure, shared parent domain)
 * - Development (App Engine, localhost): localStorage + Bearer token
 */

import { useLocalStorageAuth } from './environment';

/**
 * Get authentication headers for fetch requests
 * - Development: Returns Authorization header from localStorage
 * - Production: Returns empty (relies on httpOnly cookies)
 */
export function getAuthHeaders(): HeadersInit {
  // Only send Authorization header in development mode
  if (useLocalStorageAuth() && typeof window !== 'undefined') {
    const token = localStorage.getItem('tax-auth-token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }

  // Production uses httpOnly cookies - no Authorization header needed
  return {};
}

/**
 * Get fetch options for authenticated requests
 * Includes credentials: 'include' and auth headers
 */
export function getAuthFetchOptions(additionalHeaders?: HeadersInit): RequestInit {
  return {
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...additionalHeaders,
    },
  };
}

/**
 * Make an authenticated fetch request
 * Uses Bearer token auth which works across all browsers
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
 * Note: In production, this only checks localStorage backup.
 * The actual auth is via httpOnly cookies which can't be checked client-side.
 */
export function hasAuthToken(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('tax-auth-token');
  }

  return false;
}

/**
 * Check if we're using cookie-based auth (production)
 */
export { useLocalStorageAuth, useHttpOnlyCookies } from './environment';
