"use client"

import { useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Check, Shield, Zap, Users, FileText, TrendingUp, ArrowRight, Star, BookOpen, Banknote, Percent, Building2, Phone, Mail, MapPin, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { ParallaxBackground } from "@/components/ui/parallax-background"

export default function HomePage() {
  const router = useRouter()
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  })

  // Redirect to dashboard if logged in
  useEffect(() => {
    const token = localStorage.getItem("tax-auth-token")
    if (token) {
      router.push("/dashboard")
    }
  }, [router])

  // Hero Parallax Values
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const yGraphic = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"])
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const handleStartFiling = () => {
    const isAuthenticated = localStorage.getItem("tax-auth-token")
    if (isAuthenticated) {
      router.push("/filing/new")
    } else {
      router.push("/auth/login?tab=register")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent overflow-x-hidden">
      {/* Parallax Background */}
      <ParallaxBackground />

      <SiteHeader />

      <main className="flex-1 relative">
        {/* HERO SECTION */}
        <section ref={targetRef} className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text Content */}
            <motion.div style={{ y: yText, opacity: opacityHero }} className="z-10">
              <div className="inline-flex items-center rounded-full border border-[#07477a]/20 bg-[#07477a]/10 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-[#07477a] mb-8">
                <span className="flex h-2 w-2 rounded-full bg-[#07477a] mr-2 animate-pulse"></span>
                Accepting New Clients for 2025
              </div>

              <h1 className="text-5xl font-bold tracking-tight sm:text-7xl mb-6 text-gray-900 leading-[1.1]">
                Tax filing, <br />
                <span className="inline-block pb-2 text-[#07477a]">
                  reimagined.
                </span>
              </h1>

              <p className="text-xl text-gray-600 font-medium leading-relaxed mb-10 max-w-lg">
                Reliable, affordable, and expert tax services tailored to individuals and small businesses.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartFiling}
                  data-testid="hero-cta"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-[#07477a] px-8 text-lg font-semibold text-white shadow-lg shadow-[#07477a]/25 transition-all hover:bg-[#053560] hover:scale-105 active:scale-95"
                >
                  Start Your Filing <ArrowRight className="ml-2 h-5 w-5" />
                </button>

                <Button variant="outline" size="lg" className="h-14 rounded-full px-8 text-lg border-[#07477a]/30 bg-white/50 backdrop-blur-sm hover:bg-white/80 text-gray-900" asChild>
                  <Link href="/auth/login">Client Login</Link>
                </Button>
              </div>
            </motion.div>

            {/* Right: Floating UI Visualization - Green Gradient Glassmorphic */}
            <motion.div style={{ y: yGraphic, opacity: opacityHero }} className="relative h-[600px] w-full hidden lg:block perspective-1000">
              {/* Main Dashboard Card - Green Glassmorphic */}
              <motion.div
                className="absolute top-10 left-10 w-[400px] h-[500px] bg-gradient-to-br from-[#07477a]/20 via-white/80 to-[#07477a]/10 backdrop-blur-xl border border-[#07477a]/20 rounded-3xl shadow-2xl z-20 overflow-hidden"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="h-14 border-b border-[#07477a]/20 flex items-center px-6 gap-2 bg-gradient-to-r from-[#07477a]/20 to-[#07477a]/5">
                  <div className="w-3 h-3 rounded-full bg-[#07477a]/30" />
                  <div className="w-3 h-3 rounded-full bg-[#07477a]/50" />
                  <div className="w-3 h-3 rounded-full bg-[#07477a]" />
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-[#07477a]/20 rounded-full" />
                    <div className="h-12 w-full bg-gradient-to-r from-[#07477a]/15 to-[#07477a]/5 rounded-xl border border-[#07477a]/20 flex items-center px-4 text-[#07477a] font-mono text-xl font-bold">
                      $4,250.00
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="h-2 w-full bg-[#07477a]/15 rounded-full" />
                    <div className="h-2 w-3/4 bg-[#07477a]/25 rounded-full" />
                    <div className="h-2 w-5/6 bg-[#07477a]/10 rounded-full" />
                  </div>
                  <div className="pt-8">
                    <div className="h-32 w-full bg-gradient-to-tr from-[#07477a]/20 via-[#07477a]/5 to-[#07477a]/15 rounded-2xl border border-[#07477a]/15 flex items-center justify-center backdrop-blur-sm">
                      <TrendingUp className="h-12 w-12 text-[#07477a]/60" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Background Floating Card - Green Gradient */}
              <motion.div
                className="absolute top-32 right-10 w-[350px] h-[400px] bg-gradient-to-br from-[#07477a]/25 via-[#07477a]/10 to-[#07477a]/20 backdrop-blur-md border border-[#07477a]/20 rounded-3xl shadow-xl z-10"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />

              {/* Small Floating Badge - Green Glassmorphic */}
              <motion.div
                className="absolute bottom-20 -left-10 bg-gradient-to-br from-white/90 via-[#07477a]/10 to-white/80 backdrop-blur-xl border border-[#07477a]/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl z-30"
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#07477a]/30 to-[#07477a]/10 flex items-center justify-center border border-[#07477a]/20">
                  <Check className="h-6 w-6 text-[#07477a]" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold">Audit Shield</p>
                  <p className="text-xs text-[#07477a]">Active Protection</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* --- STATS STRIP - Glassmorphic White with Green Text --- */}
        <div className="border-y border-[#07477a]/10 bg-white/60 backdrop-blur-md">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Active Clients", val: "500+", icon: Users },
                { label: "Tax Saved", val: "$2M+", icon: TrendingUp },
                { label: "Turnaround", val: "24h", icon: Zap },
                { label: "Security", val: "AES-256", icon: Shield },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center gap-2 group">
                  <stat.icon className="h-6 w-6 text-[#07477a]/60 group-hover:text-[#07477a] transition-colors duration-500" />
                  <span className="text-3xl font-bold text-[#07477a] tracking-tight">{stat.val}</span>
                  <span className="text-xs font-semibold text-[#07477a]/70 uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SERVICES - Clean Glassmorphic Cards (No Lime) --- */}
        <section id="features" className="py-32 relative bg-transparent">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold sm:text-5xl mb-6 text-gray-900">Expert services tailored to you.</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From personal filing to corporate accounting, we handle it all.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. PERSONAL TAX - Glassmorphic */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg hover:border-[#07477a]/30 hover:bg-white/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20 flex items-center justify-center mb-6 group-hover:bg-[#07477a]/15 transition-colors">
                  <Users className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Personal Tax</h3>
                <p className="text-sm text-gray-600 mb-6">Maximize refunds for individuals & families.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> T1 General Filing</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> RRSP & Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-[#07477a]/30 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Get Started
                </Button>
              </div>

              {/* 2. BUSINESS TAX - Featured Glassmorphic */}
              <div className="bg-white/80 backdrop-blur-xl border-2 border-[#07477a]/40 rounded-2xl p-6 relative shadow-lg shadow-[#07477a]/10">
                <div className="absolute top-0 right-0 bg-[#07477a] px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl rounded-tr-xl">POPULAR</div>
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/15 border border-[#07477a]/30 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Business Tax (T2)</h3>
                <p className="text-sm text-gray-600 mb-6">Corporate filing & compliance.</p>
                <ul className="space-y-3 text-sm text-gray-900 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Corporate Returns</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Financial Statements</li>
                </ul>
                <Button className="w-full h-10 rounded-lg bg-[#07477a] text-white hover:bg-[#053560] font-semibold shadow-lg shadow-[#07477a]/25 text-sm" onClick={handleStartFiling}>
                  File Corporate
                </Button>
              </div>

              {/* 3. BOOKKEEPING - Glassmorphic */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg hover:border-[#07477a]/30 hover:bg-white/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20 flex items-center justify-center mb-6 group-hover:bg-[#07477a]/15 transition-colors">
                  <BookOpen className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bookkeeping</h3>
                <p className="text-sm text-gray-600 mb-6">Monthly tracking & organization.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Monthly/Quarterly</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Expense Tracking</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-[#07477a]/30 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Book Service
                </Button>
              </div>

              {/* 4. PAYROLL - Glassmorphic */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg hover:border-[#07477a]/30 hover:bg-white/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20 flex items-center justify-center mb-6 group-hover:bg-[#07477a]/15 transition-colors">
                  <Banknote className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Payroll Services</h3>
                <p className="text-sm text-gray-600 mb-6">Employee payments & T4s.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Deductions Mgmt</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> T4/T4A Filing</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-[#07477a]/30 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Learn More
                </Button>
              </div>

              {/* 5. GST/HST FILING - Glassmorphic */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg hover:border-[#07477a]/30 hover:bg-white/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20 flex items-center justify-center mb-6 group-hover:bg-[#07477a]/15 transition-colors">
                  <Percent className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">GST/HST Filing</h3>
                <p className="text-sm text-gray-600 mb-6">Remittance & compliance checks.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> CRA Compliance</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Input Tax Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-[#07477a]/30 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Start Filing
                </Button>
              </div>

              {/* 6. BUSINESS REGISTRATION - Glassmorphic */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:shadow-lg hover:border-[#07477a]/30 hover:bg-white/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20 flex items-center justify-center mb-6 group-hover:bg-[#07477a]/15 transition-colors">
                  <Building2 className="h-6 w-6 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Business Reg</h3>
                <p className="text-sm text-gray-600 mb-6">Incorporation & startup setup.</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> Incorporation</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#07477a]" /> CRA Account Setup</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-[#07477a]/30 bg-white/50 hover:bg-[#07477a] hover:text-white hover:border-[#07477a] transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Register Now
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- LIFESTYLE SECTION (Edge-to-Edge 50/50) --- */}
        <section className="relative w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Text & Graphics - GREEN BACKGROUND */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 lg:order-1 bg-[#07477a]">
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
                  Focus on your work. <br />
                  <span className="text-white/80">We handle the rest.</span>
                </h2>
                <p className="text-xl text-white/90 mb-10 font-medium leading-relaxed">
                  JJ Elevate bridges the gap between complex tax laws and modern technology. We use AI to find every deduction, and human experts to verify every cent.
                </p>

                <div className="flex items-center gap-4 mb-16">
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
                </div>

                {/* Floating Cards Graphic - Glassmorphic */}
                <div className="relative h-[150px] w-full max-w-md hidden sm:block">
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
                </div>
              </div>
            </div>

            {/* Right Column: Image Content */}
            <div className="relative h-[400px] lg:h-auto w-full order-1 lg:order-2">
              <Image
                src="/images/client-relationship.png"
                alt="Professional client meeting"
                fill
                className="object-cover"
                quality={90}
                priority
              />
              {/* Gradient for smooth transition on mobile */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07477a] to-transparent lg:hidden" />
            </div>
          </div>
        </section>

        {/* --- ABOUT (Edge-to-Edge 50/50 Flipped) --- */}
        <section id="about" className="relative w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Image (Flipped to Left) */}
            <div className="relative h-[400px] lg:h-auto w-full order-1">
              <Image
                src="/images/focused-accountant.png"
                alt="Focused JJ Elevate Accountant"
                fill
                className="object-cover"
                quality={90}
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

              {/* Floating Badge - Glassmorphic */}
              <div className="absolute bottom-6 left-6 right-6 hidden sm:block">
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
              </div>
            </div>

            {/* Right Column: Text Content - GREEN BACKGROUND */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 bg-[#07477a]">
              <div className="max-w-xl">
                <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white mb-6">
                  About JJ Elevate
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                  Your Partners in <span className="text-white/80">Growth</span>.
                </h2>
                <p className="text-lg text-white/90 leading-relaxed mb-6">
                  We provide reliable, affordable, and expert tax services tailored to individuals and small businesses across Canada.
                </p>
                <p className="text-lg text-white/90 leading-relaxed mb-8">
                  Our mission is simple: to simplify accounting so you can focus on what matters—growing your business. Whether you need help with personal filing, corporate returns, or daily bookkeeping, we ensure accuracy, compliance, and maximum deductions.
                </p>

                <ul className="space-y-4 pt-4 mb-8">
                  {[
                    "Guaranteed Rates & Transparent Pricing",
                    "CPA-Certified Review on Every Return",
                    "Year-Round Support (We don't disappear after April!)"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-medium text-white">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button size="lg" className="rounded-full px-8 font-semibold bg-white hover:bg-white/90 text-[#07477a] shadow-lg" asChild>
                    <Link href="#contact">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* --- CONTACT SECTION - Clean Glassmorphic Cards --- */}
      <section id="contact" className="py-24 relative bg-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-5xl mb-6 text-gray-900">Get in Touch</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're here to help. Reach out to us for any questions or to schedule a consultation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {/* Phone - Click to Call - Glassmorphic */}
            <a
              href="tel:+17057703951"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-[#07477a]/20 shadow-lg rounded-3xl hover:border-[#07477a] hover:shadow-xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-[#07477a]/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all relative z-10">
                <Phone className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Call Us</h3>
              <p className="text-gray-600 font-medium mb-4 relative z-10">(705) 770-3951</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-3 py-1 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-colors relative z-10">
                Click to Call
              </span>
            </a>

            {/* Email - Click to Mail - Glassmorphic */}
            <a
              href="mailto:jjelevateservices@gmail.com"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-[#07477a]/20 shadow-lg rounded-3xl hover:border-[#07477a] hover:shadow-xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-[#07477a]/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all relative z-10">
                <Mail className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Email Us</h3>
              <p className="text-gray-600 font-medium break-all mb-4 relative z-10 text-sm">jjelevateservices@gmail.com</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-3 py-1 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-colors relative z-10">
                Click to Email
              </span>
            </a>

            {/* Address - Click for Directions - Glassmorphic */}
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Charlottetown,+PE"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-[#07477a]/20 shadow-lg rounded-3xl hover:border-[#07477a] hover:shadow-xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-[#07477a]/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all relative z-10">
                <MapPin className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Visit Us</h3>
              <p className="text-gray-600 font-medium mb-4 relative z-10 text-sm">37-64 Belvedere Ave<br />Charlottetown, PE</p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-3 py-1 rounded-full group-hover:bg-[#07477a] group-hover:text-white transition-colors relative z-10">
                Click for Directions
              </span>
            </a>

            {/* Hours - Static Info - Glassmorphic */}
            <div className="flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl border border-[#07477a]/20 shadow-lg rounded-3xl hover:border-[#07477a] hover:shadow-xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 group text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#07477a]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-[#07477a]/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#07477a]/15 transition-all relative z-10">
                <Clock className="h-6 w-6 text-[#07477a]" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 relative z-10">Office Hours</h3>
              <p className="text-gray-600 font-medium mb-4 relative z-10 text-sm">Mon - Fri: 9:00 AM - 5:00 PM<br /><span className="text-xs text-[#07477a]/70">(Weekends by Appointment)</span></p>
              <span className="text-xs font-bold text-[#07477a] uppercase tracking-wider bg-[#07477a]/10 px-3 py-1 rounded-full relative z-10">
                Open Weekdays
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
