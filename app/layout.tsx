import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "@/context/session-provider"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ConsentModal } from "@/components/dashboard/ConsentModal"
import { SiteFooter } from "@/components/site-footer"
import { ParallaxBackground } from "@/components/ui/parallax-background"
import { LoadingSplash } from "@/components/ui/loading-splash"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "JJ Elevate | Secure Tax Filing",
  description: "Enterprise-grade tax filing portal with secure document management and professional preparation.",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f1f1a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://secret-rope-485200-h6.nn.r.appspot.com" />
      </head>
      <body className="font-sans antialiased">
        <LoadingSplash />
        <SessionProvider>
          <ReCaptchaProvider>
            <ParallaxBackground />
            {children}
            <SiteFooter />
            <ConsentModal />
            <Toaster />
          </ReCaptchaProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
