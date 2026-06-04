"use client"

import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Clock, Calendar, MessageCircle, ArrowRight } from "lucide-react"
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

export default function ContactPage() {
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
                  Contact Us
                </div>
              </motion.div>

              <motion.h1 variants={fadeUpSlow} className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 text-gray-900 leading-[1.1]">
                Get in <span className="text-[#07477a]">Touch</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                We're here to help. Reach out to us for any questions or to schedule a consultation.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="pb-32 relative">
          <div className="container mx-auto px-4">
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

        {/* Book a Consultation CTA */}
        <section className="py-20 bg-[#07477a]">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUpSlow} className="text-3xl font-bold text-white mb-4 sm:text-4xl">
                Book a Free Consultation
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/80 mb-8 max-w-lg mx-auto text-lg">
                Schedule a 30-minute call with our tax experts to discuss your needs.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-full px-8 font-semibold bg-white hover:bg-white/90 text-[#07477a] shadow-lg transition-all duration-150 hover:shadow-xl" asChild>
                  <a href="https://calendly.com/jjelevateas-info/30min" target="_blank" rel="noopener noreferrer">
                    <Calendar className="mr-2 h-5 w-5" /> Book Appointment
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 font-semibold border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all duration-150" asChild>
                  <a href="https://wa.me/17057703951" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp Us
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

      </main>
    </div>
  )
}
