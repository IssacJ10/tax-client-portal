"use client"

import { Button } from "@/components/ui/button"
import { Check, Users, Shield, Zap, TrendingUp, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

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

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent overflow-x-hidden">
      {/* Simple logo header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#07477a]/10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-[#07477a]/10">
              <img src="/images/logo.png" alt="JJ Elevate" className="h-8 w-8 rounded-lg object-contain" />
            </div>
            <span className="text-lg font-bold text-gray-900">JJ Elevate</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative">

        {/* Hero */}
        <section className="pt-32 pb-20 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainerSlow}
              className="text-center max-w-3xl mx-auto"
            >
              <motion.div variants={fadeUp} className="mb-8">
                <div className="inline-flex items-center rounded-full border border-[#07477a]/20 bg-[#07477a]/10 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-[#07477a]">
                  About JJ Elevate
                </div>
              </motion.div>

              <motion.h1 variants={fadeUpSlow} className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 text-gray-900 leading-[1.1]">
                Your Partners in <br />
                <span className="text-[#07477a]">Growth.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                We provide reliable, affordable, and expert tax services tailored to individuals and small businesses across Canada.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Stats Strip */}
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

        {/* Mission Section (50/50 layout) */}
        <section className="relative w-full overflow-hidden">
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

            {/* Right Column: Text */}
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24 xl:px-32 order-2 bg-[#07477a]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={staggerContainerSlow}
                className="max-w-xl"
              >
                <motion.h2 variants={fadeUpSlow} className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                  Our <span className="text-white/80">Mission</span>
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
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="relative w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 w-full min-h-[700px]">

            {/* Left Column: Text */}
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

                <motion.div variants={fadeUp} className="flex items-center gap-4 mb-10">
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

                <motion.div variants={fadeUp}>
                  <Button size="lg" className="rounded-full px-8 font-semibold bg-white hover:bg-white/90 text-[#07477a] shadow-lg transition-all duration-150 hover:shadow-xl" asChild>
                    <Link href="/services">View Our Services</Link>
                  </Button>
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
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07477a] to-transparent lg:hidden" />
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
