"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFilingContext } from "@/context/filing-context"
import { formatFilingRef } from "@/lib/domain/pricing-engine"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import { TrustFilingService } from "@/services/trust-filing-service"
import { toast } from "@/hooks/use-toast"
import {
  Loader2,
  Send,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Pencil,
  Landmark
} from "lucide-react"
import type { Filing, TaxFilingSchema } from "@/lib/domain/types"

type ReviewStep = "review" | "submitted"

interface TrustReviewScreenProps {
  filing: Filing
  schema: TaxFilingSchema
  formData: Record<string, unknown>
  onSubmitted?: () => void
}

export function TrustReviewScreen({ filing, schema, formData, onSubmitted }: TrustReviewScreenProps) {
  const router = useRouter()
  const { dispatch } = useFilingContext()
  const [currentStep, setCurrentStep] = useState<ReviewStep>("review")
  const [submittedRefNumber, setSubmittedRefNumber] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get trust name from formData
  const trustName = (formData["trustInfo.name"] as string) || "Your Trust"

  // Amendment detection: has a reference number AND has a previous paid amount
  const isAmendment = !!(filing.referenceNumber && filing.paidAmount && filing.paidAmount > 0)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const updatedFiling = await TrustFilingService.submitForReview(filing.id)
      if (updatedFiling) {
        setSubmittedRefNumber(updatedFiling.referenceNumber || null)
        setCurrentStep("submitted")
        onSubmitted?.()
      }
    } catch (err: any) {
      console.error("Failed to submit trust filing:", err)
      const errorMessage = err.message || "Failed to submit filing. Please try again."
      setError(errorMessage)
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSection = (sectionIndex: number) => {
    // INIT_TRUST_FILING sets phase to TRUST_ACTIVE and resets sectionIndex to 0
    // So we dispatch it first, then GO_TO_SECTION to set the correct section
    dispatch({
      type: "INIT_TRUST_FILING",
      payload: {
        filingId: filing.id,
        trustFilingId: (filing as any).trustFiling?.id || (filing as any).trustFiling?.documentId || filing.id
      }
    })
    dispatch({ type: "GO_TO_SECTION", payload: sectionIndex })
  }

  // Submitted confirmation
  if (currentStep === "submitted") {
    const displayRefNumber = submittedRefNumber || formatFilingRef(filing.id)

    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#07477a]/10">
          <FileCheck className="h-10 w-10 text-[#07477a]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Trust Filing Submitted!</h2>
        <p className="mt-2 text-gray-600">
          Your T3 trust tax filing for <span className="font-medium text-gray-900">{trustName}</span> has been submitted for review.
        </p>
        <div className="mt-6 rounded-lg bg-gray-100 p-4">
          <p className="text-sm text-gray-500">Reference Number</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#07477a]">{displayRefNumber}</p>
        </div>
        <Button className="mt-8 bg-[#07477a] hover:bg-[#053560] text-white" onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  // Get sections from schema for display
  const sections = schema ? QuestionRegistry.getSectionsForRole(schema, "primary", formData) : []

  // Review screen
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#07477a]/10">
            <Landmark className="h-6 w-6 text-[#07477a]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isAmendment ? "Review Trust Filing Amendment" : "Review Trust Filing"}
            </h2>
            <p className="text-gray-600">
              {isAmendment
                ? <>Amending filing <span className="font-mono text-[#07477a]">{filing.referenceNumber}</span> for <span className="font-medium text-gray-900">{trustName}</span>.</>
                : <>Please verify all information for <span className="font-medium text-gray-900">{trustName}</span> is correct.</>
              }
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl p-4 border border-red-300 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <SectionCard
            key={section.id}
            section={section}
            formData={formData}
            onEdit={() => handleEditSection(sectionIndex)}
          />
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isLoading} size="lg" className="min-w-[200px] bg-[#07477a] hover:bg-[#053560] text-white">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit for Review
        </Button>
      </div>
    </div>
  )
}

interface SectionCardProps {
  section: any
  formData: Record<string, unknown>
  onEdit: () => void
}

function SectionCard({ section, formData, onEdit }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter to only visible questions
  const visibleQuestions = section.questions.filter((q: any) =>
    QuestionRegistry.isQuestionVisible(q, formData)
  )

  if (visibleQuestions.length === 0) return null

  // Count answered questions
  const answeredCount = visibleQuestions.filter((q: any) => {
    const value = formData[q.name]
    return value !== undefined && value !== null && value !== '' &&
      !(Array.isArray(value) && value.length === 0)
  }).length

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-500">
              {answeredCount} of {visibleQuestions.length} answered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[#07477a] hover:text-[#053560] hover:bg-[#07477a]/10"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3">
          {visibleQuestions.map((question: any) => (
            <AnswerRow
              key={question.id}
              question={question}
              value={formData[question.name]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AnswerRowProps {
  question: any
  value: any
}

function AnswerRow({ question, value }: AnswerRowProps) {
  const displayValue = formatAnswerValue(value, question)
  const isEmpty = value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0)

  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className={isEmpty ? "text-gray-400" : "text-gray-500"}>
        {question.label}
        {question.validation?.required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      <span className={isEmpty ? "text-gray-400 italic" : "text-gray-900 text-right max-w-[60%]"}>
        {displayValue}
      </span>
    </div>
  )
}

function formatAnswerValue(value: any, question: any): string {
  if (value === undefined || value === null || value === '') return 'Not provided'

  // Handle arrays (multi-select, checkboxes, file uploads, repeaters)
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not provided'

    // Check if it's an array of objects
    if (typeof value[0] === 'object' && value[0] !== null) {
      // File uploads - check for 'originalFilename' (secure upload) or 'name' (legacy)
      const fileName = value[0]?.originalFilename || value[0]?.name
      if (fileName && (value[0]?.url || value[0]?.documentId || question.type === 'file')) {
        return value.map((f: any) => f.originalFilename || f.name).join(', ')
      }
      // Other repeaters - show count
      return `${value.length} item${value.length > 1 ? 's' : ''}`
    }

    // Try to find labels from options
    if (question.options) {
      const labels = value.map((v: any) => {
        const option = question.options.find((o: any) => o.value === v)
        return option?.label || v
      })
      return labels.join(', ')
    }
    return value.join(', ')
  }

  // Handle single file upload object
  if (typeof value === 'object' && value !== null) {
    // File upload objects - check for 'originalFilename' (secure upload) or 'name' (legacy)
    const fileName = value.originalFilename || value.name
    if (fileName && (value.url || value.documentId || question.type === 'file')) {
      return fileName
    }
    // Other objects - show a summary
    const keys = Object.keys(value).filter(k => value[k] !== null && value[k] !== undefined && value[k] !== '')
    if (keys.length === 0) return 'Not provided'
    return `${keys.length} field${keys.length > 1 ? 's' : ''} provided`
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  // Handle YES/NO strings
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'

  // Handle select/radio - find the label
  if (question.options && (question.type === 'select' || question.type === 'radio')) {
    const option = question.options.find((o: any) => o.value === value)
    if (option) return option.label
  }

  // Handle currency/numbers
  if (question.type === 'number') {
    const num = Number(value)
    if (!isNaN(num)) {
      // Format as currency for financial fields
      if (question.name?.toLowerCase().includes('income') ||
          question.name?.toLowerCase().includes('distribution') ||
          question.name?.toLowerCase().includes('capital')) {
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(num)
      }
      return num.toLocaleString()
    }
  }

  // Handle dates - parse as local date to avoid timezone shift
  if (question.type === 'date' && value) {
    try {
      // Parse YYYY-MM-DD string as local date (not UTC)
      const dateStr = String(value)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      }
      const date = new Date(value)
      return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return String(value)
    }
  }

  // Handle objects (file uploads, nested data)
  if (typeof value === 'object' && value !== null) {
    // Handle file upload objects - check for 'originalFilename' (secure upload) or 'name' (legacy)
    const fileName = value.originalFilename || value.name
    if (fileName && (value.url || value.documentId)) {
      return fileName
    }
    // Handle other objects - show a summary instead of [object Object]
    const keys = Object.keys(value).filter(k => value[k] !== null && value[k] !== undefined && value[k] !== '')
    if (keys.length === 0) return 'Not provided'
    return `${keys.length} field${keys.length > 1 ? 's' : ''} provided`
  }

  return String(value)
}
