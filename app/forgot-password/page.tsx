"use client";

import { useState } from "react";
import { useReCaptcha } from "@/components/recaptcha-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const { executeRecaptcha } = useReCaptcha();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // Execute reCAPTCHA
            const recaptchaToken = await executeRecaptcha("forgot_password");

            const strapiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337/api";
            const res = await fetch(`${strapiUrl}/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: data.email,
                    recaptchaToken,
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error?.message || "Failed to send reset email");
            }

            // Show success message
            setSubmittedEmail(data.email);
            setIsSubmitted(true);
        } catch (err: any) {
            // Don't reveal if email exists or not for security
            // Always show success message
            setSubmittedEmail(data.email);
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

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

                {isSubmitted ? (
                    <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                                    <CheckCircle2 className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center text-gray-900">Check your email</CardTitle>
                            <CardDescription className="text-center">
                                We've sent a password reset link to <strong className="text-gray-700">{submittedEmail}</strong>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-[#07477a]/5 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                                <p>Please check your inbox and click the link in the email to reset your password.</p>
                                <p className="text-xs text-gray-500">If you don't see the email, check your spam folder.</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Link href="/auth/login">
                                    <Button className="w-full bg-[#07477a] hover:bg-[#053560]" size="lg">
                                        Return to Login
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setSubmittedEmail("");
                                    }}
                                >
                                    Try a different email
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#07477a] to-[#053560] shadow-lg shadow-[#07477a]/30">
                                    <Mail className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center text-gray-900">Forgot password?</CardTitle>
                            <CardDescription className="text-center">
                                Enter your email address and we'll send you a link to reset your password.
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
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        {...register("email")}
                                        disabled={isLoading}
                                        className={errors.email ? "border-red-500" : ""}
                                    />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
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
                                            Sending...
                                        </>
                                    ) : (
                                        "Send Reset Link"
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
                )}

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
