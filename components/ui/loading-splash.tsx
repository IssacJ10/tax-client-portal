"use client"

import { useState, useEffect } from "react"
import { Calculator } from "lucide-react"

export function LoadingSplash() {
    const [isLoading, setIsLoading] = useState(true)
    const [isFading, setIsFading] = useState(false)

    useEffect(() => {
        // Check if page has already loaded
        if (document.readyState === "complete") {
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                setIsFading(true)
                setTimeout(() => setIsLoading(false), 400)
            }, 300)
            return () => clearTimeout(timer)
        }

        // Wait for page to fully load
        const handleLoad = () => {
            // Small delay for smoother UX
            setTimeout(() => {
                setIsFading(true)
                setTimeout(() => setIsLoading(false), 400)
            }, 200)
        }

        window.addEventListener("load", handleLoad)

        // Fallback: hide after max 2.5 seconds regardless
        const fallback = setTimeout(() => {
            setIsFading(true)
            setTimeout(() => setIsLoading(false), 400)
        }, 2500)

        return () => {
            window.removeEventListener("load", handleLoad)
            clearTimeout(fallback)
        }
    }, [])

    if (!isLoading) return null

    return (
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#07477a] via-[#053560] to-[#07477a] transition-opacity duration-400 ${
                isFading ? "opacity-0" : "opacity-100"
            }`}
        >
            {/* Animated background glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-white/5 blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[#3b9cc2]/10 blur-[80px] animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>

            {/* Content */}
            <div className="relative flex flex-col items-center gap-6">
                {/* Calculator icon with pulse animation */}
                <div className="relative">
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl scale-150 animate-ping" style={{ animationDuration: "1.5s" }} />

                    {/* Icon container */}
                    <div className="relative h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl animate-breath">
                        <Calculator className="h-10 w-10 text-white" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Brand text */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">JJ Elevate</h1>
                    <p className="text-sm text-white/60 font-medium">Accounting Solutions</p>
                </div>

                {/* Loading dots */}
                <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />

            {/* CSS for custom animation */}
            <style jsx>{`
                @keyframes breath {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 0 30px 10px rgba(255, 255, 255, 0.1);
                    }
                }
                .animate-breath {
                    animation: breath 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
