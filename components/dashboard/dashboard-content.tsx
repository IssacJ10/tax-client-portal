"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFilingsList } from "@/hooks/use-filings-list"
import { useSession } from "@/context/session-provider"
import { NewFilingDialog } from "@/components/dashboard/new-filing-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// Helper functions from your logic layer
import { formatFilingRef, formatPrice, calculatePricing } from "@/lib/domain/pricing-engine"
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Leaf, Loader2, ArrowRight, Menu, User, LogOut } from "lucide-react"
import type { Filing, FilingStatus } from "@/lib/domain/types"

// Status configuration with fallbacks
const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  DRAFT: { label: "Draft", icon: FileText, color: "text-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-yellow-500" },
  UNDER_REVIEW: { label: "Under Review", icon: Clock, color: "text-blue-500" },
  APPROVED: { label: "Approved", icon: CheckCircle, color: "text-primary" },
  REJECTED: { label: "Needs Attention", icon: AlertCircle, color: "text-destructive" },
  COMPLETED: { label: "Completed", icon: CheckCircle, color: "text-primary" },
  // Fallback for unexpected status strings from backend
  DEFAULT: { label: "Unknown", icon: FileText, color: "text-slate-400" }
}

/**
 * Silicon Valley Standard: Exporting as default for the main component 
 * in a file to ensure clean imports in Next.js pages.
 */
export default function DashboardContent() {
  const router = useRouter()
  const { user, logout } = useSession()
  // Hooks should return empty arrays/loading states as defaults to avoid 'undefined' crashes
  const { filings = [], isLoading: isLoadingFilings } = useFilingsList()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleLogout = () => {
    logout("User logged out")
  }

  // Get user's first name with fallback
  const firstName = user?.firstName || "there"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TaxPortal</h1>
              <p className="text-xs text-muted-foreground">Secure Tax Preparation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDialogOpen(true)}
              className="shadow-sm hidden sm:flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start New Return
            </Button>

            {/* Mobile: New Return Button (Icon Only) */}
            <Button
              onClick={() => setDialogOpen(true)}
              size="icon"
              className="shadow-sm sm:hidden"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="glass-card rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome Back, {firstName}</h2>
          <p className="mt-2 text-muted-foreground">
            Manage your tax returns and track their status. All your data is encrypted and secure.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Your Tax Returns</h3>

          {isLoadingFilings ? (
            <div className="glass-card flex items-center justify-center rounded-xl py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filings.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center border-dashed">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium text-foreground">No filings found</h4>
              <p className="mt-2 text-muted-foreground">Ready to file for 2025? It only takes a few minutes to start.</p>
              <Button className="mt-6" variant="outline" onClick={() => setDialogOpen(true)}>
                Start Your First Return
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filings.map((filing) => (
                <FilingCard key={filing.id} filing={filing} />
              ))}
            </div>
          )}
        </div>

        {/* Filing Creation Dialog */}
        <NewFilingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  )
}

function FilingCard({ filing }: { filing: Filing }) {
  const router = useRouter()

  // Robust lookup: handle case variations from the API
  const statusKey = filing.status?.toUpperCase() || 'DRAFT'
  const status = statusConfig[statusKey] || statusConfig.DEFAULT
  const StatusIcon = status.icon
  const pricing = calculatePricing(filing)

  // Use 'type' (lowercase) to match Strapi schema
  const primaryFiling = filing.personalFilings?.find((pf) => pf.type === "primary")

  const primaryName = primaryFiling?.formData?.firstName
    ? `${primaryFiling.formData.firstName} ${primaryFiling.formData.lastName || ""}`
    : "Primary Filer"

  const handleClick = () => {
    const fId = filing.documentId || filing.id
    const pId = primaryFiling?.documentId || primaryFiling?.id
    router.push(`/filing/${fId}${pId ? `?primary=${pId}` : ''}`)
  }

  return (
    <button
      onClick={handleClick}
      className="glass-card group w-full rounded-xl p-5 text-left transition-all hover:border-primary/40 hover:bg-white/5 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-primary/80">{formatFilingRef(filing.id)}</p>
          <h4 className="mt-1 font-semibold text-foreground line-clamp-1">{primaryName}</h4>
        </div>
        <span className={`flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${status.color}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          <span className="font-medium">Year {filing.year}</span>
          <span className="mx-2 opacity-30">•</span>
          <span>{filing.personalFilings?.length || 1} Person(s)</span>
        </div>
        <span className="font-bold text-foreground">{formatPrice(pricing.total)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[10px] text-muted-foreground uppercase">Updated {new Date(filing.updatedAt).toLocaleDateString()}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </button>
  )
}