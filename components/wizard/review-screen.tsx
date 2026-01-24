"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFilingContext } from "@/context/filing-context"
import { useReCaptcha } from "@/components/recaptcha-provider"
import { calculatePricingFromSchema, formatPrice, formatFilingRef } from "@/lib/domain/pricing-engine"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import {
  Check,
  Loader2,
  Send,
  User,
  Heart,
  Users,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  UserPlus
} from "lucide-react"
import type { Filing, PersonalFiling, FilingRole, TaxFilingSchema } from "@/lib/domain/types"

type ReviewStep = "review" | "payment" | "submitted"

interface ReviewScreenProps {
  filing: Filing
  onEditPerson?: (personalFilingId: string, sectionIndex: number) => void
  onSubmitted?: () => void
  onAddSpouse?: () => void
  onAddDependent?: () => void
}

export function ReviewScreen({ filing, onEditPerson, onSubmitted, onAddSpouse, onAddDependent }: ReviewScreenProps) {
  const router = useRouter()
  const { submitForReview, isLoading, schema } = useFilingContext()
  const { executeRecaptcha } = useReCaptcha()
  const [currentStep, setCurrentStep] = useState<ReviewStep>("review")
  const [submittedRefNumber, setSubmittedRefNumber] = useState<string | null>(null)

  const pricing = calculatePricingFromSchema(filing, schema)
  const primary = filing.personalFilings.find((pf) => pf.type === "primary")
  const spouse = filing.personalFilings.find((pf) => pf.type === "spouse")
  const dependents = filing.personalFilings.filter((pf) => pf.type === "dependent")

  // Amendment detection: has a reference number AND has a previous paid amount
  const isAmendment = !!(filing.referenceNumber && filing.paidAmount && filing.paidAmount > 0)
  const amountPaid = filing.paidAmount || 0
  const amountDue = isAmendment ? Math.max(0, pricing.total - amountPaid) : pricing.total

  // Check if user is eligible to add spouse (married or common_law and no spouse yet)
  const maritalStatus = primary?.formData?.["maritalStatus.status"] as string | undefined
  const isEligibleForSpouse = (maritalStatus === "MARRIED" || maritalStatus === "COMMON_LAW") && !spouse
  // Can always add dependents
  const canAddFamilyMembers = onAddSpouse || onAddDependent

  const handleSubmit = async () => {
    // Execute reCAPTCHA before submission
    const recaptchaToken = await executeRecaptcha("filing_submit")

    // Pass the calculated total price and reCAPTCHA token to be stored/verified
    const updatedFiling = await submitForReview(pricing.total, recaptchaToken)
    if (updatedFiling) {
      // Store the reference number from the response
      setSubmittedRefNumber(updatedFiling.referenceNumber || null)
      setCurrentStep("submitted")
      // Notify parent that submission is complete (for progress bar update)
      onSubmitted?.()
    }
  }

  // Step 3: Submitted confirmation
  if (currentStep === "submitted") {
    // Use the reference number from submission response, or fallback to formatFilingRef
    const displayRefNumber = submittedRefNumber || formatFilingRef(filing.id)

    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#00754a]/10">
          <FileCheck className="h-10 w-10 text-[#00754a]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Filing Submitted!</h2>
        <p className="mt-2 text-gray-500">
          Your tax filing has been submitted for review. We'll notify you once it's processed.
        </p>
        <div className="mt-6 rounded-lg bg-gray-100 p-4">
          <p className="text-sm text-gray-500">Reference Number</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#00754a]">{displayRefNumber}</p>
        </div>
        <Button className="mt-8 bg-[#00754a] hover:bg-[#005c3b] text-white" onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  // Step 2: Payment/Pricing confirmation
  if (currentStep === "payment") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00754a]/10">
              <CreditCard className="h-6 w-6 text-[#00754a]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isAmendment ? "Amendment Payment" : "Confirm & Pay"}
              </h2>
              <p className="text-gray-500">
                {isAmendment
                  ? `Review the changes to your filing (Ref: ${filing.referenceNumber}).`
                  : "Review your pricing and submit your tax filing."}
              </p>
            </div>
          </div>
        </div>

        {/* Filing Summary */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Filing Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Primary Filer</span>
              <span className="text-gray-900">{primary?.formData?.firstName ? `${primary.formData.firstName} ${primary.formData.lastName || ''}`.trim() : 'You'}</span>
            </div>
            {spouse && (
              <div className="flex justify-between">
                <span className="text-gray-500">Spouse</span>
                <span className="text-gray-900">{spouse.formData?.firstName ? `${spouse.formData.firstName} ${spouse.formData.lastName || ''}`.trim() : 'Included'}</span>
              </div>
            )}
            {dependents.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dependents</span>
                <span className="text-gray-900">{dependents.length} {dependents.length === 1 ? 'person' : 'people'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {isAmendment ? "Amendment Pricing" : "Pricing Summary"}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Base Filing Fee</span>
              <span className="font-medium text-gray-900">{formatPrice(pricing.baseFee)}</span>
            </div>
            {pricing.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.amount)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatPrice(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Tax (HST 15%)</span>
                <span className="font-medium text-gray-900">{formatPrice(pricing.tax)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3">
              {isAmendment ? (
                <>
                  {/* Amendment: Show Updated Total, Already Paid, and Amount Due */}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Updated Total</span>
                    <span className="font-medium text-gray-900">{formatPrice(pricing.total)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Previously Paid</span>
                    <span className="font-medium text-green-600">-{formatPrice(amountPaid)}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Amount You Owe</span>
                      <span className={`text-xl font-bold ${amountDue > 0 ? 'text-[#00754a]' : 'text-green-600'}`}>
                        {amountDue > 0 ? formatPrice(amountDue) : "$0.00"}
                      </span>
                    </div>
                    {amountDue === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        No additional payment required. Your previous payment covers the updated filing.
                      </p>
                    )}
                    {amountDue > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        This is the additional amount due for the changes made to your filing.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* New Filing: Just show Total */
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#00754a]">{formatPrice(pricing.total)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentStep("review")} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} size="lg" className="min-w-[200px] bg-[#00754a] hover:bg-[#005c3b] text-white">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit for Review
          </Button>
        </div>
      </div>
    )
  }

  // Step 1: Review all answers
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00754a]/10">
            <FileCheck className="h-6 w-6 text-[#00754a]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Your Information</h2>
            <p className="text-gray-500">Please verify all information is correct. Click "Edit" to make changes.</p>
          </div>
        </div>
      </div>

      {/* People Cards with Full Answers */}
      <div className="space-y-4">
        {primary && (
          <PersonCard
            person={primary}
            icon={User}
            title="Primary Filer"
            schema={schema}
            onEdit={onEditPerson}
          />
        )}
        {spouse && (
          <PersonCard
            person={spouse}
            icon={Heart}
            title="Spouse"
            schema={schema}
            onEdit={onEditPerson}
          />
        )}
        {dependents.map((dep, idx) => (
          <PersonCard
            key={dep.id}
            person={dep}
            icon={Users}
            title={`Dependent ${idx + 1}`}
            schema={schema}
            onEdit={onEditPerson}
          />
        ))}
      </div>

      {/* Add Family Members Section - shown when callbacks are provided */}
      {canAddFamilyMembers && (
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Family Members</h3>
          <p className="text-sm text-gray-500 mb-4">
            Need to add someone to your filing? You can add a spouse or dependents here.
          </p>
          <div className="flex flex-wrap gap-3">
            {onAddSpouse && isEligibleForSpouse && (
              <Button
                variant="outline"
                onClick={onAddSpouse}
                disabled={isLoading}
                className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-[#00754a] hover:border-[#00754a]"
              >
                <Heart className="h-4 w-4" />
                Add Spouse
              </Button>
            )}
            {onAddDependent && (
              <Button
                variant="outline"
                onClick={onAddDependent}
                disabled={isLoading}
                className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-[#00754a] hover:border-[#00754a]"
              >
                <UserPlus className="h-4 w-4" />
                Add Dependent
              </Button>
            )}
          </div>
          {onAddSpouse && !isEligibleForSpouse && !spouse && (
            <p className="text-xs text-gray-500 mt-3">
              To add a spouse, your marital status must be "Married" or "Common-Law".
            </p>
          )}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={() => setCurrentStep("payment")} size="lg" className="min-w-[200px] bg-[#00754a] hover:bg-[#005c3b] text-white">
          Continue to Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface PersonCardProps {
  person: PersonalFiling
  icon: React.ComponentType<{ className?: string }>
  title: string
  schema: TaxFilingSchema
  onEdit?: (personalFilingId: string, sectionIndex: number) => void
}

function PersonCard({ person, icon: Icon, title, schema, onEdit }: PersonCardProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded to show all answers
  const data = person.formData || {}
  const role = person.type as FilingRole

  // Get all sections for this person's role
  const sections = schema ? QuestionRegistry.getSectionsForRole(schema, role, data) : []

  // Get display name
  const displayName = data.firstName
    ? `${data.firstName as string} ${(data.lastName as string) || ''}`.trim()
    : title

  // Count answered fields from raw data (more reliable)
  const dataEntries = Object.entries(data).filter(([_, value]) =>
    value !== undefined && value !== null && value !== '' &&
    !(Array.isArray(value) && value.length === 0)
  )
  const totalAnswered = dataEntries.length

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00754a]/10">
            <Icon className="h-5 w-5 text-[#00754a]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">{title} • {totalAnswered} answers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {person.isComplete && (
            <span className="flex items-center gap-1 rounded-full bg-[#00754a]/10 px-2 py-1 text-xs font-medium text-[#00754a]">
              <Check className="h-3 w-3" />
              Complete
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Details - All Answers by Section */}
      {isExpanded && (
        <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
          {sections.length > 0 ? (
            // Show by sections when available
            sections.map((section, sectionIndex) => {
              const visibleQuestions = section.questions.filter(q =>
                QuestionRegistry.isQuestionVisible(q, data)
              )

              if (visibleQuestions.length === 0) return null

              return (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-500 hover:text-[#00754a] hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(person.id, sectionIndex)
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                    {visibleQuestions.map((question) => (
                      <AnswerRow
                        key={question.id}
                        question={question}
                        value={data[question.name]}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          ) : dataEntries.length > 0 ? (
            // Fallback: Show raw data when no sections
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Information</h4>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500 hover:text-[#00754a] hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(person.id, 0)
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                {dataEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-500">{formatKeyLabel(key)}</span>
                    <span className="text-gray-900 text-right max-w-[60%]">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No information recorded yet.</p>
          )}
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

  // Handle arrays (multi-select, checkboxes, repeaters)
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not provided'

    // Check if it's a repeater (array of objects)
    if (typeof value[0] === 'object' && value[0] !== null) {
      return `${value.length} item${value.length > 1 ? 's' : ''}`
    }

    // Try to find labels from options
    if (question.options) {
      const labels = value.map(v => {
        const option = question.options.find((o: any) => o.value === v)
        return option?.label || v
      })
      return labels.join(', ')
    }
    return value.join(', ')
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
  if (question.type === 'number' && question.name?.toLowerCase().includes('income')) {
    return formatPrice(Number(value))
  }

  // Handle dates - parse as local date to avoid timezone shift
  if (question.type === 'date' && value) {
    try {
      // Parse YYYY-MM-DD string as local date (not UTC)
      // This prevents the date from shifting due to timezone conversion
      const dateStr = String(value)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year, month - 1, day) // month is 0-indexed
        return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      }
      // Fallback for other date formats
      const date = new Date(value)
      return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function formatValue(value: any): string {
  if (value === undefined || value === null || value === '') return 'Not provided'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not provided'
    if (typeof value[0] === 'object') return `${value.length} item${value.length > 1 ? 's' : ''}`
    return value.join(', ')
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Format raw data keys to readable labels
function formatKeyLabel(key: string): string {
  // Handle dot notation (e.g., "maritalStatus.status" -> "Marital Status")
  const lastPart = key.includes('.') ? key.split('.').pop() || key : key

  // Convert camelCase to Title Case with spaces
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}
