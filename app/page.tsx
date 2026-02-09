"use client"

import { useEffect, useRef } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Check, Shield, Zap, Users, FileText, TrendingUp, ArrowRight, Star, BookOpen, Banknote, Percent, Building2, Phone, Mail, MapPin, Clock, CalendarCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"

// --- Animation Variants (optimized for speed) ---
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

const fadeUpSlow = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const staggerContainerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function HomePage() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })

  // Redirect to dashboard if logged in with a valid (non-expired) token
  useEffect(() => {
    const token = localStorage.getItem("tax-auth-token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (Date.now() < payload.exp * 1000) {
          router.push("/dashboard")
        } else {
          localStorage.removeItem("tax-auth-token")
          localStorage.removeItem("tax-auth-user")
          localStorage.removeItem("tax-refresh-token")
        }
      } catch {
        localStorage.removeItem("tax-auth-token")
        localStorage.removeItem("tax-auth-user")
        localStorage.removeItem("tax-refresh-token")
      }
    }
  }, [router])

  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "40%"])
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const handleStartFiling = () => {
    const token = localStorage.getItem("tax-auth-token")
    let isValid = false
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        isValid = Date.now() < payload.exp * 1000
      } catch { /* invalid token */ }
    }
    if (isValid) {
      router.push("/filing/new")
    } else {
      router.push("/auth/login?tab=register")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1 relative">

        {/* ═══════════════════════════════════════════════
            HERO — Full Viewport, Centered, Cinematic
        ═══════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4">

            {/* Center text content */}
            <motion.div
              style={{ y: yText, opacity: opacityHero }}
              className="relative z-10 text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainerSlow}
                className="flex flex-col items-center"
              >
                {/* Badge */}
                <motion.div variants={fadeUp} className="mb-8">
                  <div className="inline-flex items-center rounded-full border border-[#07477a]/20 bg-[#07477a]/10 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-[#07477a]">
                    <span className="flex h-2 w-2 rounded-full bg-[#07477a] mr-2 animate-pulse" />
                    Accepting New Clients
                  </div>
                </motion.div>

                {/* H1 */}
                <motion.h1 variants={fadeUpSlow} className="text-5xl font-bold tracking-tight sm:text-7xl mb-6 text-gray-900 leading-[1.1]">
                  Tax filing, <br />
                  <span className="text-[#07477a]">reimagined.</span>
                </motion.h1>

                {/* Description */}
                <motion.p variants={fadeUp} className="text-xl text-gray-600 font-medium leading-relaxed mb-10 max-w-lg">
                  Reliable, affordable, and expert tax services tailored to individuals and small businesses.
                </motion.p>

                {/* Buttons */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-8">
                  <button
                    onClick={handleStartFiling}
                    data-testid="hero-cta"
                    className="inline-flex h-14 items-center justify-center rounded-full bg-[#07477a] px-8 text-lg font-semibold text-white shadow-lg shadow-[#07477a]/25 transition-colors duration-150 hover:bg-[#053560] active:scale-[0.97] active:transition-none touch-manipulation"
                  >
                    Start Your Filing <ArrowRight className="ml-2 h-5 w-5" />
                  </button>

                  <Button variant="outline" size="lg" className="h-14 rounded-full px-8 text-lg border-[#07477a]/30 bg-white/50 backdrop-blur-sm hover:bg-white/80 text-gray-900" asChild>
                    <Link href="/auth/login">Client Login</Link>
                  </Button>
                </motion.div>

                {/* Trust indicators */}
                <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-[#07477a]/50" /> 500+ Clients</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-[#07477a]/50" /> CPA Certified</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#07477a]/50" /> AES-256 Encrypted</span>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Hero image — lady with paper/pen (place accountant-hero.png in /public/images/) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" as const }}
              className="absolute right-0 sm:right-[2%] lg:right-[5%] top-[32%] -translate-y-1/2 sm:translate-y-0 sm:top-auto sm:bottom-0 z-5 pointer-events-none transform-gpu"
            >
              <Image
                src="/images/accountant-hero.png"
                alt="Professional accountant"
                width={380}
                height={500}
                className="object-contain drop-shadow-2xl w-[150px] sm:w-[220px] md:w-[300px] lg:w-[380px]"
                priority
              />
            </motion.div>

            {/* Orbiting glassmorphic cards — solar system style */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes counterSpin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
              `}} />

              {/* Orbit center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">

                {/* Visible orbit ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] sm:w-[520px] sm:h-[520px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] rounded-full border border-dashed border-[#07477a]/10" />

                {/* Spinning ring — all 4 cards placed on this single rotating disc */}
                <div
                  className="absolute top-1/2 left-1/2 w-0 h-0"
                  style={{ animation: "orbitSpin 30s linear infinite" }}
                >
                  {/* Card 1: top — responsive positions via separate elements */}
                  {/* Mobile */}
                  <div className="absolute sm:hidden" style={{ top: "-240px", left: "-60px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 w-[120px]">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-3 w-3 text-[#07477a]" /></div>
                        <div><p className="text-[8px] text-gray-500 font-medium">Deadline</p><p className="text-[10px] font-bold text-[#07477a]">Apr 30</p></div>
                      </div>
                    </div>
                  </div>
                  {/* sm+ */}
                  <div className="absolute hidden sm:block md:hidden" style={{ top: "-220px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Next Deadline</p><p className="text-sm font-bold text-[#07477a]">Apr 30, 2026</p></div>
                      </div>
                    </div>
                  </div>
                  {/* md+ */}
                  <div className="absolute hidden md:block lg:hidden" style={{ top: "-280px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Next Deadline</p><p className="text-sm font-bold text-[#07477a]">Apr 30, 2026</p></div>
                      </div>
                    </div>
                  </div>
                  {/* lg+ */}
                  <div className="absolute hidden lg:block" style={{ top: "-350px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[200px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Next Deadline</p><p className="text-sm font-bold text-[#07477a]">Apr 30, 2026</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: right (90°) */}
                  <div className="absolute sm:hidden" style={{ top: "-16px", left: "165px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 w-[115px]">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><Zap className="h-3 w-3 text-[#07477a]" /></div>
                        <div><p className="text-[8px] text-gray-500 font-medium">Turnaround</p><p className="text-[10px] font-bold text-[#07477a]">24 Hours</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden sm:block md:hidden" style={{ top: "-20px", left: "125px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Turnaround</p><p className="text-sm font-bold text-[#07477a]">24 Hours</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden md:block lg:hidden" style={{ top: "-20px", left: "185px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Turnaround</p><p className="text-sm font-bold text-[#07477a]">24 Hours</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden lg:block" style={{ top: "-20px", left: "255px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Turnaround</p><p className="text-sm font-bold text-[#07477a]">24 Hours</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: bottom (180°) */}
                  <div className="absolute sm:hidden" style={{ top: "200px", left: "-60px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 w-[120px]">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-3 w-3 text-[#07477a]" /></div>
                        <div><p className="text-[8px] text-gray-500 font-medium">Pricing</p><p className="text-[10px] font-bold text-[#07477a]">Transparent</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden sm:block md:hidden" style={{ top: "180px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Pricing</p><p className="text-sm font-bold text-[#07477a]">Guaranteed Rates</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden md:block lg:hidden" style={{ top: "240px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Pricing</p><p className="text-sm font-bold text-[#07477a]">Guaranteed Rates</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden lg:block" style={{ top: "310px", left: "-95px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[190px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><CalendarCheck className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Pricing</p><p className="text-sm font-bold text-[#07477a]">Guaranteed Rates</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: left (270°) */}
                  <div className="absolute sm:hidden" style={{ top: "-16px", left: "-280px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 w-[115px]">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><FileText className="h-3 w-3 text-[#07477a]" /></div>
                        <div><p className="text-[8px] text-gray-500 font-medium">Services</p><p className="text-[10px] font-bold text-[#07477a]">6 Types</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden sm:block md:hidden" style={{ top: "-20px", left: "-310px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[185px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Services</p><p className="text-sm font-bold text-[#07477a]">6 Offerings</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden md:block lg:hidden" style={{ top: "-20px", left: "-370px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[185px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Services</p><p className="text-sm font-bold text-[#07477a]">6 Offerings</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden lg:block" style={{ top: "-20px", left: "-440px" }}>
                    <div style={{ animation: "counterSpin 30s linear infinite" }}>
                      <div className="bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 w-[185px]">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#07477a]/20 to-[#07477a]/5 border border-[#07477a]/20 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-[#07477a]" /></div>
                        <div><p className="text-[10px] text-gray-500 font-medium">Services</p><p className="text-sm font-bold text-[#07477a]">6 Offerings</p></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            STATS STRIP
        ═══════════════════════════════════════════════ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="border-y border-[#07477a]/10 bg-white/60 backdrop-blur-2xl"
        >
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {[
                { label: "Active Clients", val: "500+", icon: Users },
                { label: "Tax Saved", val: "$2M+", icon: TrendingUp },
                { label: "Turnaround", val: "24h", icon: Zap },
                { label: "Security", val: "AES-256", icon: Shield },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="relative">
                    <stat.icon className="h-6 w-6 text-[#07477a]/60 group-hover:text-[#07477a] transition-colors duration-150 relative z-10" />
                    <div className="absolute inset-0 bg-[#07477a]/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 scale-[3]" />
                  </div>
                  <span className="text-4xl sm:text-5xl font-bold text-[#07477a] tracking-tight">{stat.val}</span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            SERVICES
        ═══════════════════════════════════════════════ */}
        <section id="features" className="py-36 relative bg-transparent">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="text-center mb-20"
            >
              <motion.h2 variants={fadeUpSlow} className="text-4xl font-bold sm:text-6xl mb-6 text-gray-900 tracking-tight">
                Expert services tailored to you.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                From personal filing to corporate accounting, we handle it all.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {/* 1. PERSONAL TAX */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Users className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Personal Tax</h3>
                <p className="text-sm text-gray-500 mb-6">Maximize refunds for individuals & families.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> T1 General Filing</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> RRSP & Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#07477a]/20 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all duration-150 font-semibold text-sm" onClick={handleStartFiling}>
                  Get Started
                </Button>
              </motion.div>

              {/* 2. BUSINESS TAX — Featured */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#07477a]/[0.08] via-white/80 to-[#3b9cc2]/[0.08] backdrop-blur-xl border-2 border-[#07477a]/30 rounded-3xl p-8 relative shadow-2xl shadow-[#07477a]/15 ring-1 ring-[#07477a]/10 hover:shadow-[0_25px_60px_rgba(7,71,122,0.2)] hover:-translate-y-3 transition-all duration-200 group cursor-pointer">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#07477a] to-[#053560] px-4 py-1.5 text-[10px] font-bold text-white rounded-bl-xl rounded-tr-3xl tracking-wider uppercase">Popular</div>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/25 to-[#3b9cc2]/15 border border-[#07477a]/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/25 transition-all duration-200">
                  <FileText className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Business Tax (T2)</h3>
                <p className="text-sm text-gray-500 mb-6">Corporate filing & compliance.</p>
                <ul className="space-y-3 text-sm text-gray-900 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Corporate Returns</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Financial Statements</li>
                </ul>
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#07477a] to-[#053560] text-white hover:opacity-90 font-semibold shadow-lg shadow-[#07477a]/25 text-sm transition-all duration-150" onClick={handleStartFiling}>
                  File Corporate
                </Button>
              </motion.div>

              {/* 3. BOOKKEEPING */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <BookOpen className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bookkeeping</h3>
                <p className="text-sm text-gray-500 mb-6">Monthly tracking & organization.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Monthly/Quarterly</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Expense Tracking</li>
                </ul>
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#07477a]/20 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all duration-150 font-semibold text-sm" onClick={handleStartFiling}>
                  Book Service
                </Button>
              </motion.div>

              {/* 4. PAYROLL */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Banknote className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Payroll Services</h3>
                <p className="text-sm text-gray-500 mb-6">Employee payments & T4s.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Deductions Mgmt</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> T4/T4A Filing</li>
                </ul>
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#07477a]/20 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all duration-150 font-semibold text-sm" onClick={handleStartFiling}>
                  Learn More
                </Button>
              </motion.div>

              {/* 5. GST/HST FILING */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Percent className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">GST/HST Filing</h3>
                <p className="text-sm text-gray-500 mb-6">Remittance & compliance checks.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> CRA Compliance</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Input Tax Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#07477a]/20 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all duration-150 font-semibold text-sm" onClick={handleStartFiling}>
                  Start Filing
                </Button>
              </motion.div>

              {/* 6. BUSINESS REGISTRATION */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Building2 className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Business Reg</h3>
                <p className="text-sm text-gray-500 mb-6">Incorporation & startup setup.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Incorporation</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> CRA Account Setup</li>
                </ul>
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#07477a]/20 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all duration-150 font-semibold text-sm" onClick={handleStartFiling}>
                  Register Now
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            LIFESTYLE SECTION (Edge-to-Edge 50/50)
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Text — Green Background */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 lg:order-1 bg-[#07477a]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={staggerContainerSlow}
                className="max-w-xl"
              >
                <motion.h2 variants={fadeUpSlow} className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
                  Focus on your work. <br />
                  <span className="text-white/80">We handle the rest.</span>
                </motion.h2>
                <motion.p variants={fadeUp} className="text-xl text-white/90 mb-10 font-medium leading-relaxed">
                  JJ Elevate bridges the gap between complex tax laws and modern technology. We use AI to find every deduction, and human experts to verify every cent.
                </motion.p>

                <motion.div variants={fadeUp} className="flex items-center gap-4 mb-16">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 w-12 rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                        <span className="text-xs text-white font-medium">User</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                    <p className="text-sm font-medium text-white">Rated 5.0 by 500+ locals</p>
                  </div>
                </motion.div>

                {/* Floating Cards */}
                <motion.div variants={fadeUp} className="relative h-[150px] w-full max-w-md hidden sm:block">
                  <motion.div
                    className="absolute top-0 right-0 w-[240px] h-[80px] bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl z-20 flex items-center gap-4 border border-white/50"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="h-10 w-10 bg-[#07477a]/15 rounded-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-[#07477a]" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-sm">Tax Document Preview</p>
                      <p className="text-[#07477a] text-xs">Ready for review</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-0 left-0 w-[260px] h-[90px] bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex items-center gap-4 z-30 border border-white/50"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="h-12 w-12 bg-[#07477a]/20 rounded-full flex items-center justify-center">
                      <Check className="h-6 w-6 text-[#07477a]" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-lg">Filed Successfully</p>
                      <p className="text-[#07477a] text-xs">Just now</p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Right Column: Image */}
            <div className="relative h-[400px] lg:h-auto w-full order-1 lg:order-2">
              <Image
                src="/images/client-relationship.png"
                alt="Professional client meeting"
                fill
                className="object-cover"
                quality={90}
                priority
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07477a] to-transparent lg:hidden" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            ABOUT (Edge-to-Edge 50/50 Flipped)
        ═══════════════════════════════════════════════ */}
        <section id="about" className="relative w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Image */}
            <div className="relative h-[400px] lg:h-auto w-full order-1">
              <Image
                src="/images/focused-accountant.png"
                alt="Focused JJ Elevate Accountant"
                fill
                className="object-cover"
                quality={90}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute bottom-6 left-6 right-6 hidden sm:block"
              >
                <div className="bg-white/90 backdrop-blur-xl rounded-xl p-4 border border-white/50 shadow-lg max-w-xs mx-auto lg:mx-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#07477a]/15 flex items-center justify-center">
                      <Users className="h-6 w-6 text-[#07477a]" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Dedicated Team</p>
                      <p className="text-xs text-[#07477a]">Certified Professionals</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Text — Green Background */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 bg-[#07477a]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={staggerContainerSlow}
                className="max-w-xl"
              >
                <motion.div variants={fadeUp} className="inline-flex items-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-6">
                  About JJ Elevate
                </motion.div>
                <motion.h2 variants={fadeUpSlow} className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                  Your Partners in <span className="text-white/80">Growth</span>.
                </motion.h2>
                <motion.p variants={fadeUp} className="text-lg text-white/90 leading-relaxed mb-6">
                  We provide reliable, affordable, and expert tax services tailored to individuals and small businesses across Canada.
                </motion.p>
                <motion.p variants={fadeUp} className="text-lg text-white/90 leading-relaxed mb-8">
                  Our mission is simple: to simplify accounting so you can focus on what matters—growing your business. Whether you need help with personal filing, corporate returns, or daily bookkeeping, we ensure accuracy, compliance, and maximum deductions.
                </motion.p>

                <motion.ul variants={staggerContainer} className="space-y-4 pt-4 mb-8">
                  {[
                    "Guaranteed Rates & Transparent Pricing",
                    "CPA-Certified Review",
                    "Year-Round Support (We don't disappear after April!)"
                  ].map((item, i) => (
                    <motion.li key={i} variants={fadeUp} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-medium text-white">{item}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div variants={fadeUp} className="pt-2">
                  <Button size="lg" className="rounded-full px-8 font-semibold bg-white hover:bg-white/90 text-[#07477a] shadow-lg transition-all duration-150 hover:shadow-xl" asChild>
                    <Link href="#contact">Contact Support</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      {/* ═══════════════════════════════════════════════
          CONTACT SECTION
      ═══════════════════════════════════════════════ */}
      <section id="contact" className="py-32 relative bg-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.h2 variants={fadeUpSlow} className="text-4xl font-bold sm:text-6xl mb-6 text-gray-900 tracking-tight">
              Get in Touch
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              We're here to help. Reach out to us for any questions or to schedule a consultation.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto"
          >
            {/* Phone */}
            <motion.a
              variants={fadeUp}
              href="tel:+17057703951"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl hover:border-[#07477a]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="h-14 w-14 rounded-2xl bg-[#07477a]/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all duration-200 relative z-10">
                <Phone className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Call Us</h3>
              <p className="text-gray-500 font-medium mb-4 relative z-10">(705) 770-3951</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-4 py-1.5 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-all duration-150 relative z-10">
                Click to Call
              </span>
            </motion.a>

            {/* Email */}
            <motion.a
              variants={fadeUp}
              href="mailto:Contact@jjelevateas.com"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl hover:border-[#07477a]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="h-14 w-14 rounded-2xl bg-[#07477a]/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all duration-200 relative z-10">
                <Mail className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Email Us</h3>
              <p className="text-gray-500 font-medium break-all mb-4 relative z-10 text-sm">Contact@jjelevateas.com</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-4 py-1.5 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-all duration-150 relative z-10">
                Click to Email
              </span>
            </motion.a>

            {/* Address */}
            <motion.a
              variants={fadeUp}
              href="https://www.google.com/maps/dir/?api=1&destination=46.2504142,-63.1430307"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl hover:border-[#07477a]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="h-14 w-14 rounded-2xl bg-[#07477a]/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all duration-200 relative z-10">
                <MapPin className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Visit Us</h3>
              <p className="text-gray-500 font-medium mb-4 relative z-10 text-sm">37-64 Belvedere Ave<br />Charlottetown, PE</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-4 py-1.5 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-all duration-150 relative z-10">
                Click for Directions
              </span>
            </motion.a>

            {/* Hours */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl hover:border-[#07477a]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 group text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="h-14 w-14 rounded-2xl bg-[#07477a]/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all duration-200 relative z-10">
                <Clock className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Office Hours</h3>
              <p className="text-gray-500 font-medium mb-4 relative z-10 text-sm">Open 24/7 during tax season<br /><span className="text-xs text-[#07477a]/70">5:00 PM - 11:00 PM local time off-season</span></p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-4 py-1.5 rounded-full relative z-10">
                24/7 Tax Season
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
