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
  metadataBase: new URL("https://jjelevateas.com"),
  title: {
    default: "JJ Elevate Accounting Solutions | Tax Filing & Accounting Services Canada",
    template: "%s | JJ Elevate Accounting Solutions",
  },
  description:
    "Professional tax filing and accounting services for individuals, trusts, and businesses across Canada. Personal T1, corporate T2, trust T3, bookkeeping, payroll, GST/HST filing and business registration. CPA-certified with 24-hour turnaround. Serving Charlottetown PE and all Canadian provinces online.",
  keywords: [
    "tax filing Canada",
    "Canadian tax services",
    "tax return preparation",
    "T1 tax filing",
    "personal income tax Canada",
    "personal tax return",
    "T2 corporate tax",
    "corporate tax return Canada",
    "business tax filing",
    "T3 trust tax return",
    "trust income tax filing",
    "family trust tax Canada",
    "bookkeeping services",
    "payroll services Canada",
    "T4 T4A filing",
    "GST HST filing",
    "HST remittance",
    "input tax credits",
    "business registration Canada",
    "incorporation services",
    "tax accountant Charlottetown",
    "accounting firm Charlottetown",
    "PEI tax services",
    "Prince Edward Island accountant",
    "bookkeeping Charlottetown PEI",
    "tax preparation PEI",
    "online tax filing Canada",
    "CRA tax filing",
    "file taxes online Canada",
    "small business accounting Canada",
    "self-employed tax filing",
    "tax preparation services",
    "affordable tax filing",
    "CPA certified accountant",
    "tax planning compliance",
    "RRSP tax credits",
    "tax deductions Canada",
    "new Canadian tax filing",
    "immigrant tax return Canada",
  ],
  authors: [{ name: "JJ Elevate Accounting Solutions Inc." }],
  creator: "JJ Elevate Accounting Solutions Inc.",
  publisher: "JJ Elevate Accounting Solutions Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://jjelevateas.com",
    siteName: "JJ Elevate Accounting Solutions",
    title: "JJ Elevate | Professional Tax Filing & Accounting Services in Canada",
    description:
      "Reliable, affordable, and expert tax services for individuals, trusts, and businesses across Canada. Personal T1, corporate T2, trust T3, bookkeeping, payroll, GST/HST. CPA-certified with 24h turnaround.",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "JJ Elevate Accounting Solutions - Tax Filing Services Canada",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JJ Elevate | Tax Filing & Accounting Services Canada",
    description:
      "Professional tax filing for individuals & businesses. CPA-certified, secure platform, 24h turnaround.",
    images: ["/images/logo.png"],
    creator: "@JismaJose85083",
  },
  alternates: {
    canonical: "https://jjelevateas.com",
  },
  category: "Accounting & Tax Services",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#07477a",
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
