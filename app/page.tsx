"use client"

import { useEffect } from "react"

import { SiteHeader } from "@/components/site-header"

import { Button } from "@/components/ui/button"
import { Check, Shield, Zap, Users, FileText, TrendingUp, ArrowRight, Star, Smartphone, BookOpen, Banknote, Percent, Building2, Phone, Mail, MapPin, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SpotlightCard } from "@/components/ui/spotlight-card"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
// IMPORT THE NEW COMPONENT
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
    <div className="flex min-h-screen flex-col bg-transparent selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">

      {/* --- NEW PARALLAX BACKGROUND (Replaces old static divs) --- */}
      <ParallaxBackground />

      <SiteHeader />

      <main className="flex-1 relative">
        {/* ... Rest of the page content stays exactly the same ... */}
        {/* HERO SECTION */}
        <section ref={targetRef} className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text Content */}
            <motion.div style={{ y: yText, opacity: opacityHero }} className="z-10">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-foreground mb-8 backdrop-blur-md shadow-[inset_0_0_10px_rgba(167,139,250,0.1)]">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse shadow-[0_0_12px_var(--primary)]"></span>
                Accepting New Clients for 2025
              </div>

              <h1 className="text-5xl font-bold tracking-tight sm:text-7xl mb-6 drop-shadow-2xl leading-[1.1]">
                Tax filing, <br />
                {/* --- FIX APPLIED HERE: Added 'inline-block pb-2' to prevent clipping --- */}
                <span className="inline-block pb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-400 text-glow">
                  reimagined.
                </span>
              </h1>

              <p className="text-xl text-muted-foreground/90 font-medium leading-relaxed mb-10 max-w-lg">
                Reliable, affordable, and expert tax services tailored to individuals and small businesses.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartFiling}
                  data-testid="hero-cta"
                  className="relative inline-flex h-14 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 shadow-[0_0_30px_-5px_var(--primary)] transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-lg font-semibold text-white backdrop-blur-3xl transition-all hover:bg-slate-900">
                    Start Your Filing <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </button>

                <Button variant="outline" size="lg" className="h-14 rounded-full px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm" asChild>
                  <Link href="/auth/login">Client Login</Link>
                </Button>
              </div>
            </motion.div>

            {/* Right: Floating UI Visualization */}
            <motion.div style={{ y: yGraphic, opacity: opacityHero }} className="relative h-[600px] w-full hidden lg:block perspective-1000">
              <motion.div
                className="absolute top-10 left-10 w-[400px] h-[500px] bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-20 overflow-hidden"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="h-14 border-b border-white/5 flex items-center px-6 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-white/10 rounded-full" />
                    <div className="h-12 w-full bg-white/5 rounded-xl border border-white/5 flex items-center px-4 text-emerald-400 font-mono text-xl">
                      $4,250.00
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                    <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                    <div className="h-2 w-5/6 bg-white/10 rounded-full" />
                  </div>
                  <div className="pt-8">
                    <div className="h-32 w-full bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-2xl border border-white/5 flex items-center justify-center">
                      <TrendingUp className="h-12 w-12 text-white/20" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute top-32 right-10 w-[350px] h-[400px] bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-xl z-10"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />

              <motion.div
                className="absolute bottom-20 -left-10 bg-black/90 backdrop-blur-xl border border-emerald-500/30 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl z-30"
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Audit Shield</p>
                  <p className="text-xs text-emerald-400">Active Protection</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* --- STATS STRIP --- */}
        <div className="border-y border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Active Clients", val: "500+", icon: Users },
                { label: "Tax Saved", val: "$2M+", icon: TrendingUp },
                { label: "Turnaround", val: "24h", icon: Zap },
                { label: "Security", val: "AES-256", icon: Shield },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center gap-2 group">
                  <stat.icon className="h-6 w-6 text-slate-500 group-hover:text-primary transition-colors duration-500" />
                  <span className="text-3xl font-bold text-white tracking-tight">{stat.val}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SERVICES (Spotlight Cards) --- */}
        <section id="features" className="py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold sm:text-5xl mb-6">Expert services tailored to you.</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From personal filing to corporate accounting, we handle it all.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. PERSONAL TAX */}
              <SpotlightCard>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Personal Tax</h3>
                <p className="text-sm text-muted-foreground mb-6">Maximize refunds for individuals & families.</p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> T1 General Filing</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> RRSP & Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 hover:bg-foreground hover:text-background transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Get Started
                </Button>
              </SpotlightCard>

              {/* 2. BUSINESS TAX */}
              <SpotlightCard spotlightColor="rgba(167, 139, 250, 0.4)">
                <div className="absolute top-0 right-0 bg-primary/20 px-3 py-1 text-[10px] font-bold text-primary rounded-bl-xl border-b border-l border-primary/20">POPULAR</div>
                <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Business Tax (T2)</h3>
                <p className="text-sm text-muted-foreground mb-6">Corporate filing & compliance.</p>
                <ul className="space-y-3 text-sm text-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Corporate Returns</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Financial Statements</li>
                </ul>
                <Button className="w-full h-10 rounded-lg bg-primary text-white hover:bg-primary/90 font-semibold shadow-[0_0_20px_-5px_var(--primary)] text-sm" onClick={handleStartFiling}>
                  File Corporate
                </Button>
              </SpotlightCard>

              {/* 3. BOOKKEEPING */}
              <SpotlightCard>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                  <BookOpen className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Bookkeeping</h3>
                <p className="text-sm text-muted-foreground mb-6">Monthly tracking & organization.</p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Monthly/Quarterly</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Expense Tracking</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 hover:bg-foreground hover:text-background transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Book Service
                </Button>
              </SpotlightCard>

              {/* 4. PAYROLL */}
              <SpotlightCard>
                <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                  <Banknote className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Payroll Services</h3>
                <p className="text-sm text-muted-foreground mb-6">Employee payments & T4s.</p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Deductions Mgmt</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> T4/T4A Filing</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 hover:bg-foreground hover:text-background transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Learn More
                </Button>
              </SpotlightCard>

              {/* 5. GST/HST FILING */}
              <SpotlightCard>
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                  <Percent className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">GST/HST Filing</h3>
                <p className="text-sm text-muted-foreground mb-6">Remittance & compliance checks.</p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> CRA Compliance</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Input Tax Credits</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 hover:bg-foreground hover:text-background transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Start Filing
                </Button>
              </SpotlightCard>

              {/* 6. BUSINESS REGISTRATION */}
              <SpotlightCard>
                <div className="h-12 w-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Business Reg</h3>
                <p className="text-sm text-muted-foreground mb-6">Incorporation & startup setup.</p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Incorporation</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> CRA Account Setup</li>
                </ul>
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 hover:bg-foreground hover:text-background transition-all font-semibold text-sm" onClick={handleStartFiling}>
                  Register Now
                </Button>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* --- LIFESTYLE SECTION (Edge-to-Edge 50/50) --- */}
        <section className="relative w-full border-y border-border/5 bg-background overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Text & Graphics */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 lg:order-1 bg-black/5 dark:bg-black/20">
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
                  Focus on your work. <br />
                  <span className="text-primary">We handle the rest.</span>
                </h2>
                <p className="text-xl text-muted-foreground mb-10 font-medium leading-relaxed">
                  TaxPortal bridges the gap between complex tax laws and modern technology. We use AI to find every deduction, and human experts to verify every cent.
                </p>

                <div className="flex items-center gap-4 mb-16">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 w-12 rounded-full border-2 border-background bg-slate-800 flex items-center justify-center overflow-hidden">
                        <span className="text-xs text-white">User</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Rated 5.0 by 500+ locals</p>
                  </div>
                </div>

                {/* Floating Cards Graphic */}
                <div className="relative h-[150px] w-full max-w-md hidden sm:block">
                  <motion.div
                    className="absolute top-0 right-0 w-[240px] h-[80px] bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl z-20 flex items-center gap-4"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Tax Document Preview</p>
                      <p className="text-slate-400 text-xs">Ready for review</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-0 left-0 w-[260px] h-[90px] bg-primary backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-4 z-30"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">Filed Successfully</p>
                      <p className="text-white/80 text-xs">Just now</p>
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
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent lg:hidden" />
            </div>
          </div>
        </section>

        {/* --- ABOUT (Edge-to-Edge 50/50 Flipped) --- */}
        <section id="about" className="relative w-full border-y border-border/5 bg-background overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Image (Flipped to Left) */}
            <div className="relative h-[400px] lg:h-auto w-full order-1">
              <Image
                src="/images/focused-accountant.png"
                alt="Focused TaxPortal Accountant"
                fill
                className="object-cover"
                quality={90}
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent lg:from-black/20" />

              {/* Floating Badge (Kept for visual interest) */}
              <div className="absolute bottom-6 left-6 right-6 hidden sm:block">
                <div className="bg-background/95 backdrop-blur-md rounded-xl p-4 border border-border/10 shadow-lg max-w-xs mx-auto lg:mx-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Dedicated Team</p>
                      <p className="text-xs text-muted-foreground">Certified Professionals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Text Content */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 bg-black/5 dark:bg-black/20">
              <div className="max-w-xl">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                  About TaxPortal
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                  Your Partners in <span className="text-primary">Growth</span>.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  We provide reliable, affordable, and expert tax services tailored to individuals and small businesses across Canada.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  Our mission is simple: to simplify accounting so you can focus on what matters—growing your business. Whether you need help with personal filing, corporate returns, or daily bookkeeping, we ensure accuracy, compliance, and maximum deductions.
                </p>

                <ul className="space-y-4 pt-4 mb-8">
                  {[
                    "Guaranteed Rates & Transparent Pricing",
                    "CPA-Certified Review on Every Return",
                    "Year-Round Support (We don't disappear after April!)"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="font-medium text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20" asChild>
                    <Link href="#contact">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-5xl mb-6">Get in Touch</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're here to help. Reach out to us for any questions or to schedule a consultation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {/* Phone - Click to Call */}
            <a
              href="tel:+17057703951"
              className="flex flex-col items-center justify-center p-8 bg-card border border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] rounded-3xl hover:border-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:-translate-y-1 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Call Us</h3>
              <p className="text-muted-foreground font-medium mb-4 relative z-10">(705) 770-3951</p>
              <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full group-hover:bg-primary group-hover:text-white transition-colors relative z-10">
                Click to Call
              </span>
            </a>

            {/* Email - Click to Mail */}
            <a
              href="mailto:contact@taxportal.com"
              className="flex flex-col items-center justify-center p-8 bg-card border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)] rounded-3xl hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-1 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Email Us</h3>
              <p className="text-muted-foreground font-medium break-all mb-4 relative z-10">contact@taxportal.com</p>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors relative z-10">
                Click to Email
              </span>
            </a>

            {/* Address - Click for Directions */}
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Toronto,+ON"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 bg-card border border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)] rounded-3xl hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:-translate-y-1 transition-all duration-300 group text-center cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <MapPin className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Visit Us</h3>
              <p className="text-muted-foreground font-medium mb-4 relative z-10">123 Main Street<br />Toronto, ON</p>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors relative z-10">
                Click for Directions
              </span>
            </a>

            {/* Hours - Static Info */}
            <div className="flex flex-col items-center justify-center p-8 bg-card border border-purple-500/20 shadow-[0_0_20px_-5px_rgba(168,85,247,0.2)] rounded-3xl hover:border-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-1 transition-all duration-300 group text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Office Hours</h3>
              <p className="text-muted-foreground font-medium mb-4 relative z-10">Mon - Fri: 9:00 AM - 5:00 PM<br /><span className="text-xs text-muted-foreground/60">(Weekends by Appointment)</span></p>
              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider bg-purple-500/10 px-3 py-1 rounded-full relative z-10">
                Open Weekdays
              </span>
            </div>
          </div>
        </div>
      </section>


    </div>
  )
}