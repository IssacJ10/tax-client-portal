"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import { uploadSecureDocumentWithRetry, type SecureDocumentInfo } from "@/services/document-upload-service"
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, File, X } from "lucide-react"
import type { Question, QuestionSection, FilingRole } from "@/lib/domain/types"

// Date fields that are allowed to have future dates
const FUTURE_DATE_ALLOWED_FIELDS = [
  "corpInfo.fiscalYearEnd", // Fiscal year-end can be future
]

// Get today's date in YYYY-MM-DD format (using local time)
const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Min date for all date fields (January 1, 1900)
const MIN_DATE = "1900-01-01"

// Check if a field allows future dates
const allowsFutureDates = (fieldName: string): boolean => {
  return FUTURE_DATE_ALLOWED_FIELDS.includes(fieldName)
}

// Get date constraints for a field
const getDateConstraints = (fieldName: string): { min: string; max?: string } => {
  const constraints: { min: string; max?: string } = { min: MIN_DATE }

  if (!allowsFutureDates(fieldName)) {
    constraints.max = getTodayDate()
  }

  return constraints
}

interface QuestionRendererProps {
  section: QuestionSection
  formData: Record<string, unknown>
  errors?: Record<string, string> // <--- Add errors prop
  onFieldChange: (key: string, value: unknown) => void
  onNext: () => void
  onPrev: () => void
  isFirstSection: boolean
  isLastSection: boolean
  isSyncing: boolean
  role: FilingRole
  dependentIndex?: number
  // Document upload context
  filingId?: string
  personalFilingId?: string
}

export function QuestionRenderer({
  section,
  formData,
  errors = {},
  onFieldChange,
  onNext,
  onPrev,
  isFirstSection,
  isLastSection,
  isSyncing,
  role,
  dependentIndex,
  filingId,
  personalFilingId,
}: QuestionRendererProps) {
  const getRoleLabel = () => {
    switch (role) {
      case "spouse":
        return "Spouse"
      case "dependent":
        return dependentIndex !== undefined ? `Dependent ${dependentIndex + 1}` : "Dependent"
      default:
        return "Your"
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 md:p-8 shadow-sm">
      {/* Section Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#07477a]">{getRoleLabel()} Information</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">{section.title}</h2>
        {section.description && <p className="mt-2 text-gray-500">{section.description}</p>}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {section.questions && section.questions.length > 0 ? (
          section.questions.map((question) => {
            if (!QuestionRegistry.isQuestionVisible(question, formData)) {
              return null
            }

            return (
              <QuestionField
                key={question.id}
                question={question}
                value={formData[question.name]}
                error={errors[question.id]}
                onChange={(value) => onFieldChange(question.name, value)}
                filingId={filingId}
                personalFilingId={personalFilingId}
              />
            )
          })
        ) : (
          <p className="text-center text-gray-500 py-4">
            No questions in this section.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
        <Button
          variant="ghost"
          onClick={onPrev}
          disabled={isFirstSection}
          className={cn("text-gray-600 hover:text-gray-900 hover:bg-gray-100", isFirstSection && "invisible")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          onClick={onNext}
          disabled={isSyncing}
          className="bg-[#07477a] hover:bg-[#053560] text-white"
        >
          {isLastSection && <Check className="mr-2 h-4 w-4" />}
          {isLastSection ? "Complete" : "Continue"}
          {!isLastSection && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

interface QuestionFieldProps {
  question: Question
  value: unknown
  error?: string // <--- Add error prop
  onChange: (value: unknown) => void
  // Document upload context
  filingId?: string
  personalFilingId?: string
}

function QuestionField({ question, value, error, onChange, filingId, personalFilingId }: QuestionFieldProps) {
  // Clean white theme input styling
  const inputClassName = cn(
    "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
    "focus:border-[#07477a] focus:ring-[#07477a]/20",
    error && "border-rose-400 ring-rose-400/20"
  )

  const renderInput = () => {
    switch (question.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            id={question.id}
            type={question.type === "phone" ? "tel" : question.type}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={inputClassName}
          />
        )

      case "number":
        return (
          <Input
            id={question.id}
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={question.placeholder}
            className={inputClassName}
          />
        )

      case "textarea":
        return (
          <textarea
            id={question.id}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-sm resize-y min-h-[100px]",
              inputClassName
            )}
          />
        )

      case "date":
        const dateConstraints = getDateConstraints(question.name)
        return (
          <DatePicker
            id={question.id}
            value={(value as string) || ""}
            onChange={(val) => onChange(val)}
            minDate={dateConstraints.min}
            maxDate={dateConstraints.max}
            placeholder={question.placeholder || "Select date"}
            className={error ? "border-rose-400" : ""}
          />
        )

      case "select":
        return (
          <Select value={(value as string) || ""} onValueChange={onChange}>
            <SelectTrigger id={question.id} className={cn(inputClassName, "text-gray-900")}>
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {question.options?.map((opt, idx) => (
                <SelectItem
                  key={opt.value || `opt-${idx}`}
                  value={opt.value || ""}
                  className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "radio":
        return (
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={onChange}
            className="space-y-3"
          >
            {question.options?.map((opt, idx) => (
              <div
                key={opt.value || `opt-${idx}`}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <RadioGroupItem
                  value={opt.value || ""}
                  id={`${question.id}-${opt.value || idx}`}
                  className="border-gray-300 text-[#07477a] data-[state=checked]:border-[#07477a] data-[state=checked]:bg-[#07477a]"
                />
                <Label
                  htmlFor={`${question.id}-${opt.value || idx}`}
                  className="cursor-pointer font-normal text-gray-700 flex-1"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "checkbox":
        // Multi-select checkbox group (has options array)
        if (question.options && question.options.length > 0) {
          const selectedValues = Array.isArray(value) ? value : []
          // Check if NA is selected - if so, disable other options
          const naIsSelected = selectedValues.includes("NA")

          return (
            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                // Determine if this option should be disabled
                // NA option is never disabled, but other options are disabled when NA is selected
                const isNaOption = opt.value === "NA"
                const isDisabled = !isNaOption && naIsSelected

                return (
                  <div
                    key={opt.value || `opt-${idx}`}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                      isDisabled
                        ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <Checkbox
                      id={`${question.id}-${opt.value || idx}`}
                      checked={selectedValues.includes(opt.value)}
                      disabled={isDisabled}
                      onCheckedChange={(checked) => {
                        if (isDisabled) return

                        if (checked) {
                          // If selecting NA, clear all other selections
                          if (isNaOption) {
                            onChange(["NA"])
                          } else {
                            // If selecting a non-NA option, remove NA if it was selected
                            const newValues = selectedValues.filter((v: string) => v !== "NA")
                            onChange([...newValues, opt.value])
                          }
                        } else {
                          onChange(selectedValues.filter((v: string) => v !== opt.value))
                        }
                      }}
                      className={cn(
                        "border-gray-300 data-[state=checked]:bg-[#07477a] data-[state=checked]:border-[#07477a]",
                        error && "border-rose-400",
                        isDisabled && "cursor-not-allowed"
                      )}
                    />
                    <Label
                      htmlFor={`${question.id}-${opt.value || idx}`}
                      className={cn(
                        "font-normal leading-snug",
                        isDisabled ? "text-gray-400 cursor-not-allowed" : "cursor-pointer text-gray-700"
                      )}
                    >
                      {opt.label}
                    </Label>
                  </div>
                )
              })}
            </div>
          )
        }
        // Single checkbox (boolean)
        return (
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Checkbox
              id={question.id}
              checked={Boolean(value)}
              onCheckedChange={onChange}
              className={cn(
                "border-gray-300 data-[state=checked]:bg-[#07477a] data-[state=checked]:border-[#07477a]",
                error && "border-rose-400"
              )}
            />
            <Label htmlFor={question.id} className="cursor-pointer font-normal leading-snug text-gray-700">
              {question.helpText || question.label}
            </Label>
          </div>
        )

      case "file":
        return (
          <FileUploadField
            question={question}
            value={value}
            onChange={onChange}
            error={error}
            filingId={filingId}
            personalFilingId={personalFilingId}
          />
        )

      case "repeater":
        return (
          <RepeaterField
            question={question}
            value={value}
            onChange={onChange}
          />
        )

      default:
        return (
          <Input
            id={question.id}
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={inputClassName}
          />
        )
    }
  }

  const isRequired = question.validation?.required

  // For checkbox type: show label if it has options (multi-select checkbox group)
  // Don't show label for single boolean checkbox (it has inline label)
  const isMultiSelectCheckbox = question.type === "checkbox" && question.options && question.options.length > 0
  const shouldShowLabel = question.type !== "checkbox" || isMultiSelectCheckbox

  return (
    <div className="space-y-2">
      {shouldShowLabel && (
        <Label htmlFor={question.id} className={cn("flex items-center gap-1 text-gray-900 font-medium", error && "text-rose-500")}>
          {question.label}
          {isRequired && <span className="text-rose-500">*</span>}
        </Label>
      )}
      {question.helpText && shouldShowLabel && (
        <p className="text-sm text-gray-500">{question.helpText}</p>
      )}

      {renderInput()}

      {error && (
        <p className="text-xs font-medium text-rose-500 animate-in fade-in-0 slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  )
}

// File Upload Field Component - Supports single and multiple file uploads
interface FileUploadFieldProps {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  filingId?: string
  personalFilingId?: string
}

function FileUploadField({ question, value, onChange, error, filingId, personalFilingId }: FileUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0)
  const [totalUploads, setTotalUploads] = useState(0)

  // Multiple file upload is enabled by default, can be disabled with config.multiple = false
  const allowMultiple = question.config?.multiple !== false
  const maxFiles = question.config?.maxFiles || 10
  const acceptTypes = question.config?.accept || ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"

  // File size limit: 10 MB
  const MAX_FILE_SIZE_MB = 10
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

  // Normalize value to always work with arrays internally for multi-file mode
  const getFilesArray = (): SecureDocumentInfo[] => {
    if (!value) return []
    if (Array.isArray(value)) return value as SecureDocumentInfo[]
    // Single file - wrap in array for consistent handling
    if (typeof value === 'object') return [value as SecureDocumentInfo]
    if (typeof value === 'string') return [{ originalFilename: value } as SecureDocumentInfo]
    return []
  }

  const files = getFilesArray()
  const hasFiles = files.length > 0
  const canAddMore = allowMultiple && files.length < maxFiles

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // Check if we have filingId - required for secure upload
    if (!filingId) {
      setUploadError('Unable to upload: Filing context not available')
      return
    }

    // Convert FileList to array
    const filesToUpload = Array.from(selectedFiles)

    // Validate file sizes (10 MB max per file)
    const oversizedFiles = filesToUpload.filter(f => f.size > MAX_FILE_SIZE_BYTES)
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ')
      setUploadError(`File${oversizedFiles.length > 1 ? 's' : ''} too large (max ${MAX_FILE_SIZE_MB}MB): ${fileNames}`)
      return
    }

    // Check max files limit (10 files max)
    if (allowMultiple && files.length + filesToUpload.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed. You can add ${maxFiles - files.length} more.`)
      return
    }

    // For single file mode, also enforce limit of 1
    if (!allowMultiple && filesToUpload.length > 1) {
      setUploadError('Only one file can be uploaded for this field.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    setTotalUploads(filesToUpload.length)
    setCurrentUploadIndex(0)

    const uploadedFiles: SecureDocumentInfo[] = [...files]
    const failedFiles: string[] = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      setCurrentUploadIndex(i + 1)

      try {
        const uploaded = await uploadSecureDocumentWithRetry(file, {
          filingId,
          personalFilingId,
          documentType: 'supporting_doc',
          questionId: question.id,
          fieldName: question.name,
          onProgress: (progress) => setUploadProgress(progress),
        })
        uploadedFiles.push(uploaded)
      } catch (err: any) {
        console.error('[FileUploadField] Upload failed:', file.name, err)
        failedFiles.push(file.name)
        // Still track the file with error state
        uploadedFiles.push({ originalFilename: file.name, error: true } as any)
      }
    }

    // Update value based on mode
    if (allowMultiple) {
      onChange(uploadedFiles)
    } else {
      // Single file mode - just use the last uploaded file
      onChange(uploadedFiles[uploadedFiles.length - 1] || null)
    }

    if (failedFiles.length > 0) {
      setUploadError(`Failed to upload: ${failedFiles.join(', ')}`)
    }

    setIsUploading(false)
    setUploadProgress(0)
    setTotalUploads(0)
    setCurrentUploadIndex(0)

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleRemove = (index: number) => {
    if (allowMultiple) {
      const newFiles = files.filter((_, i) => i !== index)
      onChange(newFiles.length > 0 ? newFiles : null)
    } else {
      onChange(null)
    }
    setUploadError(null)
  }

  const inputClassName = cn(
    "bg-white border-gray-200 text-gray-900",
    error && "border-rose-400"
  )

  // Render single file item
  const renderFileItem = (fileInfo: SecureDocumentInfo, index: number) => {
    const fileName = fileInfo?.originalFilename || 'Unknown file'
    const hasError = (fileInfo as any)?.error === true

    return (
      <div
        key={`${fileName}-${index}`}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          hasError
            ? "border-rose-300 bg-rose-50"
            : fileInfo?.documentId
              ? "border-[#07477a]/30 bg-[#07477a]/5"
              : "border-gray-200 bg-gray-50"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <File className={cn("h-5 w-5 shrink-0", hasError ? "text-rose-500" : "text-gray-500")} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
            {fileInfo?.documentId && (
              <p className="text-xs text-[#07477a]">Uploaded securely</p>
            )}
            {hasError && (
              <p className="text-xs text-rose-600">Upload failed</p>
            )}
            {!fileInfo?.documentId && !hasError && (
              <p className="text-xs text-amber-600">Upload pending...</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleRemove(index)}
          className="h-8 w-8 p-0 text-gray-400 hover:text-rose-500 hover:bg-rose-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Show existing files */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((file, index) => renderFileItem(file, index))}
        </div>
      )}

      {/* Upload input - show if no files (single mode) or can add more (multi mode) */}
      {(!hasFiles || canAddMore) && (
        <div className="relative">
          <Input
            id={question.id}
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            multiple={allowMultiple}
            className={cn(inputClassName, "file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#07477a]/10 file:text-[#07477a] hover:file:bg-[#07477a]/20")}
            accept={acceptTypes}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-md">
              <Loader2 className="h-5 w-5 animate-spin text-[#07477a]" />
              <span className="ml-2 text-sm text-gray-600">
                {totalUploads > 1
                  ? `Uploading ${currentUploadIndex}/${totalUploads} (${uploadProgress}%)...`
                  : uploadProgress > 0 ? `Uploading ${uploadProgress}%...` : 'Uploading...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Helper text for file limits */}
      {!isUploading && (
        <p className="text-xs text-gray-500">
          {allowMultiple
            ? hasFiles
              ? `${files.length} file${files.length !== 1 ? 's' : ''} uploaded. ${canAddMore ? `You can add ${maxFiles - files.length} more.` : 'Maximum reached.'} Max ${MAX_FILE_SIZE_MB}MB per file.`
              : `You can upload up to ${maxFiles} files. Max ${MAX_FILE_SIZE_MB}MB per file.`
            : `Max file size: ${MAX_FILE_SIZE_MB}MB`}
        </p>
      )}

      {/* Error message */}
      {uploadError && (
        <p className="text-xs text-rose-500">{uploadError}</p>
      )}
    </div>
  )
}

// Repeater Field Component for dynamic array fields
interface RepeaterFieldProps {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
}

function RepeaterField({ question, value, onChange }: RepeaterFieldProps) {
  // Ensure value is always an array
  const items = Array.isArray(value) ? value : []
  const fields = question.fields || []
  const addButtonLabel = question.config?.addButtonLabel || "Add Item"

  const handleAddItem = () => {
    // Create empty item with all field keys
    const newItem: Record<string, unknown> = {}
    fields.forEach((field: any) => {
      newItem[field.name] = ""
    })
    onChange([...items, newItem])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  const handleFieldChange = (itemIndex: number, fieldName: string, fieldValue: unknown) => {
    const newItems = items.map((item, i) => {
      if (i === itemIndex) {
        return { ...item, [fieldName]: fieldValue }
      }
      return item
    })
    onChange(newItems)
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          {question.config?.emptyMessage || "No items added yet."}
        </p>
      ) : (
        items.map((item: Record<string, unknown>, itemIndex: number) => (
          <div
            key={itemIndex}
            className="relative rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            {/* Remove button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-400 hover:text-rose-500 hover:bg-rose-50"
              onClick={() => handleRemoveItem(itemIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Item fields */}
            <div className="grid gap-4 pr-10">
              {fields.map((field: any) => {
                // Check conditional visibility for this field within the repeater item
                if (field.conditional) {
                  const { field: parentField, operator, value: condValue } = field.conditional
                  const parentValue = item[parentField]

                  let isVisible = false
                  switch (operator) {
                    case "equals":
                      isVisible = parentValue === condValue
                      break
                    case "notEquals":
                      isVisible = parentValue !== condValue
                      break
                    default:
                      isVisible = true
                  }

                  if (!isVisible) return null
                }

                return (
                  <div key={field.name} className="space-y-1.5">
                    <Label className="text-sm text-gray-700">
                      {field.label}
                      {field.validation?.required && <span className="text-rose-500 ml-1">*</span>}
                    </Label>
                    {renderRepeaterSubField(
                      field,
                      item[field.name],
                      (newValue) => handleFieldChange(itemIndex, field.name, newValue)
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Add button */}
      <Button
        type="button"
        size="sm"
        onClick={handleAddItem}
        className="w-full bg-[#07477a] hover:bg-[#053560] text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        {addButtonLabel}
      </Button>
    </div>
  )
}

// Render individual field inside repeater
function renderRepeaterSubField(
  field: any,
  value: unknown,
  onChange: (value: unknown) => void
) {
  const inputClassName = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#07477a] focus:ring-[#07477a]/20"

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <Input
          type={field.type === "phone" ? "tel" : field.type}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )

    case "number":
      return (
        <Input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )

    case "date":
      // For repeater fields, apply same date constraints (no future dates by default)
      const repeaterDateConstraints = getDateConstraints(field.name || "")
      return (
        <DatePicker
          value={(value as string) || ""}
          onChange={(val) => onChange(val)}
          minDate={repeaterDateConstraints.min}
          maxDate={repeaterDateConstraints.max}
          placeholder={field.placeholder || "Select date"}
        />
      )

    case "select":
      // Normalize options to { value, label } format - handle both string and object options
      const normalizedOptions = field.options?.map((opt: any) => {
        if (typeof opt === 'string') {
          return { value: opt.toLowerCase().replace(/\s+/g, '_'), label: opt }
        }
        return opt
      }) || []
      return (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger className={cn(inputClassName, "text-gray-900")}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 shadow-lg">
            {normalizedOptions.map((opt: any, idx: number) => (
              <SelectItem
                key={opt.value || `opt-${idx}`}
                value={opt.value || ""}
                className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "radio":
      // Render radio as a select dropdown for cleaner UI in repeater context
      const radioOptions = field.options?.map((opt: any) => {
        if (typeof opt === 'string') {
          return { value: opt.toUpperCase(), label: opt }
        }
        return opt
      }) || []
      return (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger className={cn(inputClassName, "text-gray-900")}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 shadow-lg">
            {radioOptions.map((opt: any, idx: number) => (
              <SelectItem
                key={opt.value || `opt-${idx}`}
                value={opt.value || ""}
                className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    default:
      return (
        <Input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )
  }
}
