"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Check, Circle, User, Users, Heart, FileCheck, Leaf, Building2, Scale } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import type { WizardPhase, QuestionSection, Filing } from "@/lib/domain/types"

interface WizardSidebarProps {
  currentPhase: WizardPhase
  sections: QuestionSection[]
  currentSectionIndex: number
  filing: Filing | undefined
  formData: Record<string, unknown>
  onSectionClick: (index: number) => void
  onPhaseClick?: (phaseId: string) => void
}

// Personal filing (INDIVIDUAL) phase steps
const personalPhaseSteps = [
  { id: "PRIMARY", label: "Your Information", icon: User, phases: ["PRIMARY_ACTIVE", "PRIMARY_COMPLETE"] },
  {
    id: "SPOUSE",
    label: "Spouse Information",
    icon: Heart,
    phases: ["SPOUSE_CHECKPOINT", "SPOUSE_ACTIVE", "SPOUSE_COMPLETE"],
  },
  {
    id: "DEPENDENT",
    label: "Dependents",
    icon: Users,
    phases: ["DEPENDENT_CHECKPOINT", "DEPENDENT_ACTIVE", "DEPENDENT_COMPLETE"],
  },
  { id: "REVIEW", label: "Review & Submit", icon: FileCheck, phases: ["REVIEW"] },
]

// Corporate filing phase steps (simpler flow)
const corporatePhaseSteps = [
  { id: "CORPORATE", label: "Corporation Details", icon: Building2, phases: ["CORPORATE_ACTIVE", "CORPORATE_COMPLETE"] },
  { id: "REVIEW", label: "Review & Submit", icon: FileCheck, phases: ["REVIEW"] },
]

// Trust filing phase steps (simpler flow)
const trustPhaseSteps = [
  { id: "TRUST", label: "Trust Details", icon: Scale, phases: ["TRUST_ACTIVE", "TRUST_COMPLETE"] },
  { id: "REVIEW", label: "Review & Submit", icon: FileCheck, phases: ["REVIEW"] },
]

function SidebarContent({ currentPhase, sections, currentSectionIndex, filing, formData, onSectionClick, onPhaseClick }: WizardSidebarProps) {
  // Determine which phase steps to use based on filing type
  const phaseSteps = useMemo(() => {
    if (filing?.type === "CORPORATE") return corporatePhaseSteps
    if (filing?.type === "TRUST") return trustPhaseSteps
    return personalPhaseSteps
  }, [filing?.type])

  const getPhaseStatus = (phases: string[]) => {
    if (phases.includes(currentPhase)) return "current"
    const phaseOrder = phaseSteps.flatMap((s) => s.phases)
    const currentIndex = phaseOrder.indexOf(currentPhase)
    const stepIndex = phaseOrder.indexOf(phases[0])
    return stepIndex < currentIndex ? "complete" : "pending"
  }

  // Check if a phase can be navigated to (has data to show)
  const canNavigateToPhase = (stepId: string): boolean => {
    if (!filing?.personalFilings) return false

    switch (stepId) {
      case "PRIMARY":
        return filing.personalFilings.some(pf => pf.type === "primary")
      case "SPOUSE":
        return filing.personalFilings.some(pf => pf.type === "spouse")
      case "DEPENDENT":
        return filing.personalFilings.some(pf => pf.type === "dependent")
      case "REVIEW":
        return true // Always navigable
      case "CORPORATE":
      case "TRUST":
        return true // Corporate/Trust filings always have their child
      default:
        return false
    }
  }

  const handlePhaseClick = (stepId: string, status: string) => {
    // Can navigate to complete or current phases (but not pending)
    if (status === "pending") return
    if (!canNavigateToPhase(stepId)) return
    if (onPhaseClick) onPhaseClick(stepId)
  }

  // Show sections for active phases (personal, corporate, or trust)
  const showSections = [
    "PRIMARY_ACTIVE", "SPOUSE_ACTIVE", "DEPENDENT_ACTIVE",
    "CORPORATE_ACTIVE", "TRUST_ACTIVE"
  ].includes(currentPhase)

  // Filter sections to only show those with at least one visible question
  // Also track original indices for proper navigation
  const visibleSectionsWithIndices = useMemo(() => {
    return sections
      .map((section, originalIndex) => ({ section, originalIndex }))
      .filter(({ section }) => {
        // If section has conditional.anyQuestionVisible, check if any question is visible
        if (section.conditional?.anyQuestionVisible) {
          const hasVisibleQuestion = section.questions?.some(
            (q) => QuestionRegistry.isQuestionVisible(q, formData)
          )
          return hasVisibleQuestion
        }
        // Always show sections without conditional logic
        return true
      })
  }, [sections, formData])

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo - H&R Block green header */}
      <div className="flex items-center gap-3 bg-[#00754a] p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-white">TaxPortal</h1>
          <p className="text-xs text-white/70">Tax Year 2025</p>
        </div>
      </div>

      {/* Phase Steps */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {phaseSteps.map((step) => {
            const status = getPhaseStatus(step.phases)
            const Icon = step.icon

            return (
              <li key={step.id}>
                <button
                  onClick={() => handlePhaseClick(step.id, status)}
                  disabled={status === "pending" || !canNavigateToPhase(step.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors text-left",
                    status === "current" && "bg-[#00754a]/10 text-gray-900",
                    status === "complete" && "text-[#00754a] hover:bg-[#00754a]/5 cursor-pointer",
                    status === "pending" && "text-gray-400 cursor-not-allowed",
                    status !== "pending" && canNavigateToPhase(step.id) && status !== "current" && "hover:bg-gray-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                      status === "current" && "border-[#00754a] bg-[#00754a] text-white shadow-lg shadow-[#00754a]/30",
                      status === "complete" && "border-[#00754a] bg-[#00754a]/10 text-[#00754a]",
                      status === "pending" && "border-gray-200 text-gray-400",
                    )}
                  >
                    {status === "complete" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                </button>

                {/* Section sub-items - only show visible sections */}
                {showSections && step.phases.includes(currentPhase) && (
                  <ul className="ml-11 mt-2 space-y-1">
                    {visibleSectionsWithIndices.map(({ section, originalIndex }) => (
                      <li key={section.id}>
                        <button
                          onClick={() => onSectionClick(originalIndex)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            originalIndex === currentSectionIndex
                              ? "bg-[#00754a]/10 text-[#00754a] font-medium"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                          )}
                        >
                          <Circle
                            className={cn(
                              "h-2 w-2",
                              originalIndex === currentSectionIndex ? "fill-[#00754a] text-[#00754a]" : "fill-gray-300 text-gray-300",
                            )}
                          />
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Filing Reference */}
      {filing && (
        <div className="border-t border-gray-100 p-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Filing Reference</p>
            <p className="font-mono text-sm text-[#00754a] font-medium">
              {filing.referenceNumber || `JJ-${String(filing.id).slice(-6).toUpperCase()}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function WizardSidebar(props: WizardSidebarProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 rounded-xl bg-[#00754a] text-white hover:bg-[#005c3b] shadow-lg" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 bg-white border-r border-gray-200 p-0">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-gray-200 bg-white shadow-sm lg:block">
      <SidebarContent {...props} />
    </aside>
  )
}
