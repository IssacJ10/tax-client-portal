"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReCaptcha } from "@/components/recaptcha-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const resetPasswordSchema = z
    .object({
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { executeRecaptcha } = useReCaptcha();

    const code = searchParams.get("code");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        if (!code) {
            setError("Invalid or missing reset code. Please request a new password reset link.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Execute reCAPTCHA
            const recaptchaToken = await executeRecaptcha("reset_password");

            const strapiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337/api";
            const res = await fetch(`${strapiUrl}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                    password: data.password,
                    passwordConfirmation: data.confirmPassword,
                    recaptchaToken,
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error?.message || "Failed to reset password");
            }

            setIsSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/auth/login");
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // No code provided - show error state
    if (!code) {
        return (
            <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30">
                            <AlertCircle className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center text-gray-900">Invalid Reset Link</CardTitle>
                    <CardDescription className="text-center">
                        This password reset link is invalid or has expired.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-red-50 rounded-lg p-4 text-sm text-red-600">
                        <p>Please request a new password reset link to continue.</p>
                    </div>
                    <Link href="/forgot-password">
                        <Button className="w-full bg-[#07477a] hover:bg-[#053560]" size="lg">
                            Request New Reset Link
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center text-gray-900">Password Reset Successful</CardTitle>
                    <CardDescription className="text-center">
                        Your password has been successfully reset.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-600">
                        <p>You can now sign in with your new password. Redirecting you to the login page...</p>
                    </div>
                    <Link href="/auth/login">
                        <Button className="w-full bg-[#07477a] hover:bg-[#053560]" size="lg">
                            Go to Login
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // Reset password form
    return (
        <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-center mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#07477a] to-[#053560] shadow-lg shadow-[#07477a]/30">
                        <KeyRound className="h-7 w-7 text-white" />
                    </div>
                </div>
                <CardTitle className="text-2xl text-center text-gray-900">Reset your password</CardTitle>
                <CardDescription className="text-center">
                    Enter your new password below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your new password"
                            {...register("password")}
                            disabled={isLoading}
                            className={errors.password ? "border-red-500" : ""}
                        />
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        <p className="text-xs text-gray-500">
                            Must be at least 8 characters with uppercase, lowercase, number, and special character.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your new password"
                            {...register("confirmPassword")}
                            disabled={isLoading}
                            className={errors.confirmPassword ? "border-red-500" : ""}
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-[#07477a] hover:bg-[#053560] shadow-lg shadow-[#07477a]/20"
                        size="lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </form>

                <div className="text-sm text-center text-gray-500">
                    Remember your password?{" "}
                    <Link href="/auth/login" className="text-[#07477a] hover:underline font-medium">
                        Sign in
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#07477a]/10 via-[#f0f7ff] to-white p-4">
            <div className="w-full max-w-md">
                {/* Logo Header */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
                            <img src="/images/logo.png" alt="JJ Elevate" className="h-12 w-12 rounded-xl object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight drop-shadow-sm">JJ Elevate</h1>
                            <p className="text-xs text-white/80 font-medium">Accounting Solutions Inc.</p>
                        </div>
                    </div>
                    <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </div>

                <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[#07477a]" />}>
                    <ResetPasswordContent />
                </Suspense>

                <p className="mt-8 text-center text-xs text-gray-500">
                    Need help?{" "}
                    <Link href="/contact" className="underline hover:text-[#07477a]">
                        Contact Support
                    </Link>
                </p>
            </div>
        </div>
    );
}
