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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/10 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
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
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>
            </div>

            {isRegistered && activeTab === "login" && (
                <div className="mb-6 rounded-lg bg-green-500/15 p-4 text-green-600 dark:text-green-400 flex items-center gap-3 border border-green-500/20">
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
                    <Card>
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
                                    <ShieldCheck className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
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
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            {error && activeTab === "login" && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium text-center">
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
                                        <Link href="/forgot-password" className="text-sm text-emerald-600 hover:underline">
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
                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" disabled={isLoading}>
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
                            <div className="text-sm text-center text-muted-foreground">
                                Don't have an account?{" "}
                                <button
                                    onClick={() => setActiveTab("register")}
                                    className="text-emerald-600 hover:underline font-medium"
                                >
                                    Create account
                                </button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="register">
                    <Card>
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
                                    <ShieldCheck className="h-7 w-7 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-center">Create an account</CardTitle>
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
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            {error && activeTab === "register" && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium text-center">
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
                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" disabled={isLoading}>
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
                            <div className="text-sm text-center text-muted-foreground">
                                Already have an account?{" "}
                                <button
                                    onClick={() => setActiveTab("login")}
                                    className="text-emerald-600 hover:underline font-medium"
                                >
                                    Sign in
                                </button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>

            <p className="mt-8 text-center text-xs text-muted-foreground">
                By {activeTab === "login" ? "signing in" : "creating an account"}, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-emerald-600">
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-emerald-600">
                    Privacy Policy
                </Link>
            </p>
        </div>
    );
}