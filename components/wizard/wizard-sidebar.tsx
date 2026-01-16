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

function SidebarContent({ currentPhase, sections, currentSectionIndex, filing, formData, onSectionClick }: WizardSidebarProps) {
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
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground">TaxPortal</h1>
          <p className="text-xs text-muted-foreground">Tax Year 2025</p>
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
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                    status === "current" && "bg-sidebar-accent text-sidebar-accent-foreground",
                    status === "complete" && "text-primary",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2",
                      status === "current" && "border-primary bg-primary text-primary-foreground",
                      status === "complete" && "border-primary bg-primary/20 text-primary",
                      status === "pending" && "border-muted-foreground/30",
                    )}
                  >
                    {status === "complete" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>

                {/* Section sub-items - only show visible sections */}
                {showSections && step.phases.includes(currentPhase) && (
                  <ul className="ml-11 mt-2 space-y-1">
                    {visibleSectionsWithIndices.map(({ section, originalIndex }) => (
                      <li key={section.id}>
                        <button
                          onClick={() => onSectionClick(originalIndex)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                            originalIndex === currentSectionIndex
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-sidebar-foreground",
                          )}
                        >
                          <Circle
                            className={cn(
                              "h-2 w-2",
                              originalIndex === currentSectionIndex ? "fill-primary text-primary" : "fill-muted text-muted",
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
        <div className="border-t border-sidebar-border p-4">
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Filing Reference</p>
            <p className="font-mono text-sm text-sidebar-foreground">
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
        <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 glass" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent {...props} />
    </aside>
  )
}
