'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/session-provider';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Lock, Check } from 'lucide-react';

export const ConsentModal = () => {
    const { user, token, isAuthenticated, login } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasRead, setHasRead] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Prevent scrolling on the body when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        if (isAuthenticated && user && !user.hasConsentedToTerms) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [isAuthenticated, user]);

    const handleAgree = async () => {
        if (!token || !user) return;

        setIsSubmitting(true);
        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

            const res = await fetch(`${strapiUrl}/api/dashboard/consent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const responseText = await res.text();
            console.log('Consent API Response:', {
                status: res.status,
                statusText: res.statusText,
                body: responseText
            });

            if (!res.ok) {
                throw new Error(`Failed to record consent: ${res.status} ${res.statusText} - ${responseText}`);
            }

            login(token, { ...user, hasConsentedToTerms: true });

            toast({
                title: "Welcome to TaxPortal",
                description: "You may now proceed with your tax filing.",
            });

            setIsOpen(false);

            // Redirect to dashboard after consent
            router.push('/dashboard');

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Connection Error",
                description: "Could not save your agreement. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        // 1. BACKDROP: Fixed, full screen, high z-index
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">

            {/* 2. CARD CONTAINER: Flex item, limited height, scrollable internally */}
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">

                {/* --- HEADER --- */}
                <div className="relative px-6 py-6 bg-gradient-to-br from-[#00754a] via-[#006640] to-[#004d30] shrink-0">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
                    <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-none mb-1">Service Agreement</h2>
                            <p className="text-green-100 text-sm">Please review and accept to continue.</p>
                        </div>
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="space-y-6 text-slate-700">
                        {/* Section 1 */}
                        <section>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">1</div>
                                <h3 className="font-bold text-slate-900">Services Provided</h3>
                            </div>
                            <p className="text-sm leading-relaxed pl-11">
                                JJ Elevate Accounting Solutions Inc. helps users prepare and file Canadian personal tax returns (T1), Corporate Tax returns, and T3 Trust returns. We provide preparation services but do not provide legal advice.
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">2</div>
                                <h3 className="font-bold text-slate-900">Your Responsibilities</h3>
                            </div>
                            <ul className="space-y-2 pl-11 text-sm">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <span>Provide accurate and complete information about income and expenses.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <span>Retain supporting documents (receipts, forms) for CRA verification.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <span>Review all information before submission to ensure accuracy.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">3</div>
                                <h3 className="font-bold text-slate-900">Consent to Use Information</h3>
                            </div>
                            <p className="text-sm leading-relaxed pl-11">
                                You consent to JJ Elevate collecting, storing, and using your personal information (Name, SIN, Financial Data) and authorizing us to share this information with the CRA to file your taxes.
                            </p>
                        </section>

                        {/* Section 4 */}
                        <section>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <h3 className="font-bold text-slate-900">Privacy & Security</h3>
                            </div>
                            <p className="text-sm leading-relaxed pl-11">
                                Your personal information is encrypted. Only authorized staff access your data for tax preparation purposes.
                            </p>
                        </section>

                        {/* Highlight Box */}
                        <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex gap-3">
                            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">
                                <strong>Electronic Confirmation:</strong> By clicking "I Agree", you legally confirm your consent to these terms.
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Checkbox
                                id="custom-consent"
                                checked={hasRead}
                                onCheckedChange={(c) => setHasRead(c as boolean)}
                                className="border-slate-300 data-[state=checked]:bg-[#00754a] data-[state=checked]:border-[#00754a]"
                            />
                            <Label htmlFor="custom-consent" className="cursor-pointer font-medium text-slate-700">
                                I have read and agree to the terms
                            </Label>
                        </div>

                        <Button
                            size="lg"
                            onClick={handleAgree}
                            disabled={!hasRead || isSubmitting}
                            className="w-full sm:w-auto bg-[#00754a] hover:bg-[#006640] text-white shadow-lg shadow-green-200 transition-all hover:scale-[1.02]"
                        >
                            {isSubmitting ? 'Saving...' : (
                                <span className="flex items-center gap-2">
                                    <Check className="w-4 h-4" /> I Agree & Continue
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
