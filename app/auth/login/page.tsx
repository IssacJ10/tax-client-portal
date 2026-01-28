"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/context/session-provider";
import { useReCaptcha } from "@/components/recaptcha-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Chrome, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

// Validation schemas
const signInSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signUpSchema = z
    .object({
        firstName: z
            .string()
            .min(2, "First name must be at least 2 characters")
            .regex(/^[a-zA-Z \-']+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
        lastName: z
            .string()
            .min(2, "Last name must be at least 2 characters")
            .regex(/^[a-zA-Z \-']+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
        email: z.string().email("Please enter a valid email address"),
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#07477a]/10 via-[#f0f7ff] to-white p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[#07477a]" />}>
                <AuthContent />
            </Suspense>
        </div>
    );
}

function AuthContent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get("tab") === "register" ? "register" : "login";
    const [activeTab, setActiveTab] = useState(defaultTab);

    const { login } = useSession();
    const { executeRecaptcha } = useReCaptcha();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);

    // Sign in form
    const {
        register: registerSignIn,
        handleSubmit: handleSubmitSignIn,
        formState: { errors: signInErrors },
    } = useForm<SignInFormValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Sign up form
    const {
        register: registerSignUp,
        handleSubmit: handleSubmitSignUp,
        formState: { errors: signUpErrors },
    } = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSignIn = async (data: SignInFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // Execute reCAPTCHA and get token
            const recaptchaToken = await executeRecaptcha("login");

            const strapiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337/api";
            const res = await fetch(`${strapiUrl}/auth/local`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier: data.email,
                    password: data.password,
                    recaptchaToken, // Send token for backend verification
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error("Invalid email or password");
            }

            // Store refresh token if provided
            if (responseData.refreshToken) {
                localStorage.setItem("tax-refresh-token", responseData.refreshToken);
            }

            // Use SessionProvider's login method
            login(responseData.jwt, responseData.user);

            // Manual redirect (SessionProvider doesn't auto-redirect)
            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message || "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const onSignUp = async (data: SignUpFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // Execute reCAPTCHA and get token
            const recaptchaToken = await executeRecaptcha("register");

            const strapiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337/api";
            const res = await fetch(`${strapiUrl}/auth/local/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: data.email,
                    email: data.email,
                    password: data.password,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    recaptchaToken, // Send token for backend verification
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error?.message || "Registration failed");
            }

            // Show success message and switch to login tab
            setIsRegistered(true);
            setActiveTab("login");
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = () => {
        setIsLoading(true);
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
        window.location.href = `${strapiUrl}/api/connect/google`;
    };

    return (
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
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#07477a] transition-colors py-3 px-4 -mx-4 touch-manipulation">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>
            </div>

            {isRegistered && activeTab === "login" && (
                <div className="mb-6 rounded-lg bg-[#07477a]/10 p-4 text-[#07477a] flex items-center gap-3 border border-[#07477a]/20">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">Account created successfully! Please sign in.</p>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                    <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#07477a] to-[#053560] shadow-lg shadow-[#07477a]/30">
                                    <ShieldCheck className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center text-gray-900">Welcome back</CardTitle>
                            <CardDescription className="text-center">Sign in to your account to continue</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                variant="outline"
                                className="w-full bg-transparent"
                                size="lg"
                                onClick={handleGoogleAuth}
                                disabled={isLoading}
                            >
                                <Chrome className="mr-2 h-5 w-5" />
                                Sign in with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-gray-500 font-medium">Or continue with</span>
                                </div>
                            </div>

                            {error && activeTab === "login" && (
                                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmitSignIn(onSignIn)} className="space-y-4" noValidate>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        {...registerSignIn("email")}
                                        disabled={isLoading}
                                        className={signInErrors.email ? "border-red-500" : ""}
                                    />
                                    {signInErrors.email && <p className="text-xs text-red-500">{signInErrors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link href="/forgot-password" className="text-sm text-[#07477a] hover:underline">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        {...registerSignIn("password")}
                                        disabled={isLoading}
                                        className={signInErrors.password ? "border-red-500" : ""}
                                    />
                                    {signInErrors.password && <p className="text-xs text-red-500">{signInErrors.password.message}</p>}
                                </div>
                                <Button type="submit" className="w-full bg-[#07477a] hover:bg-[#053560] shadow-lg shadow-[#07477a]/20" size="lg" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <div className="text-sm text-center text-gray-500">
                                Don't have an account?{" "}
                                <button
                                    onClick={() => setActiveTab("register")}
                                    className="text-[#07477a] hover:underline font-medium"
                                >
                                    Create account
                                </button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="register">
                    <Card className="border-[#07477a]/10 shadow-lg shadow-[#07477a]/5">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#07477a] to-[#053560] shadow-lg shadow-[#07477a]/30">
                                    <ShieldCheck className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center text-gray-900">Create an account</CardTitle>
                            <CardDescription className="text-center">Get started with your tax filing journey</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                variant="outline"
                                className="w-full bg-transparent"
                                size="lg"
                                onClick={handleGoogleAuth}
                                disabled={isLoading}
                            >
                                <Chrome className="mr-2 h-5 w-5" />
                                Sign up with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-gray-500 font-medium">Or continue with</span>
                                </div>
                            </div>

                            {error && activeTab === "register" && (
                                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmitSignUp(onSignUp)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="John"
                                            {...registerSignUp("firstName")}
                                            disabled={isLoading}
                                            className={signUpErrors.firstName ? "border-red-500" : ""}
                                        />
                                        {signUpErrors.firstName && <p className="text-xs text-red-500">{signUpErrors.firstName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Doe"
                                            {...registerSignUp("lastName")}
                                            disabled={isLoading}
                                            className={signUpErrors.lastName ? "border-red-500" : ""}
                                        />
                                        {signUpErrors.lastName && <p className="text-xs text-red-500">{signUpErrors.lastName.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        {...registerSignUp("email")}
                                        disabled={isLoading}
                                        className={signUpErrors.email ? "border-red-500" : ""}
                                    />
                                    {signUpErrors.email && <p className="text-xs text-red-500">{signUpErrors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Password</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        {...registerSignUp("password")}
                                        disabled={isLoading}
                                        className={signUpErrors.password ? "border-red-500" : ""}
                                    />
                                    {signUpErrors.password && <p className="text-xs text-red-500">{signUpErrors.password.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Re-enter your password"
                                        {...registerSignUp("confirmPassword")}
                                        disabled={isLoading}
                                        className={signUpErrors.confirmPassword ? "border-red-500" : ""}
                                    />
                                    {signUpErrors.confirmPassword && <p className="text-xs text-red-500">{signUpErrors.confirmPassword.message}</p>}
                                </div>
                                <Button type="submit" className="w-full bg-[#07477a] hover:bg-[#053560] shadow-lg shadow-[#07477a]/20" size="lg" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <div className="text-sm text-center text-gray-500">
                                Already have an account?{" "}
                                <button
                                    onClick={() => setActiveTab("login")}
                                    className="text-[#07477a] hover:underline font-medium"
                                >
                                    Sign in
                                </button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>

            <p className="mt-8 text-center text-xs text-gray-500">
                By {activeTab === "login" ? "signing in" : "creating an account"}, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-[#07477a]">
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-[#07477a]">
                    Privacy Policy
                </Link>
            </p>
        </div>
    );
}