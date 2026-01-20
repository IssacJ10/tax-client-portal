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

// --- CONFIGURATION ---
const IDLE_WARNING_MS = 13 * 60 * 1000; // Warn after 13 mins
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // Logout after 15 mins
const CHECK_INTERVAL_MS = 60 * 1000;    // Check every 1 minute
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // Refresh if expiring in 5 mins

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
    token: string | null;
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
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showIdleWarning, setShowIdleWarning] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    // Activity Tracking Refs (Refs prevent re-renders on every mouse move)
    const lastActivityRef = useRef<number>(Date.now());
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Terminate Session / Logout
     * IMPORTANT: Preserves filing backup data to prevent data loss
     */
    const logout = useCallback((reason?: string) => {
        console.log('[LOGOUT] Starting logout process...', reason);

        // 1. PRESERVE any filing backups before clearing storage
        const filingBackups: Record<string, any> = {};
        try {
            // Scan localStorage for filing-backup-* keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('filing-backup-')) {
                    const backupData = localStorage.getItem(key);
                    if (backupData) {
                        filingBackups[key] = backupData;
                        console.log(`[LOGOUT] Preserving ${key}`);
                    }
                }
            }
        } catch (e) {
            console.error('[LOGOUT] Failed to preserve filing backups', e);
        }

        // 2. Clear authentication data
        try {
            localStorage.removeItem('tax-auth-token');
            localStorage.removeItem('tax-auth-user');
            localStorage.removeItem('tax-refresh-token');
            // Clear CSRF token on logout for security
            clearCsrfToken();
            console.log('[LOGOUT] Auth data cleared');
        } catch (e) {
            console.error('[LOGOUT] Failed to clear localStorage', e);
        }

        // 3. Restore filing backups
        try {
            Object.entries(filingBackups).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            console.log('[LOGOUT] Filing backups restored');
        } catch (e) {
            console.error('[LOGOUT] Failed to restore filing backups', e);
        }

        // 4. Try to revoke token on server (don't wait for it)
        const currentToken = token;
        if (currentToken) {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
            fetch(`${strapiUrl}/api/token/revoke`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            }).catch(e => console.error('[LOGOUT] Revoke failed', e));
        }

        // 5. Force full browser reload to root
        console.log('[LOGOUT] Reloading browser...');
        if (reason) {
            sessionStorage.setItem('logout-reason', reason);
        }
        window.location.href = '/';
    }, [token]);

    /**
     * Login Handler
     */
    const login = useCallback((newToken: string, newUser: User) => {
        localStorage.setItem('tax-auth-token', newToken);
        localStorage.setItem('tax-auth-user', JSON.stringify(newUser));

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
        // Extend CSRF token on activity to prevent expiry during form filing
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
                console.log('🔄 User activity detected, session extended');
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
     */
    const refreshSession = async (): Promise<boolean> => {
        const currentRefresh = localStorage.getItem('tax-refresh-token');

        if (!currentRefresh) {
            console.warn('⚠️ No refresh token available');
            return false;
        }

        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

            console.log('🔄 Attempting to refresh session token...');

            const res = await fetch(`${strapiUrl}/api/token/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: currentRefresh })
            });

            if (res.ok) {
                const data = await res.json();

                localStorage.setItem('tax-auth-token', data.jwt);
                if (data.refreshToken) {
                    localStorage.setItem('tax-refresh-token', data.refreshToken);
                }
                setToken(data.jwt);
                lastActivityRef.current = Date.now();

                console.log('✅ Session token refreshed successfully');
                return true;
            } else if (res.status === 404) {
                console.warn('⚠️ Token refresh endpoint not implemented on server');
                return false;
            } else if (res.status === 401 || res.status === 403) {
                console.error('❌ Refresh token expired. Logging out.');
                toast({
                    variant: 'destructive',
                    title: 'Session Expired',
                    description: 'Your session has expired. Please sign in again.',
                });
                logout('Refresh token expired');
                return false;
            } else {
                console.error('❌ Token refresh failed with status:', res.status);
                return false;
            }
        } catch (e) {
            console.error('❌ Token refresh error:', e);
            return false;
        }
    };

    /**
     * Security Check Loop
     */
    useEffect(() => {
        if (!isAuthenticated) return;

        checkIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            // Check Idle Timeout
            if (timeSinceLastActivity > IDLE_TIMEOUT_MS) {
                logout('You have been logged out due to inactivity.');
                return;
            }

            // Show Warning
            if (timeSinceLastActivity > IDLE_WARNING_MS && !showIdleWarning) {
                setShowIdleWarning(true);
            }

            // Check Token Expiry
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const expiry = payload.exp * 1000;

                    if (now >= expiry) {
                        logout('Your session has expired. Please sign in again.');
                    } else if (now >= expiry - TOKEN_EXPIRY_BUFFER) {
                        console.log('Token expiring soon, refreshing...');
                        refreshSession();
                    }
                } catch (e) {
                    console.error('Invalid token format');
                }
            }

        }, CHECK_INTERVAL_MS);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [isAuthenticated, token, logout, showIdleWarning]);

    /**
     * Initialization Logic
     */
    useEffect(() => {
        const initSession = async () => {
            const storedToken = localStorage.getItem('tax-auth-token');
            const storedUser = localStorage.getItem('tax-auth-user');

            if (storedToken && storedUser) {
                try {
                    const payload = JSON.parse(atob(storedToken.split('.')[1]));
                    if (Date.now() < payload.exp * 1000) {
                        setToken(storedToken);
                        setUser(JSON.parse(storedUser));
                        setIsAuthenticated(true);
                    } else {
                        logout();
                    }
                } catch (e) {
                    console.error("Failed to restore session", e);
                    logout();
                }
            } else {
                // No session - check if redirect needed
                const publicRoutes = ['/auth/login', '/auth/register', '/', '/about', '/contact', '/connect'];
                const currentPath = pathname || '';
                const isPublic = publicRoutes.some(route => currentPath === route || currentPath.startsWith(route + '/'));

                if (!isPublic) {
                    router.push('/auth/login');
                }
            }

            setIsLoading(false);
        };

        initSession();
    }, []); // Run once on mount

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
