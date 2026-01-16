"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, Mail, Settings2 } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/context/session-provider"

export function SiteHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
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
                    "fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300",
                    isAppMode
                        ? "bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-gray-800"
                        : scrolled ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800" : "bg-transparent"
                )}
            >
                <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between">

                    {/* LEFT: Logo */}
                    <Link href={mounted && localStorage.getItem("tax-auth-token") ? "/dashboard" : "/"} className="flex items-center gap-3 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm ring-1 ring-black/5 group-hover:scale-105 transition-transform duration-300">
                            <span className="font-bold text-sm tracking-tight text-white">TP</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            TaxPortal
                        </span>
                    </Link>

                    {/* CENTER: Marketing Nav (Only on Home) */}
                    {isHome && (
                        <nav className="hidden md:flex items-center gap-8">
                            {menuItems.map((item) => (
                                <Link
                                    key={item}
                                    href={`/#${item.toLowerCase()}`}
                                    className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    {item}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-1 md:gap-2">

                        {/* App Mode Actions */}
                        {isAppMode && (
                            <>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 relative">
                                    <Mail className="h-5 w-5" strokeWidth={2} />
                                    {/* Notification Dot */}
                                    <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-red-500 rounded-full border border-white dark:border-slate-950"></span>
                                </Button>

                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800" asChild>
                                    <Link href="/dashboard/profile">
                                        <Settings2 className="h-5 w-5" strokeWidth={2} />
                                    </Link>
                                </Button>
                            </>
                        )}

                        {/* Separator only if we have app actions and menu */}
                        {isAppMode && <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>}

                        {/* Hamburger / Menu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(true)}
                            className="h-9 w-9 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <Menu className="h-5 w-5" strokeWidth={2} />
                        </Button>

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
                            className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-950 border-l border-gray-100 dark:border-gray-800 z-[70] p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {isAppMode ? "Account" : "Menu"}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
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
                                                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            >
                                                <Mail className="h-5 w-5" />
                                                Messages
                                            </Link>
                                            <Link
                                                href="/dashboard/profile"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            >
                                                <Settings2 className="h-5 w-5" />
                                                Settings
                                            </Link>
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-3 rounded-xl transition-colors"
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
                                                className="text-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 rounded-xl transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        ))}
                                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-6" />
                                        <div className="space-y-2">
                                            <Link href="/auth/login" className="flex items-center justify-center w-full py-3 text-base font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">Sign In</Link>
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
