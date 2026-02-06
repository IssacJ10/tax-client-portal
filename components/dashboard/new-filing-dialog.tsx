"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Info } from "lucide-react"
import { useFiling } from "@/hooks/use-filing"
import type { FilingType } from "@/lib/domain/types"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface NewFilingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NewFilingDialog({ open, onOpenChange }: NewFilingDialogProps) {
    const router = useRouter()
    const { initFiling, isLoading } = useFiling()

    const [year, setYear] = useState<string>("2025")
    const [type, setType] = useState<FilingType>("INDIVIDUAL")
    const [availableYears, setAvailableYears] = useState<Array<{ id: number, year: string }>>([])
    const [loadingYears, setLoadingYears] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [infoMessage, setInfoMessage] = useState<string | null>(null)

    // Fetch available tax years
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
                const isProduction = process.env.NODE_ENV === 'production'

                // Build headers - use localStorage token in development only
                const headers: HeadersInit = {}
                if (!isProduction) {
                    const token = localStorage.getItem('tax-auth-token')
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`
                    }
                }

                const res = await fetch(`${strapiUrl}/api/tax-years?filters[isActive][$eq]=true&sort[0]=year:desc`, {
                    credentials: 'include', // Sends httpOnly cookies (works in production)
                    headers,
                })
                if (res.ok) {
                    const json = await res.json()
                    const years = (json.data || []).map((item: any) => ({
                        id: item.id,
                        year: item.attributes?.year || item.year
                    }))
                    setAvailableYears(years)
                    // Set default to most recent year
                    if (years.length > 0) {
                        setYear(String(years[0].year))
                    }
                }
            } catch (error) {
                console.error('Failed to fetch tax years:', error)
            } finally {
                setLoadingYears(false)
            }
        }
        if (open) {
            fetchYears()
            setError(null) // Clear error when dialog opens
            setInfoMessage(null) // Clear info message when dialog opens
        }
    }, [open])

    const handleCreate = async () => {
        setError(null) // Clear previous errors
        setInfoMessage(null) // Clear previous info message
        try {
            const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
            const isProduction = process.env.NODE_ENV === 'production'

            // Build headers - use localStorage token in development only
            const headers: HeadersInit = {}
            if (!isProduction) {
                const token = localStorage.getItem('tax-auth-token')
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }
            }

            // Only check for existing PERSONAL filings - Corporate and Trust can have multiple
            if (type === "INDIVIDUAL") {
                // Get current user's PERSONAL filings for this year
                const existingRes = await fetch(
                    `${strapiUrl}/api/filings?filters[taxYear][year][$eq]=${year}&filters[filingType][type][$eq]=PERSONAL&populate[filingStatus]=*&populate[filingType]=*`,
                    { credentials: 'include', headers }
                )

                if (existingRes.ok) {
                    const existingJson = await existingRes.json()
                    const existingFilings = existingJson.data || []

                    // Check if any existing PERSONAL filing is in a submitted state
                    const submittedFiling = existingFilings.find((f: any) => {
                        const status = f.filingStatus?.statusCode || f.attributes?.filingStatus?.data?.attributes?.statusCode
                        return ['UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED'].includes(status)
                    })

                    if (submittedFiling) {
                        setError(`You already have a ${year} personal tax filing that is under review. You cannot create a new personal filing until it is processed.`)
                        return
                    }

                    // Check if there's any existing PERSONAL filing (draft or in progress)
                    const existingDraft = existingFilings.find((f: any) => {
                        const status = f.filingStatus?.statusCode || f.attributes?.filingStatus?.data?.attributes?.statusCode
                        return ['DRAFT', 'NOT_STARTED', 'IN_PROGRESS'].includes(status)
                    })

                    if (existingDraft) {
                        // Show info message and redirect to existing personal filing
                        setInfoMessage(`You already have a ${year} personal tax filing in progress. Redirecting you to continue where you left off...`)

                        // Wait a moment for user to see the message, then redirect
                        const existingId = existingDraft.documentId || existingDraft.id
                        setTimeout(() => {
                            onOpenChange(false)
                            router.push(`/filing/${existingId}`)
                        }, 2000)
                        return
                    }
                }
            }

            // For CORPORATE and TRUST - allow creating multiple filings (no restriction check)
            // 1. Create the filing in Strapi (returns string documentId)
            const { filing, primaryFiling } = await initFiling(parseInt(year), type)

            // 2. Close modal
            onOpenChange(false)

            // 3. Redirect to the Wizard using the new Document ID
            router.push(`/filing/${filing.documentId || filing.id}?primary=${primaryFiling.documentId || primaryFiling.id}`)

        } catch (err: any) {
            console.error("Failed to create filing", err)

            // Extract user-friendly error message from Axios error
            let errorMessage = "Failed to create filing. Please try again."

            // Check if it's an Axios error with response data (Strapi v5 format)
            const backendMessage =
                err.response?.data?.error?.message ||  // Strapi v5 format
                err.response?.data?.message ||          // Strapi v4 format
                err.message                             // Generic error

            if (backendMessage) {
                // Check for specific error patterns
                if (backendMessage.includes("already exists") || backendMessage.includes("unique")) {
                    errorMessage = "You already have a filing for this tax year. Please select a different year or view your existing filings from the dashboard."
                } else if (backendMessage.includes("not configured")) {
                    errorMessage = "This tax year is not available yet. Please select a different year."
                } else if (backendMessage.includes("not found")) {
                    errorMessage = "Filing type not found. Please contact support."
                } else if (backendMessage.includes("status code 400")) {
                    errorMessage = "You may already have a filing for this year. Please check your dashboard."
                } else {
                    // Show the actual backend message
                    errorMessage = backendMessage
                }
            }

            setError(errorMessage)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white border-[#07477a]/10 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-gray-900">Start New Filing</DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Select the tax year and type of filing you wish to file.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {infoMessage && (
                    <Alert className="border-[#07477a]/50 bg-[#07477a]/10">
                        <Info className="h-4 w-4 text-[#07477a]" />
                        <AlertDescription className="text-[#07477a]">{infoMessage}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 py-4">
                    {/* Year Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right text-gray-700 font-medium">
                            Tax Year
                        </Label>
                        <Select value={year} onValueChange={setYear} disabled={loadingYears}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={loadingYears ? "Loading..." : "Select year"} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map((y) => (
                                    <SelectItem key={y.id} value={String(y.year)}>
                                        {y.year}
                                    </SelectItem>
                                ))}
                                {availableYears.length === 0 && !loadingYears && (
                                    <SelectItem value="2025" disabled>No years available</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Type Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right text-gray-700 font-medium">
                            Type
                        </Label>
                        <Select value={type} onValueChange={(v) => setType(v as FilingType)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INDIVIDUAL">Personal (T1)</SelectItem>
                                <SelectItem value="CORPORATE">Corporate (T2)</SelectItem>
                                <SelectItem value="TRUST">Trust (T3)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isLoading}
                        className="bg-[#07477a] hover:bg-[#053560] text-white shadow-lg shadow-[#07477a]/20"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Filing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}