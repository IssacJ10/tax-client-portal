"use client"

import { Check, Users, FileText, BookOpen, Banknote, Percent, Building2 } from "lucide-react"
import Link from "next/link"
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

export default function ServicesPage() {
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
                  <span className="flex h-2 w-2 rounded-full bg-[#07477a] mr-2 animate-pulse" />
                  What We Offer
                </div>
              </motion.div>

              <motion.h1 variants={fadeUpSlow} className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 text-gray-900 leading-[1.1]">
                Expert services <br />
                <span className="text-[#07477a]">tailored to you.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                From personal filing to corporate accounting, we handle it all.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Service Cards */}
        <section className="pb-36 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {/* 1. PERSONAL TAX */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Users className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Personal Tax</h3>
                <p className="text-sm text-gray-500 mb-6">Maximize refunds for individuals & families.</p>
                <ul className="space-y-3 text-sm text-gray-600 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> T1 General Filing</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> RRSP & Credits</li>
                </ul>
              </motion.div>

              {/* 2. BUSINESS TAX — Featured */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#07477a]/[0.08] via-white/80 to-[#3b9cc2]/[0.08] backdrop-blur-xl border-2 border-[#07477a]/30 rounded-3xl p-8 relative shadow-2xl shadow-[#07477a]/15 ring-1 ring-[#07477a]/10 hover:shadow-[0_25px_60px_rgba(7,71,122,0.2)] hover:-translate-y-3 transition-all duration-200 group">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#07477a] to-[#053560] px-4 py-1.5 text-[10px] font-bold text-white rounded-bl-xl rounded-tr-3xl tracking-wider uppercase">Popular</div>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/25 to-[#3b9cc2]/15 border border-[#07477a]/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/25 transition-all duration-200">
                  <FileText className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Business Tax (T2)</h3>
                <p className="text-sm text-gray-500 mb-6">Corporate filing & compliance.</p>
                <ul className="space-y-3 text-sm text-gray-900 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Corporate Returns</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Financial Statements</li>
                </ul>
              </motion.div>

              {/* 3. BOOKKEEPING */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <BookOpen className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bookkeeping</h3>
                <p className="text-sm text-gray-500 mb-6">Monthly tracking & organization.</p>
                <ul className="space-y-3 text-sm text-gray-600 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Monthly/Quarterly</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Expense Tracking</li>
                </ul>
              </motion.div>

              {/* 4. PAYROLL */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Banknote className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Payroll Services</h3>
                <p className="text-sm text-gray-500 mb-6">Employee payments & T4s.</p>
                <ul className="space-y-3 text-sm text-gray-600 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Deductions Mgmt</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> T4/T4A Filing</li>
                </ul>
              </motion.div>

              {/* 5. GST/HST FILING */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Percent className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">GST/HST Filing</h3>
                <p className="text-sm text-gray-500 mb-6">Remittance & compliance checks.</p>
                <ul className="space-y-3 text-sm text-gray-600 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> CRA Compliance</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Input Tax Credits</li>
                </ul>
              </motion.div>

              {/* 6. BUSINESS REGISTRATION */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-white/80 via-white/70 to-[#07477a]/5 backdrop-blur-xl border border-[#07477a]/15 rounded-3xl p-8 shadow-xl shadow-[#07477a]/[0.05] hover:shadow-2xl hover:shadow-[#07477a]/[0.12] hover:-translate-y-3 hover:border-[#07477a]/30 transition-all duration-200 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#07477a]/20 to-[#3b9cc2]/10 border border-[#07477a]/25 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#07477a]/20 transition-all duration-200">
                  <Building2 className="h-7 w-7 text-[#07477a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Business Registration</h3>
                <p className="text-sm text-gray-500 mb-6">Incorporation & startup setup.</p>
                <ul className="space-y-3 text-sm text-gray-600 font-medium">
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> Incorporation</li>
                  <li className="flex gap-2.5"><Check className="h-4 w-4 text-[#07477a] shrink-0 mt-0.5" /> CRA Account Setup</li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

      </main>
    </div>
  )
}
