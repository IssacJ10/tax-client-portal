"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFilingsList, useTaxYears } from "@/hooks/use-filings-list"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice, calculatePricing } from "@/lib/domain/pricing-engine"
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Menu,
  User,
  LogOut,
  Building2,
  Users,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Heart,
  UserPlus,
  Plus,
  Lightbulb,
  CalendarClock,
  AlertTriangle,
  Filter,
} from "lucide-react"
import type { Filing } from "@/lib/domain/types"

const ITEMS_PER_PAGE = 6

// Status configuration
const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  DRAFT: { label: "Draft", icon: FileText, color: "text-white/50" },
  NOT_STARTED: { label: "Not Started", icon: FileText, color: "text-white/50" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-amber-400" },
  UNDER_REVIEW: { label: "Under Review", icon: Clock, color: "text-emerald-400" },
  APPROVED: { label: "Approved", icon: CheckCircle, color: "text-emerald-400" },
  REJECTED: { label: "Needs Attention", icon: AlertCircle, color: "text-rose-400" },
  COMPLETED: { label: "Completed", icon: CheckCircle, color: "text-emerald-400" },
  DEFAULT: { label: "Unknown", icon: FileText, color: "text-white/50" }
}

// Filing type configuration
const typeConfig: Record<string, { label: string; icon: any; shortLabel: string }> = {
  INDIVIDUAL: { label: "Personal (T1)", icon: Users, shortLabel: "T1" },
  PERSONAL: { label: "Personal (T1)", icon: Users, shortLabel: "T1" },
  CORPORATE: { label: "Corporate (T2)", icon: Building2, shortLabel: "T2" },
  TRUST: { label: "Trust (T3)", icon: Landmark, shortLabel: "T3" },
}

// Tax deadlines
const taxDeadlines = [
  { date: "Apr 30, 2025", label: "Personal Tax Filing Deadline", type: "urgent" },
  { date: "Jun 15, 2025", label: "Self-Employed Filing Deadline", type: "upcoming" },
  { date: "Mar 31, 2025", label: "RRSP Contribution Deadline", type: "upcoming" },
]

// Tax tips
const taxTips = [
  {
    title: "Maximize Your RRSP",
    description: "Contributing to your RRSP reduces taxable income and grows tax-free until withdrawal.",
  },
  {
    title: "Track Home Office Expenses",
    description: "If you work from home, you may be eligible to claim a portion of rent, utilities, and internet.",
  },
  {
    title: "Don't Miss Medical Expenses",
    description: "Collect receipts for prescriptions, dental work, and medical travel for potential tax credits.",
  },
]

export default function DashboardContent() {
  const router = useRouter()
  const { user, logout } = useSession()
  const { taxYears } = useTaxYears()

  // Default to the latest year (first in sorted list) or current year
  const defaultYear = taxYears.length > 0 ? taxYears[0].year : new Date().getFullYear()
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined)
  const activeYear = yearFilter ?? defaultYear
  const { filings = [], isLoading: isLoadingFilings } = useFilingsList(activeYear)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [currentPage, setCurrentPage] = useState(1)

  const handleLogout = () => {
    logout("User logged out")
  }

  const filteredFilings = useMemo(() => {
    if (typeFilter === "ALL") return filings
    if (typeFilter === "INDIVIDUAL") {
      return filings.filter(f => f.type === "INDIVIDUAL" || (f.type as string) === "PERSONAL")
    }
    return filings.filter(f => f.type === typeFilter)
  }, [filings, typeFilter])

  const totalPages = Math.ceil(filteredFilings.length / ITEMS_PER_PAGE)
  const paginatedFilings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredFilings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFilings, currentPage])

  const handleFilterChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  const firstName = user?.firstName || "there"
  const hours = new Date().getHours()
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="min-h-screen relative">
      {/* Dark Green Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/50 to-slate-950" />

      {/* Subtle glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px]" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/[0.02] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">TaxPortal</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1]">
                <Menu className="h-5 w-5 text-white/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10">
              <DropdownMenuLabel className="px-4 py-3">
                <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-white/50">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="mx-2 rounded-lg text-white/70 focus:bg-white/[0.08] focus:text-white cursor-pointer">
                <User className="mr-3 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleLogout} className="mx-2 rounded-lg text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer">
                <LogOut className="mr-3 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white">
            {greeting}, <span className="text-emerald-400">{firstName}</span>
          </h1>
          <p className="text-white/40 mt-1 sm:mt-2 text-sm sm:text-base">Welcome to your tax dashboard</p>
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Main Content (Filings) */}
          <div className="flex-1 min-w-0">
            {/* FILINGS SECTION */}
            <section>
              {/* Filings Header */}
              <div className="flex flex-col gap-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-white">Your Tax Returns</h2>
                    <p className="text-white/50 text-sm">
                      {filteredFilings.length} {filteredFilings.length === 1 ? 'filing' : 'filings'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl h-10 px-4 sm:px-5 font-medium"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Return</span>
                  </Button>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Year Filter */}
                  {taxYears.length > 0 && (
                    <Select
                      value={activeYear.toString()}
                      onValueChange={(val) => {
                        setYearFilter(parseInt(val))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[120px] sm:w-[130px] rounded-xl bg-white/[0.08] border border-white/[0.1] text-white h-10 text-sm font-medium">
                        <Calendar className="h-4 w-4 mr-2 text-emerald-400" />
                        <SelectValue placeholder={activeYear.toString()} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10">
                        {taxYears.map((ty) => (
                          <SelectItem
                            key={ty.id}
                            value={ty.year.toString()}
                            className="text-white/70 focus:bg-white/[0.08] focus:text-white"
                          >
                            {ty.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] rounded-xl bg-white/[0.08] border border-white/[0.1] text-white h-10 text-sm font-medium">
                      <Filter className="h-4 w-4 mr-2 text-emerald-400" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10">
                      <SelectItem value="ALL" className="text-white/70 focus:bg-white/[0.08] focus:text-white">All Types</SelectItem>
                      <SelectItem value="INDIVIDUAL" className="text-white/70 focus:bg-white/[0.08] focus:text-white">Personal (T1)</SelectItem>
                      <SelectItem value="CORPORATE" className="text-white/70 focus:bg-white/[0.08] focus:text-white">Corporate (T2)</SelectItem>
                      <SelectItem value="TRUST" className="text-white/70 focus:bg-white/[0.08] focus:text-white">Trust (T3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filings Grid */}
              {isLoadingFilings ? (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm p-12 sm:p-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    <p className="text-sm text-white/50">Loading filings...</p>
                  </div>
                </div>
              ) : filteredFilings.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/[0.05]">
                    <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-white/30" />
                  </div>
                  <h4 className="text-base sm:text-lg font-medium text-white">
                    {typeFilter !== "ALL" ? "No filings match your filter" : "No filings yet"}
                  </h4>
                  <p className="mt-2 text-white/50 text-sm">
                    {typeFilter !== "ALL"
                      ? "Try adjusting your filter or create a new filing."
                      : "Start your first return to get organized."}
                  </p>
                  <Button
                    className="mt-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl h-10 px-6"
                    onClick={() => typeFilter !== "ALL" ? setTypeFilter("ALL") : setDialogOpen(true)}
                  >
                    {typeFilter !== "ALL" ? "Clear Filter" : "Start First Return"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    {paginatedFilings.map((filing) => (
                      <FilingCard key={filing.id} filing={filing} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 sm:gap-2 pt-6 sm:pt-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white disabled:opacity-30 h-8 sm:h-9 px-2 sm:px-4"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Prev</span>
                      </Button>
                      <div className="flex items-center gap-1 px-1 sm:px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-sm ${
                              currentPage === page
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                            }`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white disabled:opacity-30 h-8 sm:h-9 px-2 sm:px-4"
                      >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Right: Sidebar Widgets (sticky on desktop) */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Important Deadlines Widget */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarClock className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-medium text-white">Important Dates</h3>
                </div>
                <div className="space-y-2">
                  {taxDeadlines.map((deadline, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.03]"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        deadline.type === 'urgent' ? 'bg-amber-500/20' : 'bg-white/[0.05]'
                      }`}>
                        {deadline.type === 'urgent' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <Calendar className="h-3.5 w-3.5 text-white/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${
                          deadline.type === 'urgent' ? 'text-amber-400' : 'text-white/70'
                        }`}>
                          {deadline.date}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">{deadline.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats Widget */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5">
                <h3 className="text-base font-medium text-white mb-4">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-xl font-bold text-white">{filings.length}</p>
                    <p className="text-[10px] text-white/50 mt-1">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-xl font-bold text-amber-400">
                      {filings.filter(f => ['DRAFT', 'NOT_STARTED', 'IN_PROGRESS'].includes(f.status)).length}
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">Pending</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-xl font-bold text-emerald-400">
                      {filings.filter(f => ['APPROVED', 'COMPLETED'].includes(f.status)).length}
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">Done</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Quick Tips Section - Full Width at Bottom */}
        <section className="mt-8">
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base sm:text-lg font-medium text-white">Quick Tips</h3>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {taxTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                >
                  <h4 className="text-sm font-medium text-white mb-2">{tip.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <NewFilingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  )
}

function FilingCard({ filing }: { filing: Filing }) {
  const router = useRouter()

  const statusKey = filing.status?.toUpperCase() || 'DRAFT'
  const status = statusConfig[statusKey] || statusConfig.DEFAULT
  const StatusIcon = status.icon

  const filingType = typeConfig[filing.type] || typeConfig.INDIVIDUAL
  const TypeIcon = filingType.icon
  const isPersonal = filing.type === "INDIVIDUAL" || (filing.type as string) === "PERSONAL"

  const pricing = calculatePricing(filing)
  const personalFilings = filing.personalFilings || []
  const primaryFiling = personalFilings.find((pf) => pf.type === "primary")
  const spouseFilings = personalFilings.filter((pf) => pf.type === "spouse")
  const dependentFilings = personalFilings.filter((pf) => pf.type === "dependent")

  const getEntityName = () => {
    if (filing.type === "CORPORATE") {
      const corpFiling = (filing as any).corporateFiling
      const corpName = corpFiling?.formData?.["corpInfo.legalName"] || corpFiling?.legalName
      return corpName || "Corporation"
    }
    if (filing.type === "TRUST") {
      const trustFiling = (filing as any).trustFiling
      const trustName = trustFiling?.formData?.["trustInfo.name"] || trustFiling?.trustName
      return trustName || "Trust"
    }
    const name = primaryFiling?.formData?.firstName
      ? `${primaryFiling.formData.firstName} ${primaryFiling.formData.lastName || ""}`
      : "Personal Tax Return"
    return name
  }

  const entityName = getEntityName()

  const handleClick = () => {
    const fId = filing.documentId || filing.id
    const pId = primaryFiling?.documentId || primaryFiling?.id
    router.push(`/filing/${fId}${pId ? `?primary=${pId}` : ''}`)
  }

  return (
    <div
      onClick={handleClick}
      className="group rounded-2xl bg-white/[0.03] backdrop-blur-sm p-5 cursor-pointer transition-all duration-200 hover:bg-white/[0.06]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
          <TypeIcon className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
          <span className="text-white/60">{status.label}</span>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <h4 className="text-base font-medium text-white line-clamp-1">{entityName}</h4>
        <p className="text-sm text-white/40 mt-0.5">{filingType.label} · {filing.year}</p>
      </div>

      {/* Family Roster for Personal Returns */}
      {isPersonal && (
        <div className="space-y-2 mb-4">
          <FamilyMember
            label="Primary"
            name={(primaryFiling?.formData?.firstName as string) || 'Main Filer'}
            isComplete={primaryFiling?.isComplete}
            icon={User}
          />
          {spouseFilings.map((spouse) => (
            <FamilyMember
              key={spouse.id}
              label="Spouse"
              name={(spouse.formData?.firstName as string) || 'Partner'}
              isComplete={spouse.isComplete}
              icon={Heart}
            />
          ))}
          {dependentFilings.map((dep, idx) => (
            <FamilyMember
              key={dep.id}
              label={`Dependent ${idx + 1}`}
              name={(dep.formData?.firstName as string) || 'Child'}
              isComplete={dep.isComplete}
              icon={UserPlus}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(filing.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{formatPrice(pricing.total)}</span>
          <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  )
}

function FamilyMember({
  label,
  name,
  isComplete,
  icon: Icon,
}: {
  label: string
  name: string
  isComplete?: boolean
  icon: any
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <Icon className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-white/70">{name}</p>
          <p className="text-[10px] text-white/40">{label}</p>
        </div>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
        isComplete
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-white/[0.05] text-white/40'
      }`}>
        {isComplete ? 'Complete' : 'In Progress'}
      </span>
    </div>
  )
}
