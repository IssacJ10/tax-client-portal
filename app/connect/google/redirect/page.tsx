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

            const jwt = searchParams.get("jwt")
            const refresh = searchParams.get("refresh")
            const errorParam = searchParams.get("error")

            if (errorParam) {
                setError(errorParam)
                return
            }

            if (!jwt) {
                setError("No authentication token found")
                return
            }

            try {
                // Fetch user data using the JWT token
                const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
                const userRes = await fetch(`${strapiUrl}/api/users/me`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                });

                if (!userRes.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const userData = await userRes.json();

                // Use login to update session state and localStorage
                login(jwt, userData);

                if (refresh) {
                    localStorage.setItem("tax-refresh-token", refresh)
                }

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 100);

            } catch (err) {
                setError("An error occurred during authentication processing")
                console.error(err)
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
