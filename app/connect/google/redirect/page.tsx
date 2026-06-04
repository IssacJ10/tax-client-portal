"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSession } from "@/context/session-provider"

function GoogleRedirectContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState("")
    const { login } = useSession()
    const processedRef = useRef(false)

    useEffect(() => {
        const handleCallback = async () => {
            if (processedRef.current) return;
            processedRef.current = true;

            const errorParam = searchParams.get("error")

            if (errorParam) {
                // SECURITY: Clear error from URL to prevent exposure in browser history
                window.history.replaceState({}, '', '/connect/google/redirect');
                setError(errorParam)
                return
            }

            try {
                const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
                const jwt = searchParams.get("jwt");

                // SECURITY: Immediately clear JWT from URL after extraction
                // This prevents the token from being:
                // - Logged in browser history
                // - Visible in server logs via Referer header
                // - Captured by browser extensions
                // - Exposed if user shares/bookmarks the URL
                if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/connect/google/redirect');
                }

                // JWT from URL is required (sent by Strapi OAuth callback)
                if (!jwt) {
                    throw new Error('No authentication token received');
                }

                // Fetch user data using the JWT from URL params
                const userRes = await fetch(`${strapiUrl}/api/users/me`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                    }
                });

                if (!userRes.ok) {
                    throw new Error('Failed to verify authentication');
                }

                const userData = await userRes.json();

                if (!userData || !userData.id) {
                    throw new Error('Invalid user data received');
                }

                // Store token and user in session
                login(jwt, userData);

                // Small delay to ensure state is updated before redirect
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 100);

            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred during authentication")
            }
        }

        handleCallback()
    }, [searchParams, router, login])

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive font-medium">Authentication Error: {error}</p>
                <button onClick={() => router.push("/auth/login")} className="text-primary hover:underline">
                    Return to Sign In
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Completing secure sign in...</p>
        </div>
    )
}

export default function GoogleRedirectPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GoogleRedirectContent />
        </Suspense>
    )
}
