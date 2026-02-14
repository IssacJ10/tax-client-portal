/**
 * Environment Detection Utility
 *
 * Determines whether we're in production (jjelevateas.com domain) or development.
 * This affects authentication strategy:
 * - Production: httpOnly cookies (more secure, works with shared parent domain)
 * - Development: localStorage + Bearer token (works across different origins)
 */

// Production domains
const PRODUCTION_DOMAINS = [
  'jjelevateas.com',
  'www.jjelevateas.com',
  'portal.jjelevateas.com',
];

/**
 * Check if we're running in production environment
 * Production = running on jjelevateas.com domain
 */
export function isProductionDomain(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check environment variable
    return process.env.APP_ENVIRONMENT === 'production';
  }

  const hostname = window.location.hostname;
  return PRODUCTION_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain.replace('www.', ''))
  );
}

/**
 * Check if we should use httpOnly cookies for auth
 * Only use cookies in production where we have a shared parent domain
 */
export function useHttpOnlyCookies(): boolean {
  return isProductionDomain();
}

/**
 * Check if we should use localStorage tokens for auth
 * Always use localStorage + Bearer token for auth across all environments.
 * httpOnly cookies are unreliable behind App Engine's HTTPS-terminating load balancer.
 */
export function useLocalStorageAuth(): boolean {
  return true;
}
