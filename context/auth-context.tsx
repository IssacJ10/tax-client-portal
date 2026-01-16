// tax-client-portal/context/auth-context.tsx

"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/services/auth-service"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/domain/types"

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (credentials: { identifier: string; password: string }) => Promise<void>
    register: (data: { username: string; email: string; password: string }) => Promise<void>
    signInWithGoogle: () => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const { toast } = useToast()

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("jwt")
            if (token) {
                try {
                    const response = await AuthService.getMe()
                    setUser(response.data)
                } catch (err) {
                    localStorage.removeItem("jwt")
                }
            }
            setIsLoading(false)
        }
        initAuth()
    }, [])

    // Session expiration reminder (every 5 minutes)
    useEffect(() => {
        const interval = setInterval(() => {
            const token = localStorage.getItem("jwt")
            if (token) {
                toast({
                    title: "Session Reminder",
                    description: "For your security, your session will expire soon.",
                })
            }
        }, 1000 * 60 * 5)
        return () => clearInterval(interval)
    }, [toast])

    const login = async (credentials: { identifier: string; password: string }) => {
        const response = await AuthService.login(credentials)
        localStorage.setItem("jwt", response.data.jwt)
        setUser(response.data.user)
        router.push("/dashboard")
    }

    const register = async (data: { username: string; email: string; password: string }) => {
        const response = await AuthService.register(data)
        localStorage.setItem("jwt", response.data.jwt)
        setUser(response.data.user)
        router.push("/dashboard")
    }

    const signInWithGoogle = () => {
        window.location.href = AuthService.getGoogleAuthURL()
    }

    const logout = () => {
        localStorage.removeItem("jwt")
        setUser(null)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}