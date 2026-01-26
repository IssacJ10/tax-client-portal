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
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
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
  Hash,
} from "lucide-react"
import type { Filing } from "@/lib/domain/types"

const ITEMS_PER_PAGE = 6

// Status configuration (matches admin dashboard options)
const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  NOT_STARTED: { label: "Not Started", icon: FileText, color: "text-[#07477a]/60" },
  DRAFT: { label: "Draft", icon: FileText, color: "text-[#07477a]/60" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-amber-600" },
  UNDER_REVIEW: { label: "Under Review", icon: Clock, color: "text-blue-600" },
  SUBMITTED: { label: "Submitted", icon: CheckCircle, color: "text-blue-600" },
  APPROVED: { label: "Approved", icon: CheckCircle, color: "text-green-600" },
  REJECTED: { label: "Needs Attention", icon: AlertCircle, color: "text-rose-600" },
  DEFAULT: { label: "Unknown", icon: FileText, color: "text-[#07477a]/60" }
}

// Statuses that prevent editing (filing is locked)
// Note: REJECTED is NOT locked - user needs to fix and resubmit
const lockedStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED']

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
    <div className="relative overflow-x-hidden min-h-screen bg-gradient-to-b from-[#07477a] via-[#f0f7ff] to-[#f8fbff]">

      {/* Header - Seamlessly blends with gradient background */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#07477a] to-[#07477a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          {/* Logo and Brand - Large and prominent */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-white/20">
              <img src="/images/logo.png" alt="JJ Elevate" className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-contain" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">JJ Elevate</h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-white/80 font-medium">Accounting Solutions Inc.</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-2.5 p-3 hover:bg-white/10 rounded-xl transition-colors">
                <span className="w-10 h-0.5 bg-white rounded-full" />
                <span className="w-10 h-0.5 bg-white rounded-full" />
                <span className="w-10 h-0.5 bg-white rounded-full" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl bg-white border-gray-200 shadow-lg">
              <DropdownMenuLabel className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="mx-2 rounded-lg text-gray-700 focus:bg-gray-100 focus:text-gray-900 cursor-pointer">
                <User className="mr-3 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem onClick={handleLogout} className="mx-2 rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer">
                <LogOut className="mr-3 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Gradient transition zone - blends header into content */}
      <div className="h-12 sm:h-16 bg-gradient-to-b from-[#07477a]/95 to-transparent -mt-1" />

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-8">
        {/* Welcome Message - iOS-style Glassmorphic Card */}
        <div className="mb-6 sm:mb-8 -mt-8 sm:-mt-10">
          <div className="relative rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-black/5 p-5 sm:p-7 overflow-hidden">
            {/* Subtle gradient shimmer - iOS style */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-white/40 pointer-events-none" />

            <div className="relative">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
                {greeting}, <span className="text-[#07477a] font-bold">{firstName}</span>
              </h1>
              <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm sm:text-base">Welcome to your tax dashboard</p>
            </div>
          </div>
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
                    <h2 className="text-lg font-semibold text-gray-900">Your Tax Filings</h2>
                    <p className="text-gray-700 text-sm font-medium">
                      {filteredFilings.length} {filteredFilings.length === 1 ? 'filing' : 'filings'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-[#07477a] hover:bg-[#053560] text-white rounded-xl h-10 px-4 sm:px-5 font-medium shadow-md"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Filing</span>
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
                      <SelectTrigger className="w-[120px] sm:w-[130px] rounded-xl bg-white border border-gray-200 text-gray-900 h-10 text-sm font-medium shadow-sm">
                        <Calendar className="h-4 w-4 mr-2 text-[#07477a]" />
                        <SelectValue placeholder={activeYear.toString()} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white border-gray-200 shadow-lg">
                        {taxYears.map((ty) => (
                          <SelectItem
                            key={ty.id}
                            value={ty.year.toString()}
                            className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
                          >
                            {ty.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] rounded-xl bg-white border border-gray-200 text-gray-900 h-10 text-sm font-medium shadow-sm">
                      <Filter className="h-4 w-4 mr-2 text-[#07477a]" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-white border-gray-200 shadow-lg">
                      <SelectItem value="ALL" className="text-gray-700 focus:bg-gray-100 focus:text-gray-900">All Types</SelectItem>
                      <SelectItem value="INDIVIDUAL" className="text-gray-700 focus:bg-gray-100 focus:text-gray-900">Personal (T1)</SelectItem>
                      <SelectItem value="CORPORATE" className="text-gray-700 focus:bg-gray-100 focus:text-gray-900">Corporate (T2)</SelectItem>
                      <SelectItem value="TRUST" className="text-gray-700 focus:bg-gray-100 focus:text-gray-900">Trust (T3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filings Grid */}
              {isLoadingFilings ? (
                <div className="rounded-2xl bg-white border border-gray-200 p-12 sm:p-16 shadow-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#07477a]" />
                    <p className="text-sm text-gray-500">Loading filings...</p>
                  </div>
                </div>
              ) : filteredFilings.length === 0 ? (
                <div className="rounded-2xl bg-white border border-gray-200 p-10 sm:p-16 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gray-100">
                    <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">
                    {typeFilter !== "ALL" ? "No filings match your filter" : "No filings yet"}
                  </h4>
                  <p className="mt-2 text-gray-500 text-sm">
                    {typeFilter !== "ALL"
                      ? "Try adjusting your filter or create a new filing."
                      : "Start your first return to get organized."}
                  </p>
                  <Button
                    className="mt-6 bg-[#07477a] hover:bg-[#053560] text-white rounded-xl h-10 px-6 shadow-md"
                    onClick={() => typeFilter !== "ALL" ? setTypeFilter("ALL") : setDialogOpen(true)}
                  >
                    {typeFilter !== "ALL" ? "Clear Filter" : "Start First Filing"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 pt-4">
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
                        className="rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 h-8 sm:h-9 px-2 sm:px-4"
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
                                ? 'bg-[#07477a] text-white shadow-md'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                        className="rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 h-8 sm:h-9 px-2 sm:px-4"
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
            <div className="lg:sticky lg:top-24 space-y-5">
              {/* Important Deadlines Widget */}
              <div className="relative rounded-2xl bg-white border border-gray-200 p-5 transition-all duration-300 shadow-sm hover:shadow-md">
                {/* Floating icon */}
                <div className="absolute -top-3 -left-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                    <CalendarClock className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="pl-6 mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Important Dates</h3>
                </div>
                <div className="space-y-2.5">
                  {taxDeadlines.map((deadline, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        deadline.type === 'urgent' ? 'bg-amber-100' : 'bg-[#07477a]/10'
                      }`}>
                        {deadline.type === 'urgent' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <Calendar className="h-3.5 w-3.5 text-[#07477a]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${
                          deadline.type === 'urgent' ? 'text-amber-700' : 'text-gray-900'
                        }`}>
                          {deadline.date}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{deadline.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats Widget */}
              <div className="relative rounded-2xl bg-white border border-gray-200 p-5 transition-all duration-300 shadow-sm hover:shadow-md">
                {/* Floating icon */}
                <div className="absolute -top-3 -left-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07477a] shadow-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="pl-6 mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Quick Stats</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{filings.length}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-2xl font-bold text-amber-600">
                      {filings.filter(f => ['DRAFT', 'NOT_STARTED', 'IN_PROGRESS'].includes(f.status)).length}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1 uppercase tracking-wide">Pending</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-[#07477a]/10 border border-[#07477a]/20">
                    <p className="text-2xl font-bold text-[#07477a]">
                      {filings.filter(f => f.status === 'APPROVED').length}
                    </p>
                    <p className="text-[10px] text-[#07477a] mt-1 uppercase tracking-wide">Done</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Quick Tips Section - Full Width at Bottom - H&R Block green banner */}
        <section className="mt-10">
          <div className="relative rounded-2xl bg-[#07477a] p-6 transition-all duration-300 shadow-lg">
            {/* Floating icon */}
            <div className="absolute -top-4 left-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg shadow-[#07477a]/30">
                <Lightbulb className="h-6 w-6 text-[#07477a]" />
              </div>
            </div>
            <div className="pl-14 mb-5">
              <h3 className="text-lg font-semibold text-white">Quick Tips</h3>
              <p className="text-sm text-white/80">Helpful advice to maximize your tax filing</p>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {taxTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 hover:border-white/30 transition-all duration-200"
                >
                  <h4 className="text-sm font-semibold text-white mb-2">{tip.title}</h4>
                  <p className="text-xs text-white/80 leading-relaxed">{tip.description}</p>
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
      : "Personal Tax Filing"
    return name
  }

  const entityName = getEntityName()

  const handleClick = () => {
    const fId = filing.documentId || filing.id
    const pId = primaryFiling?.documentId || primaryFiling?.id
    router.push(`/filing/${fId}${pId ? `?primary=${pId}` : ''}`)
  }

  // Card color theme - glassmorphic green gradient
  const getCardTheme = () => {
    return {
      icon: 'bg-white/80',
      iconColor: 'text-[#07477a]',
      accent: 'text-[#07477a]',
      arrow: 'bg-white/60 group-hover:bg-[#07477a]',
      arrowIcon: 'text-[#07477a] group-hover:text-white',
    }
  }

  const theme = getCardTheme()

  // Check if filing is locked (cannot be edited)
  const isLocked = lockedStatuses.includes(statusKey)

  // Status badge color based on status
  const getStatusBadgeStyle = () => {
    switch (statusKey) {
      case 'APPROVED':
        return 'bg-[#07477a] text-white shadow-md shadow-[#07477a]/30'
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
      case 'IN_PROGRESS':
        return 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
      case 'REJECTED':
        return 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
      default:
        return 'bg-white/80 text-gray-700 border border-white/50'
    }
  }

  return (
    <div
      onClick={isLocked ? undefined : handleClick}
      className={`group relative rounded-2xl bg-gradient-to-br from-[#e8f4fc] to-[#d0e8f8] backdrop-blur-sm border border-[#07477a]/10 p-5 transition-all duration-300 ${
        isLocked
          ? 'cursor-default opacity-80'
          : 'cursor-pointer hover:shadow-lg hover:shadow-[#07477a]/10 hover:-translate-y-0.5'
      }`}
    >
      {/* Floating Status Badge - positioned outside card boundary */}
      <div className={`absolute -top-2.5 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle()}`}>
        <StatusIcon className="h-3 w-3" />
        <span>{status.label}</span>
      </div>

      {/* Type Icon - glassmorphic style */}
      <div className="absolute -top-4 left-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.icon} backdrop-blur-sm shadow-sm border border-white/50`}>
          <TypeIcon className={`h-6 w-6 ${theme.iconColor}`} />
        </div>
      </div>

      {/* Content with top padding to account for floating icon */}
      <div className="pt-6">
        {/* Title */}
        <div className="mb-3">
          <h4 className="text-lg font-semibold text-gray-900 line-clamp-1">{entityName}</h4>
          <p className="text-sm text-gray-500 mt-0.5">{filingType.label} · {filing.year}</p>
        </div>

        {/* Reference Number - shown for submitted/approved filings */}
        {filing.referenceNumber && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/50 border border-white/60">
            <Hash className="h-3.5 w-3.5 text-[#07477a]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Reference</p>
              <p className="text-sm font-semibold text-[#07477a] truncate">{filing.referenceNumber}</p>
            </div>
          </div>
        )}

        {/* Family Roster for Personal Filings - Only show spouse and dependents */}
        {isPersonal && (spouseFilings.length > 0 || dependentFilings.length > 0) && (
          <div className="space-y-2 mb-3">
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
        <div className="flex items-center justify-between pt-3 border-t border-white/50">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(filing.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          {isLocked ? (
            <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-full bg-white/50">
              View Only
            </span>
          ) : (
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.arrow} backdrop-blur-sm transition-colors`}>
              <ArrowRight className={`h-4 w-4 ${theme.arrowIcon} transition-colors`} />
            </div>
          )}
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
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-white/70">
          <Icon className="h-3.5 w-3.5 text-[#07477a]" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-900">{name}</p>
          <p className="text-[10px] text-gray-600">{label}</p>
        </div>
      </div>
      <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
        isComplete
          ? 'bg-[#07477a] text-white'
          : 'bg-amber-500 text-white'
      }`}>
        {isComplete ? 'Complete' : 'In Progress'}
      </span>
    </div>
  )
}
