"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Linkedin, Mail, Phone, MapPin, Instagram, Youtube, Calendar, MessageCircle } from "lucide-react"

export function SiteFooter() {
  const pathname = usePathname()

  // Hide footer on filing wizard pages (full-screen experience)
  if (pathname?.startsWith("/filing/")) {
    return null
  }

  return (
    <footer className="bg-gradient-to-b from-white to-[#f8fbff] border-t border-[#07477a]/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#07477a]/10 border border-[#07477a]/10">
                <img src="/images/logo.png" alt="JJ Elevate" className="h-14 w-14 rounded-xl object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">JJ Elevate</h3>
                <p className="text-sm text-[#07477a] font-medium">Accounting Solutions Inc.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Professional accounting and tax filing services for Canadians.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="https://www.facebook.com/profile.php?id=61573533512866" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="Facebook">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="https://www.instagram.com/jj_elevate_/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="Instagram">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="https://x.com/JismaJose85083" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="X (Twitter)">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Link>
              <Link href="https://www.linkedin.com/company/jj-elevate-accounting-solutions-inc/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link href="https://www.youtube.com/@JJElevateServices" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="YouTube">
                <Youtube className="h-5 w-5" />
              </Link>
              <Link href="https://wa.me/17057703951" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#25D366] transition-colors" title="WhatsApp">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link href="https://calendly.com/jjelevateas-info/30min" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#07477a] transition-colors" title="Book Appointment">
                <Calendar className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/login" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Personal Tax Filing
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Business Tax Returns
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Self-Employed Services
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Tax Planning
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#about" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-gray-600 hover:text-[#07477a] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-[#07477a]" />
                <span className="text-gray-600">(705) 770-3951</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-[#07477a]" />
                <span className="text-gray-600">Contact@jjelevateas.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-[#07477a]" />
                <span className="text-gray-600">37 -64 Belvedere Avenue<br />Charlottetown, PE, Canada</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#07477a]/10 pt-8 text-center text-sm text-gray-500">
          <p>© JJ Elevate Accounting Solutions Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
