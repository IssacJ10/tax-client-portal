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
                    "fixed top-0 left-0 right-0 z-50 h-[80px] transition-all duration-500",
                    isAppMode
                        ? "bg-gradient-to-r from-gray-950 via-slate-950 to-gray-950 backdrop-blur-xl border-b border-white/5 shadow-2xl"
                        : scrolled
                            ? "bg-gradient-to-r from-gray-950/98 via-slate-950/98 to-gray-950/98 backdrop-blur-xl border-b border-white/5 shadow-2xl"
                            : "bg-gradient-to-r from-gray-950/90 via-slate-950/85 to-gray-950/90 backdrop-blur-lg"
                )}
            >
                <div className="container mx-auto h-full px-6 md:px-8 flex items-center justify-between">

                    {/* LEFT: Logo */}
                    <Link href={mounted && localStorage.getItem("tax-auth-token") ? "/dashboard" : "/"} className="flex items-center gap-4 group">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00754a] text-white shadow-lg shadow-[#00754a]/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-300">
                            <span className="font-bold text-base tracking-tight text-white">TP</span>
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight group-hover:text-white/90 transition-colors">
                            TaxPortal
                        </span>
                    </Link>

                    {/* CENTER: Marketing Nav (Only on Home) */}
                    {isHome && (
                        <nav className="hidden md:flex items-center gap-10">
                            {menuItems.map((item) => (
                                <Link
                                    key={item}
                                    href={`/#${item.toLowerCase()}`}
                                    className="text-base font-medium text-white/80 hover:text-white transition-colors"
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
                                    <span className="absolute top-2 right-2.5 h-2 w-2 bg-[#00754a] rounded-full border-2 border-gray-950"></span>
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

                        {/* Hamburger / Menu - Stylish Design */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="relative h-12 w-12 flex flex-col items-center justify-center gap-[6px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                        >
                            <span className="w-5 h-[2px] bg-white/80 group-hover:bg-white rounded-full transition-all duration-300 group-hover:w-6" />
                            <span className="w-6 h-[2px] bg-white rounded-full transition-all duration-300" />
                            <span className="w-4 h-[2px] bg-white/80 group-hover:bg-white rounded-full transition-all duration-300 group-hover:w-6" />
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
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 border-l border-white/10 z-[70] p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-xl font-bold text-white tracking-tight">
                                    {isAppMode ? "Account" : "Menu"}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="rounded-full hover:bg-white/10">
                                    <X className="h-5 w-5 text-white/70" />
                                </Button>
                            </div>

                            <nav className="flex flex-col space-y-1">
                                {isAppMode ? (
                                    // --- APP MODE MENU (Logout Only) ---
                                    <div className="space-y-4">
                                        {/* Restored Mobile Links for Mail/Settings */}
                                        <div className="space-y-1">
                                            <Link
                                                href="#"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                            >
                                                <Mail className="h-5 w-5" />
                                                Messages
                                            </Link>
                                            <Link
                                                href="/dashboard/profile"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                            >
                                                <Settings2 className="h-5 w-5" />
                                                Settings
                                            </Link>
                                        </div>

                                        <div className="h-px bg-white/10 my-2" />

                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 text-base font-medium text-red-400 hover:bg-red-500/10 px-4 py-3 rounded-xl transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    // --- MARKETING MODE MENU ---
                                    <>
                                        {menuItems.map((item) => (
                                            <Link
                                                key={item}
                                                href={`/#${item.toLowerCase()}`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="text-lg font-medium text-white/70 hover:text-white hover:bg-white/10 px-4 py-3 rounded-xl transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        ))}
                                        <div className="h-px bg-white/10 my-6" />
                                        <div className="space-y-2">
                                            <Link href="/auth/login" className="flex items-center justify-center w-full py-3 text-base font-medium text-white bg-[#00754a] rounded-xl hover:bg-[#006640] transition-colors shadow-lg shadow-[#00754a]/20">Sign In</Link>
                                        </div>
                                    </>
                                )}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
