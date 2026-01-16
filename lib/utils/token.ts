/**
 * JWT Token Utility Functions
 * Provides secure token management without external dependencies
 */

/**
 * Decode JWT token payload
 */
export function decodeJWT(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

/**
 * Check if JWT token has expired
 */
export function isTokenExpired(token: string): boolean {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }
    return Date.now() >= payload.exp * 1000;
}

/**
 * Get token expiration timestamp (in milliseconds)
 */
export function getTokenExpiry(token: string): number | null {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
        return null;
    }
    return payload.exp * 1000;
}

/**
 * Check if token is expiring soon (within bufferMs milliseconds)
 */
export function isTokenExpiringSoon(token: string, bufferMs: number = 5 * 60 * 1000): boolean {
    const expiry = getTokenExpiry(token);
    if (!expiry) {
        return true;
    }
    return Date.now() >= expiry - bufferMs;
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiry(token: string): number | null {
    const expiry = getTokenExpiry(token);
    if (!expiry) {
        return null;
    }
    return Math.max(0, expiry - Date.now());
}
