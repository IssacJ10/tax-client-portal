'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { extendCsrfToken, clearCsrfToken } from '@/lib/security/csrf';
import { tokenCache } from '@/lib/security/secure-storage';
import { useSWRConfig } from 'swr';
import { useLocalStorageAuth } from '@/lib/security/environment';

// --- CONFIGURATION ---
const IDLE_WARNING_MS = 13 * 60 * 1000;  // Warn after 13 minutes of inactivity
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // Logout after 15 minutes of inactivity
const CHECK_INTERVAL_MS = 60 * 1000;     // Check every 1 minute
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Verify session with server every 5 mins

// Strapi API URL
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface User {
    id: number;
    username: string;
    email: string;
    provider?: string;
    firstName?: string;
    lastName?: string;
    confirmed: boolean;
    blocked: boolean;
    createdAt: string;
    updatedAt: string;
    hasConsentedToTerms?: boolean;
    consentDate?: string;
    role?: {
        name: string;
        type: string;
    };
}

interface SessionContextType {
    user: User | null;
    token: string | null; // Kept for backwards compatibility, but deprecated
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: (reason?: string) => void;
    updateUser: (user: User) => void;
    refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
    updateUser: () => { },
    refreshSession: async () => false,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null); // Kept for backwards compatibility
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showIdleWarning, setShowIdleWarning] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const { cache, mutate: globalMutate } = useSWRConfig();

    // Activity Tracking Refs (Refs prevent re-renders on every mouse move)
    const lastActivityRef = useRef<number>(Date.now());
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);

    // Cross-tab logout synchronization
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
    const isLoggingOutRef = useRef(false); // Prevent logout loops
    const currentUserIdRef = useRef<number | undefined>(undefined); // Track current user ID for cross-tab sync

    /**
     * Check session validity with server
     *
     * Dual-mode authentication:
     * - Production (jjelevateas.com): httpOnly cookies (more secure, shared parent domain)
     * - Development (App Engine, localhost): localStorage + Bearer token
     */
    const checkSession = useCallback(async (): Promise<{ authenticated: boolean; user: User | null }> => {
        try {
            // Build headers
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            // Only add Authorization header in development mode
            // Production uses httpOnly cookies sent automatically via credentials: 'include'
            if (useLocalStorageAuth()) {
                const storedToken = localStorage.getItem('tax-auth-token');
                if (storedToken) {
                    headers['Authorization'] = `Bearer ${storedToken}`;
                }
            }

            const res = await fetch(`${STRAPI_URL}/api/users/me`, {
                method: 'GET',
                credentials: 'include', // Send httpOnly cookies (production) or as backup (dev)
                headers,
            });

            if (res.ok) {
                const userData = await res.json();
                if (userData && userData.id) {
                    return { authenticated: true, user: userData };
                }
            }

            // Not authenticated - clear stale token (development mode only)
            if (useLocalStorageAuth()) {
                localStorage.removeItem('tax-auth-token');
            }
            return { authenticated: false, user: null };
        } catch {
            return { authenticated: false, user: null };
        }
    }, []);

    /**
     * Terminate Session / Logout
     * IMPORTANT: Preserves filing backup data to prevent data loss
     * SECURITY: Aggressively clears ALL cached data to prevent leakage between users
     * SYNC: Broadcasts logout to all other tabs via BroadcastChannel/localStorage
     */
    const logout = useCallback(async (reason?: string, fromBroadcast: boolean = false) => {
        // Prevent logout loops when receiving broadcast from another tab
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        // Broadcast logout to ALL other tabs (regardless of which user)
        // Only one user can be logged in at a time per browser
        if (!fromBroadcast) {
            try {
                // Method 1: BroadcastChannel API (modern browsers)
                if (broadcastChannelRef.current) {
                    broadcastChannelRef.current.postMessage({ type: 'logout', reason });
                }
                // Method 2: localStorage event (fallback for older browsers/cross-origin)
                localStorage.setItem('auth-logout-event', JSON.stringify({ timestamp: Date.now() }));
            } catch {
                // Silent fail - cross-tab sync is best effort
            }
        }
        // Check if this logout is because a DIFFERENT user logged in
        // In that case, we should NOT clear storage/cookies - they belong to the new user!
        const isOtherUserLogin = fromBroadcast && reason?.includes('Another user logged in');

        // Only perform destructive cleanup if this is a NORMAL logout
        // (not triggered by another user logging in)
        if (!isOtherUserLogin) {
            // 1. CRITICAL: Clear SWR cache to prevent data leakage between users
            try {
                if (cache && typeof cache.keys === 'function') {
                    const keys = Array.from(cache.keys());
                    keys.forEach((key: string) => {
                        globalMutate(key, undefined, { revalidate: false });
                    });
                }
                await globalMutate(() => true, undefined, { revalidate: false });
            } catch {
                // Silent fail - cache clearing is best effort
            }

            // 2. PRESERVE any filing backups before clearing storage
            const filingBackups: Record<string, string> = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('filing-backup-')) {
                        const backupData = localStorage.getItem(key);
                        if (backupData) {
                            filingBackups[key] = backupData;
                        }
                    }
                }
            } catch {
                // Silent fail - backup preservation is best effort
            }

            // 3. AGGRESSIVE: Clear ALL localStorage except filing backups
            try {
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && !key.startsWith('filing-backup-')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                });
                clearCsrfToken();
                tokenCache.clear();
            } catch {
                // Silent fail - storage clearing is best effort
            }

            // 4. AGGRESSIVE: Clear ALL sessionStorage
            try {
                const logoutReasonToSet = reason;
                sessionStorage.clear();
                if (logoutReasonToSet) {
                    sessionStorage.setItem('logout-reason', logoutReasonToSet);
                }
            } catch {
                // Silent fail - session storage clearing is best effort
            }

            // 5. Restore filing backups
            try {
                Object.entries(filingBackups).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            } catch {
                // Silent fail - backup restoration is best effort
            }

            // 6. Clear browser caches (service worker caches if any)
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
            } catch {
                // Silent fail - cache clearing is best effort
            }

            // 7. Call server to revoke token and clear httpOnly cookies
            try {
                await fetch(`${STRAPI_URL}/api/token/revoke`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch {
                // Silent fail - server logout is best effort
            }
        } else {
            // For "other user login" scenario, just clear SWR cache for this tab
            // (don't touch localStorage/cookies - they belong to new user)
            try {
                if (cache && typeof cache.keys === 'function') {
                    const keys = Array.from(cache.keys());
                    keys.forEach((key: string) => {
                        globalMutate(key, undefined, { revalidate: false });
                    });
                }
                await globalMutate(() => true, undefined, { revalidate: false });
            } catch {
                // Silent fail
            }
        }

        // 8. Clear React state before redirect
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);

        // 9. Force full browser reload
        // Using replace to prevent back button from returning to authenticated state
        if (isOtherUserLogin) {
            // Another user logged in - redirect to login page (not home)
            // Set a flag to prevent auto-authentication on the login page
            // This flag is checked by initSession to skip auto-login
            try {
                sessionStorage.setItem('auth-kicked-out', 'true');
            } catch {
                // Silent fail
            }
            window.location.replace('/auth/login');
        } else {
            // Normal logout - go to home page
            window.location.replace('/');
        }
    }, [cache, globalMutate]);

    /**
     * Login Handler
     * Called after successful authentication
     *
     * Dual-mode authentication:
     * - Production: httpOnly cookies handle auth (token stored as backup only)
     * - Development: localStorage token used for auth
     */
    const login = useCallback((newToken: string, newUser: User) => {
        // Reset logout flag to allow future logouts
        isLoggingOutRef.current = false;

        // SECURITY: Broadcast login event to other tabs
        // If a DIFFERENT user logs in, other tabs with the old user should logout
        try {
            // Method 1: BroadcastChannel API
            if (broadcastChannelRef.current && newUser.id) {
                broadcastChannelRef.current.postMessage({
                    type: 'login',
                    userId: newUser.id,
                    timestamp: Date.now()
                });
            }
            // Method 2: localStorage event (fallback)
            if (newUser.id) {
                localStorage.setItem('auth-login-event', JSON.stringify({
                    userId: newUser.id,
                    timestamp: Date.now()
                }));
            }
        } catch {
            // Silent fail - cross-tab sync is best effort
        }

        // Store user info in localStorage for display (NOT sensitive - just name/email)
        localStorage.setItem('tax-auth-user', JSON.stringify(newUser));

        // Store token in localStorage
        // - Development: Used for auth via Authorization header
        // - Production: Stored as backup (primary auth is via httpOnly cookies)
        if (newToken) {
            localStorage.setItem('tax-auth-token', newToken);
        }

        // Store token in state for backwards compatibility with existing components
        setToken(newToken);
        setUser(newUser);
        setIsAuthenticated(true);
        lastActivityRef.current = Date.now();
    }, []);

    /**
     * Activity Monitor
     * Also extends CSRF token to prevent expiry during active sessions
     */
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        extendCsrfToken();
    }, []);

    /**
     * Update User Handler
     */
    const updateUser = useCallback((updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('tax-auth-user', JSON.stringify(updatedUser));
    }, []);

    // Activity tracking events
    useEffect(() => {
        const events = [
            'mousedown',
            'keydown',
            'keypress',
            'input',
            'change',
            'scroll',
            'touchstart',
            'touchmove',
            'click',
            'focus',
            'blur'
        ];

        let debounceTimer: NodeJS.Timeout | null = null;
        const handleActivity = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateActivity();
            }, 500);
        };

        if (isAuthenticated) {
            events.forEach(event => {
                window.addEventListener(event, handleActivity, { passive: true, capture: true });
            });
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity, true);
            });
        };
    }, [isAuthenticated, updateActivity]);

    /**
     * Manual Session Refresh
     * Calls the refresh endpoint to get a new access token
     *
     * Dual-mode: Development uses Authorization header, production uses cookies
     */
    const refreshSession = useCallback(async (): Promise<boolean> => {
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            // Only add Authorization header in development mode
            if (useLocalStorageAuth()) {
                const storedToken = localStorage.getItem('tax-auth-token');
                if (storedToken) {
                    headers['Authorization'] = `Bearer ${storedToken}`;
                }
            }

            const res = await fetch(`${STRAPI_URL}/api/token/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers,
            });

            if (res.ok) {
                const data = await res.json();
                // Update token in state and localStorage (for both modes)
                if (data.jwt) {
                    setToken(data.jwt);
                    localStorage.setItem('tax-auth-token', data.jwt);
                }
                lastActivityRef.current = Date.now();
                return true;
            } else if (res.status === 401 || res.status === 403) {
                toast({
                    variant: 'destructive',
                    title: 'Session Expired',
                    description: 'Your session has expired. Please sign in again.',
                });
                logout('Refresh token expired');
                return false;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }, [logout, toast]);

    // Track if warning is showing (use ref to avoid effect restart)
    const showIdleWarningRef = useRef(false);

    // Keep ref in sync with state
    useEffect(() => {
        showIdleWarningRef.current = showIdleWarning;
    }, [showIdleWarning]);

    // Keep user ID ref in sync for cross-tab logout
    useEffect(() => {
        currentUserIdRef.current = user?.id;
    }, [user?.id]);

    /**
     * Idle & Session Check Loop
     * NOTE: showIdleWarning is NOT in dependency array to prevent interval restart
     */
    useEffect(() => {
        if (!isAuthenticated) return;

        // Idle timeout check
        checkIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            // Check Idle Timeout - MUST LOGOUT
            if (timeSinceLastActivity > IDLE_TIMEOUT_MS) {
                // Clear interval immediately to prevent multiple logout calls
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                    checkIntervalRef.current = null;
                }
                logout('You have been logged out due to inactivity.');
                return;
            }

            // Show Warning (use ref to check current state without causing effect restart)
            if (timeSinceLastActivity > IDLE_WARNING_MS && !showIdleWarningRef.current) {
                setShowIdleWarning(true);
            }
        }, CHECK_INTERVAL_MS);

        // Periodic session validation with server
        sessionCheckRef.current = setInterval(async () => {
            const { authenticated } = await checkSession();
            if (!authenticated) {
                toast({
                    variant: 'destructive',
                    title: 'Session Expired',
                    description: 'Your session has expired. Please sign in again.',
                });
                logout('Session expired');
            } else {
                // Proactively refresh to keep session alive
                await refreshSession();
            }
        }, SESSION_CHECK_INTERVAL_MS);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            if (sessionCheckRef.current) {
                clearInterval(sessionCheckRef.current);
            }
        };
    }, [isAuthenticated, logout, checkSession, refreshSession, toast]);

    /**
     * Initialization Logic
     * Check authentication via httpOnly cookie on mount
     */
    useEffect(() => {
        const initSession = async () => {
            // Check if this tab was kicked out by another user logging in
            // If so, don't auto-authenticate - show login page instead
            let wasKickedOut = false;
            try {
                wasKickedOut = sessionStorage.getItem('auth-kicked-out') === 'true';
                if (wasKickedOut) {
                    // Clear the flag so user can login fresh
                    sessionStorage.removeItem('auth-kicked-out');
                }
            } catch {
                // Silent fail
            }

            // If kicked out, don't auto-authenticate
            if (wasKickedOut) {
                setUser(null);
                setToken(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // Check if we have a valid session via httpOnly cookie
            const { authenticated, user: sessionUser } = await checkSession();

            if (authenticated && sessionUser) {
                setUser(sessionUser);
                setIsAuthenticated(true);
                // Store user info locally for display
                localStorage.setItem('tax-auth-user', JSON.stringify(sessionUser));
            } else {
                // Clear any stale local data
                localStorage.removeItem('tax-auth-user');
                localStorage.removeItem('tax-auth-token');
                localStorage.removeItem('tax-refresh-token');

                // Check if redirect needed
                const publicRoutes = ['/auth/login', '/auth/register', '/', '/about', '/contact', '/connect', '/reset-password', '/forgot-password'];
                const currentPath = pathname || '';
                const isPublic = publicRoutes.some(route => currentPath === route || currentPath.startsWith(route + '/'));

                if (!isPublic) {
                    router.push('/auth/login');
                }
            }

            setIsLoading(false);
        };

        initSession();
    }, [checkSession, pathname, router]);

    /**
     * Cross-Tab Logout Synchronization
     * Uses BroadcastChannel API (modern) with localStorage fallback (legacy)
     *
     * IMPORTANT: Only ONE user can be logged in per browser at a time.
     * - Logout in any tab = logout ALL tabs (regardless of user)
     * - Login with a DIFFERENT user = force logout tabs with old user
     *
     * Uses currentUserIdRef instead of user?.id in handlers to avoid stale closures
     */
    useEffect(() => {
        // Method 1: BroadcastChannel API (efficient, same-origin only)
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                broadcastChannelRef.current = new BroadcastChannel('tax-portal-auth');

                broadcastChannelRef.current.onmessage = (event) => {
                    const currentUserId = currentUserIdRef.current;

                    if (event.data?.type === 'logout') {
                        // Logout ALL tabs when any tab logs out
                        // Only one user per browser policy
                        logout(event.data.reason || 'Logged out from another tab', true);
                    }

                    if (event.data?.type === 'login') {
                        // SECURITY: If a DIFFERENT user logged in, force logout this tab
                        // This prevents data leakage when someone else logs in
                        const newUserId = event.data.userId;
                        if (currentUserId && newUserId && currentUserId !== newUserId) {
                            logout('Another user logged in. You have been logged out for security.', true);
                        }
                    }
                };
            }
        } catch {
            // BroadcastChannel not supported, will rely on storage event
        }

        // Method 2: Storage event (fallback, works cross-origin in same browser)
        const handleStorageChange = (event: StorageEvent) => {
            const currentUserId = currentUserIdRef.current;

            // Check if this is our logout signal - logout ALL tabs
            if (event.key === 'auth-logout-event' && event.newValue) {
                // Logout regardless of which user - only one user per browser
                logout('Logged out from another tab', true);
            }

            // SECURITY: Check if a DIFFERENT user logged in
            if (event.key === 'auth-login-event' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    const newUserId = data.userId;

                    // If a different user logged in, force logout this tab
                    if (currentUserId && newUserId && currentUserId !== newUserId) {
                        logout('Another user logged in. You have been logged out for security.', true);
                    }
                } catch {
                    // If parsing fails, ignore
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            // Cleanup BroadcastChannel
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
                broadcastChannelRef.current = null;
            }
            // Cleanup storage listener
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [logout]);

    return (
        <SessionContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated,
            login,
            logout,
            updateUser,
            refreshSession
        }}>
            {children}

            <Dialog open={showIdleWarning} onOpenChange={setShowIdleWarning}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-amber-600 flex items-center gap-2">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Session Warning
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            You have been inactive for over {(IDLE_WARNING_MS / 60000).toFixed(0)} minutes.
                            <br />
                            <strong className="text-red-600">
                                You will be logged out in {((IDLE_TIMEOUT_MS - IDLE_WARNING_MS) / 60000).toFixed(0)} minutes.
                            </strong>
                            <br />
                            <br />
                            <span className="text-slate-700 dark:text-slate-300">
                                Any unsaved form data is automatically backed up locally, but please save your work to ensure it's synced to the server.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => logout('Logged out by user')}>
                            Log Out Now
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                lastActivityRef.current = Date.now();
                                setShowIdleWarning(false);
                                refreshSession(); // Refresh session when user clicks continue
                                toast({
                                    title: 'Session Extended',
                                    description: 'Your session has been extended. Continue working.',
                                });
                            }}
                        >
                            Continue Working
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SessionContext.Provider>
    );
};
