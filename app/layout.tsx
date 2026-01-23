import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "@/context/session-provider"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ConsentModal } from "@/components/dashboard/ConsentModal"
import { SiteFooter } from "@/components/site-footer"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TaxPortal | Secure Tax Filing",
  description: "Enterprise-grade tax filing portal with secure document management and professional preparation.",
  generator: "v0.app",
  icons: {
    // icon: [
    //   {
    //     url: "",
    //     media: "(prefers-color-scheme: light)",
    //   },
    //   {
    //     url: "",
    //     media: "(prefers-color-scheme: dark)",
    //   },
    //   {
    //     url: "",
    //     type: "image/svg+xml",
    //   },
    // ],
    // apple: "/apple-icon.png",
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
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <SessionProvider>
          <ReCaptchaProvider>
            {children}
            <SiteFooter />
            <ConsentModal />
            <Toaster />
            <Analytics />
          </ReCaptchaProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
