'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useSession } from "@/context/session-provider"
import { ValidationSchemas } from "@/lib/security/validation"
import { useLocalStorageAuth } from "@/lib/security/environment"

// --- Validation Schemas ---

const profileSchema = z.object({
    firstName: z.string().min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z \-']+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),
    lastName: z.string().min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z \-']+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),
})

// Use centralized password schema with common password check
const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: ValidationSchemas.password,
    passwordConfirmation: z.string()
}).refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfilePage() {
    const { token, updateUser, user: sessionUser } = useSession()
    const [loading, setLoading] = useState(true)
    const [updatingProfile, setUpdatingProfile] = useState(false)
    const [updatingPassword, setUpdatingPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Helper to get auth headers - dual-mode auth
    // Development: use localStorage token, Production: rely on httpOnly cookies
    const getAuthHeaders = (): HeadersInit => {
        if (useLocalStorageAuth()) {
            const authToken = token || localStorage.getItem('tax-auth-token')
            return authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
        return {} // Production uses httpOnly cookies
    }

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { firstName: "", lastName: "" }
    })

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    })

    // Load User Data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/users/me`, {
                    credentials: 'include', // httpOnly cookie auth (production)
                    headers: getAuthHeaders(), // Development fallback
                })

                if (!res.ok) throw new Error("Failed to load profile")

                const user = await res.json()
                profileForm.reset({
                    firstName: user.firstName || "",
                    lastName: user.lastName || ""
                })
            } catch (err) {
                console.error(err)
                setError("Could not load profile data.")
            } finally {
                setLoading(false)
            }
        }

        fetchUser()
    }, [profileForm, token])

    // Handle Profile Update
    const onProfileSubmit = async (data: ProfileFormValues) => {
        setUpdatingProfile(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/users/me`, {
                method: "PUT",
                credentials: 'include', // httpOnly cookie auth (production)
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(), // Development fallback
                },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error?.message || "Failed to update profile")
            }

            // Sync with Session Context
            const updatedUser = await res.json();
            // Safety: Ensure we never store password in local storage
            const { password, ...safeUser } = updatedUser;
            updateUser(safeUser);

            setSuccess("Profile updated successfully!")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdatingProfile(false)
        }
    }

    // Handle Password Update
    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setUpdatingPassword(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/auth/change-password`, {
                method: "POST",
                credentials: 'include', // httpOnly cookie auth (production)
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(), // Development fallback
                },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error?.message || "Failed to change password")
            }

            setSuccess("Password changed successfully!")
            passwordForm.reset()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdatingPassword(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-[#07477a]" /></div>
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto p-4 sm:p-8">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#07477a] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Return to Dashboard
                </Link>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400"><AlertDescription>{success}</AlertDescription></Alert>}

            {/* Profile Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    {...profileForm.register("firstName")}
                                    disabled={updatingProfile}
                                />
                                {profileForm.formState.errors.firstName && (
                                    <p className="text-sm text-red-500">{profileForm.formState.errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    {...profileForm.register("lastName")}
                                    disabled={updatingProfile}
                                />
                                {profileForm.formState.errors.lastName && (
                                    <p className="text-sm text-red-500">{profileForm.formState.errors.lastName.message}</p>
                                )}
                            </div>
                        </div>
                        <Button type="submit" disabled={updatingProfile} className="bg-[#07477a] hover:bg-[#053560] shadow-lg shadow-[#07477a]/20">
                            {updatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Password Change Card */}
            {sessionUser?.provider === 'google' ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>
                            Your account is signed in via Google. Please manage your password and security settings through your Google Account.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Change your password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={showCurrentPassword ? "text" : "password"}
                                        {...passwordForm.register("currentPassword")}
                                        disabled={updatingPassword}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        tabIndex={-1}
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {passwordForm.formState.errors.currentPassword && (
                                    <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showNewPassword ? "text" : "password"}
                                            {...passwordForm.register("password")}
                                            disabled={updatingPassword}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordForm.formState.errors.password && (
                                        <p className="text-sm text-red-500">{passwordForm.formState.errors.password.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="passwordConfirmation">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="passwordConfirmation"
                                            type={showConfirmPassword ? "text" : "password"}
                                            {...passwordForm.register("passwordConfirmation")}
                                            disabled={updatingPassword}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordForm.formState.errors.passwordConfirmation && (
                                        <p className="text-sm text-red-500">{passwordForm.formState.errors.passwordConfirmation.message}</p>
                                    )}
                                </div>
                            </div>
                            <Button type="submit" disabled={updatingPassword} variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                                {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Change Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
