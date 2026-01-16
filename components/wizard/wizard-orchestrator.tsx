"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useFilingContext } from "@/context/filing-context"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import { getPhaseInfo } from "@/lib/domain/filing-state-machine"
import { WizardSidebar } from "./wizard-sidebar"
import { WizardProgress } from "./wizard-progress"
import { QuestionRenderer } from "./question-renderer"
import { IntermissionCard } from "./intermission-card"
import { ReviewScreen } from "./review-screen"
import { CorporateReviewScreen } from "./corporate-review-screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Users, UserPlus, Heart, Minus, Plus } from "lucide-react"

interface WizardOrchestratorProps {
  filingId: string
  initialPersonalFilingId: string // Also used for corporateFilingId for corporate filings
}

export function WizardOrchestrator({ filingId, initialPersonalFilingId }: WizardOrchestratorProps) {
  const {
    state,
    filing,
    isLoading,
    isSyncing,
    saveFormData,
    flushSave,
    addSpouse,
    addDependent,
    startDependent,
    createPrimaryFiling,
    markFilingInProgress,
    refreshFiling,
    dispatch,
    schema,
  } = useFilingContext()

  // We need to re-implement helper methods if they aren't in context
  const nextSection = () => dispatch({ type: "NEXT_SECTION" })
  const prevSection = () => dispatch({ type: "PREV_SECTION" })
  const completeCurrentPhase = () => dispatch({ type: "COMPLETE_PHASE" })
  const goToReview = () => dispatch({ type: "GO_TO_REVIEW" })
  const skipSpouse = () => dispatch({ type: "SKIP_SPOUSE" })
  const skipDependents = () => dispatch({ type: "SKIP_DEPENDENTS" })

  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dependentCount, setDependentCount] = useState(1)
  const [isCreatingDependents, setIsCreatingDependents] = useState(false)

  // Track completed personal filing IDs locally (don't depend on SWR cache)
  const [completedPersonalFilingIds, setCompletedPersonalFilingIds] = useState<Set<string>>(new Set())
  // Track created dependent IDs with their order
  const [createdDependentIds, setCreatedDependentIds] = useState<string[]>([])

  // Use refs to prevent duplicate calls (persists across React Strict Mode double-renders)
  const isCreatingPrimaryRef = useRef(false)
  const hasInitializedRef = useRef(false)

  // Determine if this is a corporate or trust filing
  const isCorporateFiling = filing?.type === "CORPORATE"
  const isTrustFiling = filing?.type === "TRUST"
  const isBusinessFiling = isCorporateFiling || isTrustFiling

  // Initialize state when component mounts
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitializedRef.current || state.phase !== "IDLE" || !filingId) {
      return
    }

    // IMPORTANT: Wait for filing data to load before initializing
    // This ensures we know the filing type (CORPORATE vs INDIVIDUAL) before choosing the path
    if (!filing || isLoading) {
      return
    }

    // Handle Corporate/Trust filings differently
    if (isBusinessFiling) {
      hasInitializedRef.current = true

      if (isCorporateFiling) {
        // For corporate filings, use the corporateFiling child ID
        const corporateFilingId = (filing as any).corporateFiling?.id ||
                                  (filing as any).corporateFiling?.documentId ||
                                  initialPersonalFilingId
        console.log('[WizardOrchestrator] Initializing CORPORATE filing:', { filingId, corporateFilingId, filingType: filing.type })
        dispatch({
          type: "INIT_CORPORATE_FILING",
          payload: {
            filingId,
            corporateFilingId: corporateFilingId || filingId, // Fallback to parent filing ID
          },
        })
      } else if (isTrustFiling) {
        // For trust filings, use the trustFiling child ID
        const trustFilingId = (filing as any).trustFiling?.id ||
                              (filing as any).trustFiling?.documentId ||
                              initialPersonalFilingId
        console.log('[WizardOrchestrator] Initializing TRUST filing:', { filingId, trustFilingId, filingType: filing.type })
        dispatch({
          type: "INIT_TRUST_FILING",
          payload: {
            filingId,
            trustFilingId: trustFilingId || filingId,
          },
        })
      }
      return
    }

    // For INDIVIDUAL filings - use the personalFilingId from URL or find from data
    if (initialPersonalFilingId) {
      hasInitializedRef.current = true
      console.log('[WizardOrchestrator] Initializing PERSONAL filing:', { filingId, personalFilingId: initialPersonalFilingId, filingType: filing.type })
      dispatch({
        type: "INIT_FILING",
        payload: {
          filingId,
          personalFilingId: initialPersonalFilingId,
        },
      })
      return
    }

    // Fallback: Try to find existing personal filing from loaded data (only for personal filings)
    if (filing && !isBusinessFiling) {
      const existingPersonalFiling =
        filing.personalFilings?.find(pf => pf.type === "primary") ||
        filing.personalFilings?.[0]

      if (existingPersonalFiling?.id) {
        hasInitializedRef.current = true
        dispatch({
          type: "INIT_FILING",
          payload: {
            filingId,
            personalFilingId: existingPersonalFiling.id,
          },
        })
        return
      }

      // Only create a new primary filing if:
      // 1. Filing data is loaded
      // 2. No personal filings exist in the loaded data
      // 3. No URL param was provided (indicating initFiling didn't create one)
      // 4. We're not already creating one
      // This is a last-resort fallback - normally initFiling() creates the primary
      if (!isLoading &&
          filing.personalFilings?.length === 0 &&
          !initialPersonalFilingId &&
          !isCreatingPrimaryRef.current) {
        console.warn("No primary filing found, creating one as fallback")
        isCreatingPrimaryRef.current = true
        hasInitializedRef.current = true
        createPrimaryFiling(filingId)
          .catch((err) => {
            console.error("Failed to create primary filing:", err)
            // Reset flags on error to allow retry
            isCreatingPrimaryRef.current = false
            hasInitializedRef.current = false
          })
      }
    }
  }, [filingId, initialPersonalFilingId, state.phase, dispatch, filing, isLoading, createPrimaryFiling, isBusinessFiling, isCorporateFiling, isTrustFiling])

  // Track previous personal filing ID to detect switches
  const prevPersonalFilingIdRef = useRef<string | null>(null)
  // Track if we've done initial data load
  const hasLoadedInitialDataRef = useRef(false)

  // Load form data when switching personal filings OR on initial load
  useEffect(() => {
    if (filing && state.currentPersonalFilingId) {
      const currentFiling = filing.personalFilings.find((pf) => pf.id === state.currentPersonalFilingId)

      // Detect if we switched to a different personal filing
      const didSwitchPerson = prevPersonalFilingIdRef.current !== state.currentPersonalFilingId

      // Also load data on initial mount if we haven't loaded yet
      const isInitialLoad = !hasLoadedInitialDataRef.current && currentFiling

      if (didSwitchPerson || isInitialLoad) {
        // Always reset errors when switching person or on initial load
        setErrors({})

        if (currentFiling) {
          // Load from the personal filing's formData, or empty if it's a fresh record
          const savedData = currentFiling.formData
          // If formData is empty/undefined or has no meaningful keys, use empty object
          const hasData = savedData && Object.keys(savedData).length > 0
          setFormData(hasData ? savedData : {})
          hasLoadedInitialDataRef.current = true
        } else {
          // Person not in filing data yet (newly created, SWR hasn't refetched)
          // Start with clean slate
          setFormData({})
        }

        prevPersonalFilingIdRef.current = state.currentPersonalFilingId
      }
    }
  }, [filing, state.currentPersonalFilingId])

  // Calculate role based on phase
  const getCurrentRole = (phase: string): "primary" | "spouse" | "dependent" => {
    // Basic mapping based on phase prefix or specific phases
    if (phase.startsWith("SPOUSE")) return "spouse"
    if (phase.startsWith("DEPENDENT")) return "dependent"
    return "primary"
  }

  const currentRole = getCurrentRole(state.phase)

  // For corporate/trust filings, get the appropriate schema
  const corporateSchema = isBusinessFiling && filing
    ? QuestionRegistry.getSchema(filing.year, filing.type)
    : null

  // Check if user is eligible for spouse (married or common_law)
  // Need to check formData from current session AND stored data from primary filing
  const maritalStatusFromForm = formData["maritalStatus.status"] as string | undefined

  // Also check stored data from the primary filing (for page reloads)
  const primaryFiling = filing?.personalFilings?.find(pf => pf.type === "primary")
  const maritalStatusFromStored = primaryFiling?.formData?.["maritalStatus.status"] as string | undefined

  // Use formData first (current session), then fall back to stored data
  const maritalStatus = maritalStatusFromForm || maritalStatusFromStored

  // User is eligible for spouse if marital status is MARRIED or COMMON_LAW
  const isEligibleForSpouse = maritalStatus === "MARRIED" || maritalStatus === "COMMON_LAW"

  // Only auto-skip if maritalStatus has been explicitly answered with a non-married value
  // Don't skip if maritalStatus is undefined (user hasn't answered yet)
  const shouldAutoSkipSpouse = maritalStatus !== undefined && !isEligibleForSpouse

  // Auto-skip spouse checkpoint if explicitly not married/common_law
  useEffect(() => {
    if (state.phase === "SPOUSE_CHECKPOINT" && shouldAutoSkipSpouse) {
      skipSpouse()
    }
  }, [state.phase, shouldAutoSkipSpouse, skipSpouse])

  // Refresh filing data when entering REVIEW phase to get latest data from server
  useEffect(() => {
    if (state.phase === "REVIEW") {
      refreshFiling()
    }
  }, [state.phase, refreshFiling])

  // Get sections for current role (pass formData for conditional step filtering)
  // For corporate/trust filings, use their schema and 'primary' role (since they don't have roles)
  const activeSchema = isBusinessFiling ? corporateSchema : schema
  const sections = activeSchema ? QuestionRegistry.getSectionsForRole(activeSchema, currentRole, formData) : []
  const currentSection = sections[state.currentSectionIndex]
  const isLastSection = state.currentSectionIndex === sections.length - 1
  const phaseInfo = getPhaseInfo(state.phase, filing?.type)


  // Handle form field change
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setFormData((prev) => {
        const updated = { ...prev, [key]: value }
        if (state.currentPersonalFilingId) {
          saveFormData(state.currentPersonalFilingId, updated)
        }
        return updated
      })
      // Clear error when user types
      // We need to find the question ID that maps to this key (name), ideally we map by ID for errors
      // specific logic might be needed if key !== question.id.
      // For now, let's just clear specific error if we can map it back or clear all if lazy.
      // Better: In QuestionRenderer we passed `key` as `question.key` which is `question.name`.
      // The validator uses `question.id` for error keys.
      // Let's assume for now we clear errors roughly or let next validate fix it.
      setErrors((prev) => {
        const newErrors = { ...prev }
        // Attempt to clear error for this field
        // Since we don't have the ID here easily, maybe we just leave it until next validate or rely on re-render
        return newErrors
      })
    },
    [state.currentPersonalFilingId, saveFormData],
  )

  // Handle next button with Validation
  const handleNext = useCallback(async () => {
    // Validate current section
    const { isValid, errors: newErrors } = QuestionRegistry.validateSection(currentSection, formData)

    if (!isValid) {
      setErrors(newErrors)
      return // STOP
    }

    setErrors({}) // Clear errors if valid

    // Flush save immediately before navigation to ensure data is persisted
    await flushSave()

    // Mark filing as IN_PROGRESS on first successful "Next" click
    if (filingId) {
      markFilingInProgress(filingId)
    }

    if (isLastSection) {
      // For corporate/trust filings, mark the child record as complete
      if (isBusinessFiling && state.currentPersonalFilingId) {
        try {
          if (isCorporateFiling) {
            const { CorporateFilingService } = await import("@/services/corporate-filing-service")
            await CorporateFilingService.markCorporateFilingComplete(state.currentPersonalFilingId)
          }
          // TODO: Add TrustFilingService.markTrustFilingComplete when implemented
        } catch (err) {
          console.error('Failed to mark business filing as completed:', err)
        }
      } else if (state.currentPersonalFilingId) {
        // Mark current personal filing as COMPLETED before moving to next phase
        try {
          const { FilingService } = await import("@/services/filing-service")
          await FilingService.updatePersonalFilingStatus(state.currentPersonalFilingId, 'COMPLETED')

          // Track completed ID locally (don't depend on SWR cache refresh)
          setCompletedPersonalFilingIds(prev => new Set([...prev, state.currentPersonalFilingId!]))

          // Also trigger SWR refetch in background
          const { mutate } = await import("swr")
          mutate(`filing/${filingId}`)
        } catch (err) {
          console.error('Failed to mark personal filing as completed:', err)
        }
      }

      console.log('[handleNext] Completing phase. Current state:', {
        phase: state.phase,
        totalDependents: state.totalDependents,
        currentDependentIndex: state.currentDependentIndex,
        currentPersonalFilingId: state.currentPersonalFilingId,
        isBusinessFiling
      })

      completeCurrentPhase()
    } else {
      nextSection()
    }
  }, [currentSection, formData, isLastSection, completeCurrentPhase, nextSection, filingId, markFilingInProgress, flushSave, state.currentPersonalFilingId, state.phase, state.totalDependents, state.currentDependentIndex, isBusinessFiling, isCorporateFiling])

  // Handle previous button - flush save before navigating back
  const handlePrev = useCallback(async () => {
    // Flush save immediately before navigation to ensure data is persisted
    await flushSave()
    prevSection()
  }, [flushSave, prevSection])

  // Handle add spouse
  const handleAddSpouse = useCallback(async () => {
    await addSpouse()
  }, [addSpouse])

  // Handle add multiple dependents based on count
  const handleAddDependents = useCallback(async () => {
    if (dependentCount <= 0) return

    setIsCreatingDependents(true)
    try {
      // Create all dependents first, collecting their IDs
      const newDependentIds: string[] = []
      for (let i = 0; i < dependentCount; i++) {
        const dependent = await addDependent()
        if (dependent) {
          newDependentIds.push(dependent.id)
        }
      }

      // Track created dependent IDs locally for reliable checkpoint logic
      setCreatedDependentIds(newDependentIds)

      // Start the FIRST dependent
      if (newDependentIds.length > 0) {
        startDependent(newDependentIds[0], 0)
      }
    } catch (err) {
      console.error("Failed to create dependents:", err)
    } finally {
      setIsCreatingDependents(false)
    }
  }, [addDependent, startDependent, dependentCount])

  // Handle edit from review screen - navigate to specific person's section
  const handleEditPerson = useCallback((personalFilingId: string, sectionIndex: number) => {
    // Find the person type
    const personFiling = filing?.personalFilings.find(pf => pf.id === personalFilingId)
    if (!personFiling) return

    // Determine which phase to go to based on person type
    if (personFiling.type === "primary") {
      dispatch({
        type: "INIT_FILING",
        payload: { filingId: filingId, personalFilingId }
      })
    } else if (personFiling.type === "spouse") {
      dispatch({
        type: "START_SPOUSE",
        payload: { personalFilingId }
      })
    } else if (personFiling.type === "dependent") {
      // Find the dependent index
      const dependents = filing?.personalFilings.filter(pf => pf.type === "dependent") || []
      const depIndex = dependents.findIndex(d => d.id === personalFilingId)
      dispatch({
        type: "START_DEPENDENT",
        payload: { personalFilingId, index: depIndex >= 0 ? depIndex : 0 }
      })
    }

    // Go to the specific section
    dispatch({ type: "GO_TO_SECTION", payload: sectionIndex })
  }, [filing, filingId, dispatch])

  // Render loading state
  if (isLoading && !filing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-card rounded-xl p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your filing...</p>
        </div>
      </div>
    )
  }

  // Render based on current phase
  const renderContent = () => {
    switch (state.phase) {
      case "SPOUSE_CHECKPOINT":
        // If auto-skipping (not married/common_law), show loading briefly while useEffect handles the skip
        if (shouldAutoSkipSpouse) {
          return (
            <div className="glass-card rounded-xl p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Continuing to dependents...</p>
            </div>
          )
        }

        return (
          <IntermissionCard
            icon={Heart}
            title="Filing with a Spouse?"
            description="Would you like to include your spouse in this tax return? Joint filing may provide tax benefits for your household."
            primaryAction={{
              label: "Yes, Add Spouse",
              onClick: handleAddSpouse,
              isLoading: isLoading,
            }}
            secondaryAction={{
              label: "No, Continue Solo",
              onClick: skipSpouse,
            }}
          />
        )

      case "DEPENDENT_CHECKPOINT": {
        // Use LOCAL STATE for reliable dependent tracking (don't depend on SWR cache)
        // createdDependentIds: ordered list of dependent IDs we created
        // completedPersonalFilingIds: set of IDs we've marked as completed

        // Calculate which dependents are incomplete using local state
        const incompleteDependentIds = createdDependentIds.filter(id => !completedPersonalFilingIds.has(id))
        const completedCount = createdDependentIds.length - incompleteDependentIds.length
        const nextIncompleteDependentId = incompleteDependentIds[0]

        console.log('[DEPENDENT_CHECKPOINT] Debug (using local state):', {
          createdDependentIds,
          completedPersonalFilingIds: Array.from(completedPersonalFilingIds),
          incompleteDependentIds,
          completedCount,
          nextIncompleteDependentId,
          totalDependents: state.totalDependents,
          currentDependentIndex: state.currentDependentIndex,
        })

        // If we have incomplete dependents, show "Continue with next dependent"
        if (incompleteDependentIds.length > 0 && nextIncompleteDependentId) {
          const remainingCount = incompleteDependentIds.length

          return (
            <IntermissionCard
              icon={Users}
              title={`Continue with Dependent ${completedCount + 1}`}
              description={`You have ${remainingCount} more dependent${remainingCount > 1 ? 's' : ''} to complete.`}
              primaryAction={{
                label: `Fill Dependent ${completedCount + 1}`,
                onClick: () => startDependent(nextIncompleteDependentId, completedCount),
                isLoading: isLoading,
              }}
            />
          )
        }

        // If all dependents are done (we've filled them all), go to review
        if (createdDependentIds.length > 0 && incompleteDependentIds.length === 0) {
          return (
            <IntermissionCard
              icon={Users}
              title="All Dependents Completed!"
              description="You've completed information for all your dependents. Ready to review your filing?"
              primaryAction={{
                label: "Continue to Review",
                onClick: goToReview,
                isLoading: isLoading,
              }}
            />
          )
        }

        return (
          <div className="glass-card mx-auto max-w-xl rounded-2xl p-8">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Users className="h-8 w-8 text-primary" />
            </div>

            {/* Title & Description */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">Add Dependents</h2>
              <p className="mt-2 text-muted-foreground">
                Do you have any dependents to claim on your tax return? You can add children or other qualifying relatives.
              </p>
            </div>

            {/* Dependent Count Input */}
            <div className="mt-6">
              <Label htmlFor="dependentCount" className="text-sm font-medium">
                How many dependents do you want to add?
              </Label>
              <div className="mt-2 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDependentCount(Math.max(1, dependentCount - 1))}
                  disabled={dependentCount <= 1 || isCreatingDependents}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="dependentCount"
                  type="number"
                  min={1}
                  max={10}
                  value={dependentCount}
                  onChange={(e) => setDependentCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                  disabled={isCreatingDependents}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDependentCount(Math.min(10, dependentCount + 1))}
                  disabled={dependentCount >= 10 || isCreatingDependents}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={handleAddDependents}
                disabled={isCreatingDependents || isLoading}
                className="min-w-[180px]"
                size="lg"
              >
                {isCreatingDependents ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isCreatingDependents ? "Adding..." : `Add ${dependentCount} Dependent${dependentCount > 1 ? "s" : ""}`}
              </Button>
              <Button
                variant="ghost"
                onClick={goToReview}
                className="min-w-[180px]"
                size="lg"
                disabled={isCreatingDependents}
              >
                Skip & Review
              </Button>
            </div>
          </div>
        )
      }

      case "REVIEW":
        // Use different review screens for different filing types
        if (isBusinessFiling && filing) {
          return <CorporateReviewScreen filing={filing} schema={activeSchema!} formData={formData} />
        }
        return filing ? <ReviewScreen filing={filing} onEditPerson={handleEditPerson} /> : null

      case "CORPORATE_ACTIVE":
      case "TRUST_ACTIVE":
        // Corporate and Trust filings use the same QuestionRenderer but with their schema
        if (!currentSection) {
          return (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No questions available for this section.</p>
            </div>
          )
        }
        return (
          <QuestionRenderer
            section={currentSection}
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            onNext={handleNext}
            onPrev={handlePrev}
            isFirstSection={state.currentSectionIndex === 0}
            isLastSection={isLastSection}
            isSyncing={isSyncing}
            role="primary"
          />
        )

      case "PRIMARY_ACTIVE":
      case "SPOUSE_ACTIVE":
      case "DEPENDENT_ACTIVE":
        if (!currentSection) {
          return (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No questions available for this section.</p>
            </div>
          )
        }
        return (
          <QuestionRenderer
            section={currentSection}
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            onNext={handleNext}
            onPrev={handlePrev}
            isFirstSection={state.currentSectionIndex === 0}
            isLastSection={isLastSection}
            isSyncing={isSyncing}
            role={currentRole}
            dependentIndex={currentRole === "dependent" ? state.currentDependentIndex : undefined}
          />
        )

      case "IDLE":
        // Show loading state while initializing or creating primary filing
        return (
          <div className="glass-card rounded-xl p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              {isCreatingPrimaryRef.current ? "Setting up your tax filing..." : "Initializing wizard..."}
            </p>
          </div>
        )

      default:
        return (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Unknown phase: {state.phase}</p>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar / Drawer */}
      <WizardSidebar
        currentPhase={state.phase}
        sections={sections}
        currentSectionIndex={state.currentSectionIndex}
        filing={filing}
        formData={formData}
        onSectionClick={(index) => dispatch({ type: "GO_TO_SECTION", payload: index })}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:ml-72">
        <div className="mx-auto max-w-3xl">
          {/* Progress Bar */}
          <WizardProgress
            step={phaseInfo.step}
            totalSteps={phaseInfo.total}
            label={phaseInfo.label}
            isSyncing={isSyncing}
          />

          {/* Content Area */}
          <div className="mt-8">{renderContent()}</div>
        </div>
      </main>
    </div>
  )
}
