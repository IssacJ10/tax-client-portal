"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import { uploadFile, type UploadedFile } from "@/services/strapi-client"
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, File, X } from "lucide-react"
import type { Question, QuestionSection, FilingRole } from "@/lib/domain/types"

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
    <div className="glass-card rounded-xl p-6 md:p-8">
      {/* Section Header ... */}
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">{getRoleLabel()} Information</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">{section.title}</h2>
        {section.description && <p className="mt-2 text-muted-foreground">{section.description}</p>}
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
              />
            )
          })
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No questions in this section.
          </p>
        )}
      </div>

      {/* Navigation ... */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="ghost"
          onClick={onPrev}
          disabled={isFirstSection}
          className={cn(isFirstSection && "invisible")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button onClick={onNext} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isLastSection ? (
            <Check className="mr-2 h-4 w-4" />
          ) : null}
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
}

function QuestionField({ question, value, error, onChange }: QuestionFieldProps) {
  const inputClassName = cn("glass-input", error && "border-destructive ring-destructive/50")

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

      case "date":
        return (
          <Input
            id={question.id}
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
        )

      case "select":
        return (
          <Select value={(value as string) || ""} onValueChange={onChange}>
            <SelectTrigger id={question.id} className={inputClassName}>
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((opt, idx) => (
                <SelectItem key={opt.value || `opt-${idx}`} value={opt.value || ""}>
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
              <div key={opt.value || `opt-${idx}`} className="flex items-center space-x-3">
                <RadioGroupItem value={opt.value || ""} id={`${question.id}-${opt.value || idx}`} />
                <Label
                  htmlFor={`${question.id}-${opt.value || idx}`}
                  className="cursor-pointer font-normal"
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
          return (
            <div className="space-y-3">
              {question.options.map((opt, idx) => (
                <div key={opt.value || `opt-${idx}`} className="flex items-start space-x-3">
                  <Checkbox
                    id={`${question.id}-${opt.value || idx}`}
                    checked={selectedValues.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selectedValues, opt.value])
                      } else {
                        onChange(selectedValues.filter((v: string) => v !== opt.value))
                      }
                    }}
                    className={error ? "border-destructive" : ""}
                  />
                  <Label
                    htmlFor={`${question.id}-${opt.value || idx}`}
                    className="cursor-pointer font-normal leading-snug"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          )
        }
        // Single checkbox (boolean)
        return (
          <div className="flex items-start space-x-3">
            <Checkbox
              id={question.id}
              checked={Boolean(value)}
              onCheckedChange={onChange}
              className={error ? "border-destructive" : ""}
            />
            <Label htmlFor={question.id} className="cursor-pointer font-normal leading-snug">
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

  return (
    <div className="space-y-2">
      {question.type !== "checkbox" && (
        <Label htmlFor={question.id} className={cn("flex items-center gap-1", error && "text-destructive")}>
          {question.label}
          {isRequired && <span className="text-destructive">*</span>}
        </Label>
      )}
      {question.helpText && question.type !== "checkbox" && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}

      {renderInput()}

      {error && (
        <p className="text-xs font-medium text-destructive animate-in fade-in-0 slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  )
}

// File Upload Field Component
interface FileUploadFieldProps {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

function FileUploadField({ question, value, onChange, error }: FileUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Parse existing value - could be string (filename), object (uploaded file info), or null
  const fileInfo = typeof value === 'object' && value !== null ? value as UploadedFile : null
  const fileName = fileInfo?.name || (typeof value === 'string' ? value : null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const uploaded = await uploadFile(file)
      onChange(uploaded)
    } catch (err: any) {
      console.error('[FileUploadField] Upload failed:', err)
      setUploadError(err.message || 'Failed to upload file')
      // Still store the filename so user knows what they selected
      onChange({ name: file.name, error: true })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    onChange(null)
    setUploadError(null)
  }

  const inputClassName = cn(
    "glass-input",
    error && "border-destructive focus-visible:ring-destructive"
  )

  // If we have a file already
  if (fileName) {
    return (
      <div className="space-y-2">
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          fileInfo?.url ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <File className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {fileInfo?.url && (
                <a
                  href={fileInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View file
                </a>
              )}
              {fileInfo && !fileInfo.url && (
                <p className="text-xs text-amber-600">Upload pending...</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>
    )
  }

  // No file yet - show upload input
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={question.id}
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
          className={cn(inputClassName, "file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20")}
          accept={(question as any).accept || ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"}
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
          </div>
        )}
      </div>
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
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
        <p className="text-sm text-muted-foreground py-2">
          {question.config?.emptyMessage || "No items added yet."}
        </p>
      ) : (
        items.map((item: Record<string, unknown>, itemIndex: number) => (
          <div
            key={itemIndex}
            className="relative rounded-lg border border-border bg-muted/30 p-4"
          >
            {/* Remove button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveItem(itemIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Item fields */}
            <div className="grid gap-4 pr-10">
              {fields.map((field: any) => (
                <div key={field.name} className="space-y-1.5">
                  <Label className="text-sm">
                    {field.label}
                    {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderRepeaterSubField(
                    field,
                    item[field.name],
                    (newValue) => handleFieldChange(itemIndex, field.name, newValue)
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddItem}
        className="w-full"
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
  const inputClassName = "glass-input"

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
      return (
        <Input
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
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
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((opt: any, idx: number) => (
              <SelectItem key={opt.value || `opt-${idx}`} value={opt.value || ""}>
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
