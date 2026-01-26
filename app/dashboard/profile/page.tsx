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
import { Loader2, ArrowLeft } from "lucide-react"
import { useSession } from "@/context/session-provider"

// --- Validation Schemas ---

const profileSchema = z.object({
    firstName: z.string().min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z \-']+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),
    lastName: z.string().min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z \-']+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),
})

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
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
            if (!token) return

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
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
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
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
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
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
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    {...passwordForm.register("currentPassword")}
                                    disabled={updatingPassword}
                                />
                                {passwordForm.formState.errors.currentPassword && (
                                    <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        {...passwordForm.register("password")}
                                        disabled={updatingPassword}
                                    />
                                    {passwordForm.formState.errors.password && (
                                        <p className="text-sm text-red-500">{passwordForm.formState.errors.password.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="passwordConfirmation">Confirm Password</Label>
                                    <Input
                                        id="passwordConfirmation"
                                        type="password"
                                        {...passwordForm.register("passwordConfirmation")}
                                        disabled={updatingPassword}
                                    />
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
