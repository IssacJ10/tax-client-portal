"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X, LogOut, Mail, Settings2 } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { useSession } from "@/context/session-provider"

export function SiteHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const { logout } = useSession()

    const isAppMode = pathname?.startsWith("/filing") || pathname?.startsWith("/dashboard")
    const isHome = pathname === "/"

    // Prevent hydration mismatch by only rendering theme-dependent UI after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const handleLogout = () => {
        setMobileMenuOpen(false)
        logout()
    }

    const menuItems = ["Features", "About", "Contact"]

    return (
        <>
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                    isAppMode
                        ? "h-[80px] bg-gradient-to-r from-[#07477a] to-[#053560] backdrop-blur-xl border-b border-white/10 shadow-lg"
                        : scrolled
                            ? "h-[80px] bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
                            : "h-[100px] bg-transparent"
                )}
            >
                <div className="container mx-auto h-full px-6 md:px-8 flex items-center justify-between">

                    {/* LEFT: Logo */}
                    <Link href={mounted && localStorage.getItem("tax-auth-token") ? "/dashboard" : "/"} className="flex items-center gap-3 group">
                        <img
                            src="/images/logo.png"
                            alt="JJ Elevate"
                            className={cn(
                                "object-contain group-hover:scale-105 transition-transform duration-300",
                                isAppMode ? "h-10 w-10" : "h-14 w-14 sm:h-16 sm:w-16"
                            )}
                        />
                        <div className={cn(
                            isAppMode ? "hidden sm:block" : "block"
                        )}>
                            <span className={cn(
                                "font-bold tracking-tight transition-colors block leading-tight",
                                isAppMode ? "text-xl text-white" : "text-xl sm:text-2xl md:text-3xl text-gray-900"
                            )}>
                                JJ Elevate
                            </span>
                            <span className={cn(
                                "font-medium transition-colors",
                                isAppMode ? "text-[10px] text-white/70" : "text-[10px] sm:text-xs md:text-sm text-[#07477a]/70"
                            )}>
                                Accounting Solutions Inc.
                            </span>
                        </div>
                    </Link>

                    {/* CENTER: Marketing Nav (Only on Home) */}
                    {isHome && (
                        <nav className="hidden md:flex items-center gap-10">
                            {menuItems.map((item) => (
                                <Link
                                    key={item}
                                    href={`/#${item.toLowerCase()}`}
                                    className={cn(
                                        "text-base font-medium transition-colors",
                                        scrolled ? "text-gray-600 hover:text-[#07477a]" : "text-gray-700 hover:text-[#07477a]"
                                    )}
                                >
                                    {item}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-2 md:gap-3">

                        {/* App Mode Actions */}
                        {isAppMode && (
                            <>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 relative">
                                    <Mail className="h-5 w-5" strokeWidth={2} />
                                    {/* Notification Dot */}
                                    <span className="absolute top-2 right-2.5 h-2 w-2 bg-white rounded-full border-2 border-[#07477a]"></span>
                                </Button>

                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10" asChild>
                                    <Link href="/dashboard/profile">
                                        <Settings2 className="h-5 w-5" strokeWidth={2} />
                                    </Link>
                                </Button>
                            </>
                        )}

                        {/* Separator only if we have app actions and menu */}
                        {isAppMode && <div className="h-7 w-px bg-white/20 mx-2 hidden md:block"></div>}

                        {/* Hamburger / Menu - Clean Modern Design */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className={cn(
                                "relative flex flex-col items-center justify-center rounded-xl transition-all duration-300 group",
                                isAppMode
                                    ? "h-14 w-14 gap-[6px] bg-white/10 hover:bg-white/20 border border-white/20"
                                    : scrolled
                                        ? "h-12 w-12 gap-[5px] bg-gray-100 hover:bg-gray-200 border border-gray-200"
                                        : "h-12 w-12 gap-[5px] bg-[#07477a]/10 hover:bg-[#07477a]/20 border border-[#07477a]/20"
                            )}
                        >
                            <span className={cn(
                                "rounded-full transition-all duration-300",
                                isAppMode ? "w-6 h-[2.5px] bg-white/80 group-hover:bg-white group-hover:w-7" : "w-5 h-[2px] bg-[#07477a]/70 group-hover:bg-[#07477a] group-hover:w-6"
                            )} />
                            <span className={cn(
                                "rounded-full transition-all duration-300",
                                isAppMode ? "w-7 h-[2.5px] bg-white" : "w-6 h-[2px] bg-[#07477a]"
                            )} />
                            <span className={cn(
                                "rounded-full transition-all duration-300",
                                isAppMode ? "w-5 h-[2.5px] bg-white/80 group-hover:bg-white group-hover:w-7" : "w-4 h-[2px] bg-[#07477a]/70 group-hover:bg-[#07477a] group-hover:w-6"
                            )} />
                        </button>

                    </div>
                </div>
            </header>

            {/* MOBILE MENU drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 z-[70] shadow-2xl overflow-hidden"
                        >
                            {/* Header with brand gradient */}
                            <div className="bg-gradient-to-br from-[#07477a] to-[#053560] p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src="/images/logo.png" alt="JJ Elevate" className="h-12 w-12 object-contain" />
                                        <div>
                                            <span className="text-xl font-bold text-white block leading-tight">JJ Elevate</span>
                                            <span className="text-xs text-white/70">Accounting Solutions Inc.</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            <nav className="p-4">
                                {isAppMode ? (
                                    // --- APP MODE MENU ---
                                    <div className="space-y-2">
                                        <Link
                                            href="#"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:text-[#07477a] hover:bg-[#07477a]/5 rounded-xl transition-colors"
                                        >
                                            <Mail className="h-5 w-5" />
                                            Messages
                                        </Link>
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:text-[#07477a] hover:bg-[#07477a]/5 rounded-xl transition-colors"
                                        >
                                            <Settings2 className="h-5 w-5" />
                                            Settings
                                        </Link>

                                        <div className="h-px bg-gray-200 my-4" />

                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 text-base font-medium text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    // --- MARKETING MODE MENU ---
                                    <div className="space-y-2">
                                        {menuItems.map((item) => (
                                            <Link
                                                key={item}
                                                href={`/#${item.toLowerCase()}`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block text-lg font-medium text-gray-700 hover:text-[#07477a] hover:bg-[#07477a]/5 px-4 py-3 rounded-xl transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        ))}
                                        <div className="h-px bg-gray-200 my-4" />
                                        <Link
                                            href="/auth/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-center w-full py-3.5 text-base font-semibold text-white bg-[#07477a] rounded-xl hover:bg-[#053560] transition-colors shadow-lg shadow-[#07477a]/20"
                                        >
                                            Sign In
                                        </Link>
                                    </div>
                                )}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
