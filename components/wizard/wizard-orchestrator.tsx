"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useFilingContext } from "@/context/filing-context"
import { QuestionRegistry } from "@/lib/domain/question-registry"
import { getPhaseInfo } from "@/lib/domain/filing-state-machine"
import type { WizardPhase } from "@/lib/domain/types"
import { WizardSidebar } from "./wizard-sidebar"
import { WizardProgress } from "./wizard-progress"
import { QuestionRenderer } from "./question-renderer"
import { IntermissionCard } from "./intermission-card"
import { ReviewScreen } from "./review-screen"
import { CorporateReviewScreen } from "./corporate-review-screen"
import { TrustReviewScreen } from "./trust-review-screen"
import { Button } from "@/components/ui/button"
import { Loader2, Users, UserPlus, Heart, Save } from "lucide-react"

interface WizardOrchestratorProps {
  filingId: string
  initialPersonalFilingId: string // Also used for corporateFilingId for corporate filings
}

export function WizardOrchestrator({ filingId, initialPersonalFilingId }: WizardOrchestratorProps) {
  const router = useRouter()
  const { toast } = useToast()
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
    markFilingInProgress,
    refreshFiling,
    saveWizardProgress,
    saveAndExit,
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
  const [isCreatingDependents, setIsCreatingDependents] = useState(false)

  // Track completed personal filing IDs locally (don't depend on SWR cache)
  const [completedPersonalFilingIds, setCompletedPersonalFilingIds] = useState<Set<string>>(new Set())
  // Track created dependent IDs with their order
  const [createdDependentIds, setCreatedDependentIds] = useState<string[]>([])
  // Track if filing has been submitted (for progress bar to show step 5)
  const [isSubmitted, setIsSubmitted] = useState(false)


  // Use refs to prevent duplicate calls (persists across React Strict Mode double-renders)
  const isCreatingPrimaryRef = useRef(false)
  const hasInitializedRef = useRef(false)

  // Determine if this is a corporate or trust filing
  const isCorporateFiling = filing?.type === "CORPORATE"
  const isTrustFiling = filing?.type === "TRUST"
  const isBusinessFiling = isCorporateFiling || isTrustFiling

  // Initialize state when component mounts - with progress restoration support
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

    // Check if there's saved progress to restore
    const savedProgress = filing.wizardProgress
    console.log('[WizardOrchestrator] Checking for saved progress:', {
      savedProgress,
      filingStatus: filing.status,
      hasWizardProgress: !!savedProgress
    })

    // AMENDMENT FLOW: Check if this is a reopened filing (was submitted, now IN_PROGRESS again)
    // If the filing has a confirmationNumber, it was previously submitted.
    // If it's now back to IN_PROGRESS, admin has reopened it for amendments.
    // User should start from PRIMARY_ACTIVE section 0 to review/edit their filing.
    const wasSubmitted = !!(filing as any).confirmationNumber
    const isReopened = wasSubmitted && filing.status === "IN_PROGRESS"

    if (isReopened) {
      hasInitializedRef.current = true
      console.log('[WizardOrchestrator] Reopened filing detected, starting from PRIMARY_ACTIVE for amendments', { filingType: filing.type })

      // Get the appropriate child filing ID based on filing type
      let childFilingId: string
      let startPhase: WizardPhase

      if (isCorporateFiling) {
        childFilingId = (filing as any).corporateFiling?.id ||
                        (filing as any).corporateFiling?.documentId ||
                        initialPersonalFilingId
        startPhase = "CORPORATE_ACTIVE"
      } else if (isTrustFiling) {
        childFilingId = (filing as any).trustFiling?.id ||
                        (filing as any).trustFiling?.documentId ||
                        initialPersonalFilingId
        startPhase = "TRUST_ACTIVE"
      } else {
        // Personal filing - use primary personal filing, start from PRIMARY_ACTIVE
        childFilingId = filing.personalFilings?.find(pf => pf.type === "primary")?.id ||
                        initialPersonalFilingId
        startPhase = "PRIMARY_ACTIVE"
      }

      dispatch({
        type: "RESTORE_PROGRESS",
        payload: {
          filingId,
          phase: startPhase,
          sectionIndex: 0, // Start from first section
          personalFilingId: childFilingId,
          dependentIndex: 0,
        },
      })
      return
    }

    const hasValidProgress = savedProgress &&
      savedProgress.lastPhase &&
      savedProgress.lastPersonalFilingId &&
      // Only restore if filing is IN_PROGRESS (not completed or under review)
      (filing.status === "IN_PROGRESS" || filing.status === "DRAFT")

    if (hasValidProgress) {
      hasInitializedRef.current = true
      console.log('[WizardOrchestrator] Restoring saved progress:', savedProgress)
      dispatch({
        type: "RESTORE_PROGRESS",
        payload: {
          filingId,
          phase: savedProgress.lastPhase as WizardPhase,
          sectionIndex: savedProgress.lastSectionIndex,
          personalFilingId: savedProgress.lastPersonalFilingId,
          dependentIndex: savedProgress.lastDependentIndex,
        },
      })
      return
    } else {
      console.log('[WizardOrchestrator] No valid progress to restore, starting fresh')
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

      // REMOVED: The fallback to create a new primary filing has been removed.
      // If we reach this point without a personal filing, it means something went wrong
      // during filing creation. We should NOT auto-create here as it causes duplicate records
      // on page refresh. The filing page now resolves the personal filing ID from loaded data.
      if (!isLoading && filing.personalFilings?.length === 0) {
        console.error("No personal filing found for this filing. This should not happen - the filing may be corrupted.")
      }
    }
  }, [filingId, initialPersonalFilingId, state.phase, dispatch, filing, isLoading, isBusinessFiling, isCorporateFiling, isTrustFiling])

  // Track previous personal filing ID to detect switches
  const prevPersonalFilingIdRef = useRef<string | null>(null)
  // Track if we've done initial data load
  const hasLoadedInitialDataRef = useRef(false)

  // Load form data when switching personal filings OR on initial load
  // Also handles corporate and trust filings
  useEffect(() => {
    if (filing && state.currentPersonalFilingId) {
      // Detect if we switched to a different filing
      const didSwitchPerson = prevPersonalFilingIdRef.current !== state.currentPersonalFilingId

      // For corporate/trust filings, get formData from the appropriate child
      let savedData: Record<string, unknown> | undefined
      if (isCorporateFiling) {
        savedData = (filing as any).corporateFiling?.formData
      } else if (isTrustFiling) {
        savedData = (filing as any).trustFiling?.formData
      } else {
        // Personal filing - find from personalFilings array
        const currentFiling = filing.personalFilings.find((pf) => pf.id === state.currentPersonalFilingId)
        savedData = currentFiling?.formData
      }

      // Also load data on initial mount if we haven't loaded yet
      const isInitialLoad = !hasLoadedInitialDataRef.current

      if (didSwitchPerson || isInitialLoad) {
        // Always reset errors when switching person or on initial load
        setErrors({})

        // If formData is empty/undefined or has no meaningful keys, use empty object
        const hasData = savedData && Object.keys(savedData).length > 0
        setFormData(hasData ? savedData! : {})
        hasLoadedInitialDataRef.current = true

        prevPersonalFilingIdRef.current = state.currentPersonalFilingId
      }
    }
  }, [filing, state.currentPersonalFilingId, isCorporateFiling, isTrustFiling])

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

  // Check dependants list for DEPENDENT_CHECKPOINT logic
  // Get dependants list from formData (current session) or stored data (page reload)
  const dependantsFromForm = formData["dependants.list"] as Array<{ earnsIncome?: string; fullName?: string }> | undefined
  const dependantsFromStored = primaryFiling?.formData?.["dependants.list"] as Array<{ earnsIncome?: string; fullName?: string }> | undefined
  const dependantsList = dependantsFromForm || dependantsFromStored || []

  // Check if any dependant has earnsIncome = "YES" (for filtering which dependants need filings)
  const earningDependants = dependantsList.filter(dep => dep?.earnsIncome === "YES")
  const hasEarningDependant = earningDependants.length > 0

  // Show DEPENDENT_CHECKPOINT if there are any dependants added
  // But only create filings for earning dependants
  const hasDependants = dependantsList.length > 0

  // Auto-skip ONLY if no dependants were added at all
  const shouldAutoSkipDependents = !hasDependants

  // Auto-skip dependent checkpoint if no dependants were added
  useEffect(() => {
    if (state.phase === "DEPENDENT_CHECKPOINT" && shouldAutoSkipDependents) {
      skipDependents()
    }
  }, [state.phase, shouldAutoSkipDependents, skipDependents])

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
  // Get phase info, but override to show step 5 (Complete) when submitted
  const basePhaseInfo = getPhaseInfo(state.phase, filing?.type)
  const phaseInfo = isSubmitted
    ? { ...basePhaseInfo, step: basePhaseInfo.total, label: "Complete" }
    : basePhaseInfo


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
    // Validate current section (pass all schema questions for cross-section parent lookups)
    const { isValid, errors: newErrors } = QuestionRegistry.validateSection(currentSection, formData, schema?.questions)

    if (!isValid) {
      setErrors(newErrors)
      // Simple toast - details shown inline under each field
      const errorCount = Object.keys(newErrors).length
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: `Please complete ${errorCount} required ${errorCount === 1 ? 'field' : 'fields'} above.`,
      })
      return // STOP
    }

    // CRITICAL: When completing a phase (last section), validate ALL sections for this person
    // This prevents users from jumping to last section and bypassing required fields
    if (isLastSection && activeSchema) {
      const fullValidation = QuestionRegistry.validateAllSectionsForRole(activeSchema, currentRole, formData)

      if (!fullValidation.isValid) {
        // Find the first section with errors and navigate to it
        const firstErrorSection = fullValidation.missingSections[0]
        if (firstErrorSection) {
          // Find the index of this section
          const sectionIndex = sections.findIndex(s => s.id === firstErrorSection.sectionId)
          if (sectionIndex >= 0 && sectionIndex !== state.currentSectionIndex) {
            // Navigate to the section with errors
            dispatch({ type: "GO_TO_SECTION", payload: sectionIndex })
          }
        }

        // Set errors for display
        setErrors(fullValidation.errors)

        // Build detailed error message
        const sectionList = fullValidation.missingSections
          .slice(0, 3) // Show max 3 sections
          .map(s => s.sectionTitle)
          .join(", ")
        const moreCount = fullValidation.missingSections.length > 3
          ? ` and ${fullValidation.missingSections.length - 3} more`
          : ""

        toast({
          variant: "destructive",
          title: "Cannot complete - missing required information",
          description: `Please fill in all required fields in: ${sectionList}${moreCount}. (${fullValidation.totalMissingFields} fields total)`,
        })

        // Scroll to top to show the section with errors
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return // STOP - don't complete phase
      }
    }

    setErrors({}) // Clear errors if valid

    // Flush save immediately before navigation to ensure data is persisted
    try {
      await flushSave()
    } catch (err) {
      // flushSave already shows a toast for the error
      // Stop navigation if save failed to prevent data loss
      return
    }

    // Mark filing as IN_PROGRESS on first successful "Next" click
    if (filingId) {
      markFilingInProgress(filingId)
    }

    if (isLastSection) {
      // NOTE: We no longer mark child filings as COMPLETED here.
      // All child filings (personal-filing, corporate-filing, trust-filing) stay as DRAFT
      // until the user submits the entire filing. The submitForReview method in each
      // service will mark them as COMPLETED at submission time.

      // Track completed sections locally for UI progress display only
      if (state.currentPersonalFilingId) {
        setCompletedPersonalFilingIds(prev => new Set([...prev, state.currentPersonalFilingId!]))
      }

      console.log('[handleNext] Completing phase. Current state:', {
        phase: state.phase,
        totalDependents: state.totalDependents,
        currentDependentIndex: state.currentDependentIndex,
        currentPersonalFilingId: state.currentPersonalFilingId,
        isBusinessFiling
      })

      completeCurrentPhase()
      // Scroll to top when completing phase
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Don't save progress when completing phase - next phase will have different state
    } else {
      // Calculate the new section index BEFORE dispatching
      const newSectionIndex = state.currentSectionIndex + 1
      nextSection()

      // Scroll to top when navigating to next section
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Save progress with the NEW section index (since React state update is async)
      // This ensures we save the correct position for resume
      saveWizardProgress({ sectionIndex: newSectionIndex })
    }
  }, [currentSection, formData, isLastSection, completeCurrentPhase, nextSection, filingId, markFilingInProgress, flushSave, state.currentPersonalFilingId, state.phase, state.totalDependents, state.currentDependentIndex, state.currentSectionIndex, isBusinessFiling, toast, saveWizardProgress, schema, activeSchema, currentRole, sections, dispatch])

  // Handle previous button - flush save before navigating back
  const handlePrev = useCallback(async () => {
    // Flush save immediately before navigation to ensure data is persisted
    try {
      await flushSave()
    } catch (err) {
      // flushSave already shows a toast for the error
      // Stop navigation if save failed to prevent data loss
      return
    }

    // Calculate the new section index BEFORE dispatching
    const newSectionIndex = Math.max(0, state.currentSectionIndex - 1)
    prevSection()

    // Scroll to top when navigating to previous section
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Save progress with the NEW section index (since React state update is async)
    saveWizardProgress({ sectionIndex: newSectionIndex })
  }, [flushSave, prevSection, saveWizardProgress, state.currentSectionIndex])

  // Handle Save & Exit - save progress and navigate to dashboard
  const handleSaveAndExit = useCallback(async () => {
    const success = await saveAndExit()
    if (success) {
      toast({
        title: "Progress saved",
        description: "Your progress has been saved. You can continue later.",
      })
      router.push("/dashboard")
    } else {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: "There was an error saving your progress. Please try again.",
      })
    }
  }, [saveAndExit, toast, router])

  // Handle add spouse
  const handleAddSpouse = useCallback(async () => {
    await addSpouse()
  }, [addSpouse])

  // Handle add dependents - creates filings for earning dependants only
  const handleAddDependents = useCallback(async () => {
    // Get the count of earning dependants from the dependants list
    const earningCount = earningDependants.length
    if (earningCount <= 0) return

    setIsCreatingDependents(true)
    try {
      // Create all dependents first, collecting their IDs
      const newDependentIds: string[] = []
      for (let i = 0; i < earningCount; i++) {
        const dependent = await addDependent()
        if (dependent) {
          newDependentIds.push(dependent.id)
        }
      }

      // Track created dependent IDs locally for reliable checkpoint logic
      setCreatedDependentIds(prev => [...prev, ...newDependentIds])

      // Start the FIRST dependent (or next one if adding more)
      if (newDependentIds.length > 0) {
        // Get total count of existing + new dependents for proper indexing
        const existingDependents = filing?.personalFilings?.filter(pf => pf.type === "dependent") || []
        const startIndex = existingDependents.length
        startDependent(newDependentIds[0], startIndex)
      }
    } catch (err) {
      console.error("Failed to create dependents:", err)
    } finally {
      setIsCreatingDependents(false)
    }
  }, [addDependent, startDependent, earningDependants.length, filing])

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

  // Handle add spouse from review screen
  const handleAddSpouseFromReview = useCallback(async () => {
    await handleAddSpouse()
  }, [handleAddSpouse])

  // Handle add dependent from review screen - go to DEPENDENT_CHECKPOINT
  const handleAddDependentFromReview = useCallback(() => {
    dispatch({ type: "GO_TO_DEPENDENT_CHECKPOINT" })
  }, [dispatch])

  // Handle phase navigation from sidebar (jumping between Primary/Spouse/Dependent)
  const handlePhaseNavigation = useCallback(async (phaseId: string) => {
    // Flush any unsaved data before switching phases
    try {
      await flushSave()
    } catch (err) {
      // Continue even if save fails - user explicitly wants to navigate
    }

    // Find the appropriate filing for this phase
    switch (phaseId) {
      case "PRIMARY": {
        const primaryFiling = filing?.personalFilings?.find(pf => pf.type === "primary")
        if (primaryFiling) {
          dispatch({
            type: "INIT_FILING",
            payload: { filingId, personalFilingId: primaryFiling.id }
          })
          dispatch({ type: "GO_TO_SECTION", payload: 0 })
        }
        break
      }
      case "SPOUSE": {
        const spouseFiling = filing?.personalFilings?.find(pf => pf.type === "spouse")
        if (spouseFiling) {
          dispatch({
            type: "START_SPOUSE",
            payload: { personalFilingId: spouseFiling.id }
          })
          dispatch({ type: "GO_TO_SECTION", payload: 0 })
        }
        break
      }
      case "DEPENDENT": {
        const dependentFilings = filing?.personalFilings?.filter(pf => pf.type === "dependent") || []
        if (dependentFilings.length > 0) {
          dispatch({
            type: "START_DEPENDENT",
            payload: { personalFilingId: dependentFilings[0].id, index: 0 }
          })
          dispatch({ type: "GO_TO_SECTION", payload: 0 })
        }
        break
      }
      case "REVIEW":
        goToReview()
        break
      case "CORPORATE": {
        const corporateFilingId = (filing as any)?.corporateFiling?.id ||
                                  (filing as any)?.corporateFiling?.documentId
        if (corporateFilingId) {
          dispatch({
            type: "INIT_CORPORATE_FILING",
            payload: { filingId, corporateFilingId }
          })
          dispatch({ type: "GO_TO_SECTION", payload: 0 })
        }
        break
      }
      case "TRUST": {
        const trustFilingId = (filing as any)?.trustFiling?.id ||
                              (filing as any)?.trustFiling?.documentId
        if (trustFilingId) {
          dispatch({
            type: "INIT_TRUST_FILING",
            payload: { filingId, trustFilingId }
          })
          dispatch({ type: "GO_TO_SECTION", payload: 0 })
        }
        break
      }
    }

    // Scroll to top when switching phases
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filing, filingId, dispatch, flushSave, goToReview])

  // Render loading state
  if (isLoading && !filing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#07477a]" />
          <p className="mt-4 text-gray-500">Loading your filing...</p>
        </div>
      </div>
    )
  }

  // Render based on current phase
  const renderContent = () => {
    switch (state.phase) {
      case "SPOUSE_CHECKPOINT": {
        // Check if spouse already exists in the filing (for returning users)
        const existingSpouse = filing?.personalFilings?.find(pf => pf.type === "spouse")

        // If spouse already exists, show option to continue with spouse (no skip option to avoid orphan records)
        if (existingSpouse) {
          return (
            <IntermissionCard
              icon={Heart}
              title="Continue with Spouse"
              description="You've already started adding your spouse's information. Let's continue where you left off."
              primaryAction={{
                label: "Continue Spouse Info",
                onClick: () => dispatch({ type: "START_SPOUSE", payload: { personalFilingId: existingSpouse.id } }),
                isLoading: isLoading,
              }}
            />
          )
        }

        // If auto-skipping (not married/common_law), show loading briefly while useEffect handles the skip
        if (shouldAutoSkipSpouse) {
          return (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#07477a]" />
              <p className="mt-4 text-gray-500">Continuing to dependents...</p>
            </div>
          )
        }

        return (
          <IntermissionCard
            icon={Heart}
            title="Filing with a Spouse?"
            description="Would you like to include your spouse in this tax filing? Joint filing may provide tax benefits for your household."
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
      }

      case "DEPENDENT_CHECKPOINT": {
        // If auto-skipping (no dependants added at all), show loading briefly while useEffect handles the skip
        if (shouldAutoSkipDependents) {
          return (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#07477a]" />
              <p className="mt-4 text-gray-500">Continuing to review...</p>
            </div>
          )
        }

        // IMPORTANT: Check for EXISTING dependent filings FIRST (for returning/reopened users)
        // This must happen BEFORE the "no earning dependants" check, because reopened filings
        // may have existing dependent filings that need to be edited, regardless of current
        // earnsIncome values in the dependants list.
        // Check for EXISTING dependents from filing data (for returning users)
        // This is crucial because local state (createdDependentIds) will be empty after page reload
        const existingDependents = filing?.personalFilings?.filter(pf => pf.type === "dependent") || []

        // Merge existing dependents with locally created ones (avoid duplicates)
        const existingDependentIds = existingDependents.map(d => d.id)
        const allDependentIds = [...new Set([...existingDependentIds, ...createdDependentIds])]

        // Get saved wizard progress to check if user was mid-way through a dependent
        const savedProgress = filing?.wizardProgress

        // Calculate which dependents are incomplete
        // A dependent is incomplete if:
        // 1. The saved progress shows user was actively filling this dependent (DEPENDENT_ACTIVE)
        // 2. OR the dependent has no data at all
        // 3. OR the dependent is explicitly marked incomplete
        const incompleteDependentIds = allDependentIds.filter(id => {
          // If we marked it complete locally (in current session), it's done
          if (completedPersonalFilingIds.has(id)) return false

          // Check if saved progress indicates user was mid-way through THIS dependent
          // This is the key fix - if progress says DEPENDENT_ACTIVE for this ID, it's incomplete
          if (savedProgress?.lastPhase === "DEPENDENT_ACTIVE" && savedProgress?.lastPersonalFilingId === id) {
            return true // Definitely incomplete - user was in the middle of filling this
          }

          // For existing dependents from DB, check completion status
          const existingDep = existingDependents.find(d => d.id === id)
          if (existingDep) {
            // If explicitly marked complete in DB, it's done
            if (existingDep.isComplete) return false

            // If no data at all, it's incomplete
            const hasData = existingDep.formData && Object.keys(existingDep.formData).length > 0
            if (!hasData) return true

            // Has some data but not marked complete - assume complete unless progress says otherwise
            // (progress check above already handles the "was filling this dependent" case)
            return false
          }

          return true // No record found - incomplete
        })

        const completedCount = allDependentIds.length - incompleteDependentIds.length
        const nextIncompleteDependentId = incompleteDependentIds[0]

        console.log('[DEPENDENT_CHECKPOINT] Debug:', {
          existingDependentIds,
          createdDependentIds,
          allDependentIds,
          completedPersonalFilingIds: Array.from(completedPersonalFilingIds),
          incompleteDependentIds,
          completedCount,
          nextIncompleteDependentId,
          totalDependents: state.totalDependents,
          currentDependentIndex: state.currentDependentIndex,
          savedProgress: savedProgress,
          earningDependants: earningDependants.length,
        })

        // RETURNING USER: Has existing dependents from previous session
        if (existingDependents.length > 0 && createdDependentIds.length === 0) {
          // Check if user has edited ANY existing dependent in this session
          const hasEditedAnyExistingDependent = existingDependentIds.some(id => completedPersonalFilingIds.has(id))

          // If we have incomplete dependents AND user hasn't started editing yet, offer to edit
          if (incompleteDependentIds.length > 0 && nextIncompleteDependentId) {
            // Show brief loading while we auto-navigate
            // Use setTimeout to trigger the navigation after render
            setTimeout(() => {
              startDependent(nextIncompleteDependentId, completedCount)
            }, 0)
            return (
              <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#07477a]" />
                <p className="mt-4 text-gray-500">Continuing with your dependents...</p>
              </div>
            )
          }

          // If user has already edited dependents this session, they're done - go to review
          if (hasEditedAnyExistingDependent) {
            return (
              <IntermissionCard
                icon={Users}
                title="Dependent Information Updated!"
                description="You've reviewed your dependent information. Ready to continue to the final review?"
                primaryAction={{
                  label: "Continue to Review",
                  onClick: goToReview,
                  isLoading: isLoading,
                }}
                secondaryAction={{
                  label: "Edit Another Dependent",
                  onClick: () => startDependent(existingDependentIds[0], 0),
                }}
              />
            )
          }

          // First time at checkpoint with existing dependents - offer to edit or skip
          const firstDependentId = existingDependentIds[0]
          return (
            <IntermissionCard
              icon={Users}
              title="Review Dependent Information"
              description={`You have ${existingDependents.length} dependent${existingDependents.length > 1 ? 's' : ''} on file. Would you like to review or update their information?`}
              primaryAction={{
                label: "Edit Dependent Details",
                onClick: () => startDependent(firstDependentId, 0),
                isLoading: isLoading,
              }}
              secondaryAction={{
                label: "Skip to Review",
                onClick: goToReview,
              }}
            />
          )
        }

        // CURRENT SESSION: Using locally tracked dependents
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

        // NO EXISTING DEPENDENT FILINGS: Check if we need to create any
        // If dependants exist but NONE earn income, show info and continue to review
        // (No separate tax filing needed for non-earning dependants)
        if (hasDependants && !hasEarningDependant) {
          return (
            <IntermissionCard
              icon={Users}
              title="Dependants Recorded"
              description={`You've added ${dependantsList.length} dependant${dependantsList.length > 1 ? 's' : ''}. Since none of them earn income, no separate tax filing is needed for them. Your dependant information has been saved for tax credits and deductions.`}
              primaryAction={{
                label: "Continue to Review",
                onClick: goToReview,
                isLoading: isLoading,
              }}
            />
          )
        }

        // FRESH START with EARNING dependants: Show option to add filings for earning dependants
        const earningDependantNames = earningDependants.map(d => d.fullName || 'Unnamed').join(', ')
        return (
          <div className="mx-auto max-w-xl rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#07477a]/10">
              <Users className="h-8 w-8 text-[#07477a]" />
            </div>

            {/* Title & Description */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">File for Earning Dependants</h2>
              <p className="mt-2 text-gray-500">
                You indicated that {earningDependants.length === 1 ? 'your dependant' : `${earningDependants.length} of your dependants`} ({earningDependantNames}) {earningDependants.length === 1 ? 'earns' : 'earn'} income. Would you like to include their tax filing as part of this submission?
              </p>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={handleAddDependents}
                disabled={isCreatingDependents || isLoading}
                className="min-w-[180px] bg-[#07477a] hover:bg-[#053560] text-white"
                size="lg"
              >
                {isCreatingDependents ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isCreatingDependents ? "Adding..." : `Yes, Add ${earningDependants.length} Filing${earningDependants.length > 1 ? 's' : ''}`}
              </Button>
              <Button
                variant="ghost"
                onClick={goToReview}
                className="min-w-[180px] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                size="lg"
                disabled={isCreatingDependents}
              >
                No, Skip to Review
              </Button>
            </div>
          </div>
        )
      }

      case "REVIEW":
        // Use different review screens for different filing types
        if (isCorporateFiling && filing) {
          return <CorporateReviewScreen filing={filing} schema={activeSchema!} formData={formData} onSubmitted={() => setIsSubmitted(true)} />
        }
        if (isTrustFiling && filing) {
          return <TrustReviewScreen filing={filing} schema={activeSchema!} formData={formData} onSubmitted={() => setIsSubmitted(true)} />
        }
        return filing ? (
          <ReviewScreen
            filing={filing}
            onEditPerson={handleEditPerson}
            onSubmitted={() => setIsSubmitted(true)}
            onAddSpouse={handleAddSpouseFromReview}
            onAddDependent={handleAddDependentFromReview}
          />
        ) : null

      case "CORPORATE_ACTIVE":
      case "TRUST_ACTIVE":
        // Corporate and Trust filings use the same QuestionRenderer but with their schema
        if (!currentSection) {
          return (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
              <p className="text-gray-500">No questions available for this section.</p>
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
            filingId={filingId}
          />
        )

      case "PRIMARY_ACTIVE":
      case "SPOUSE_ACTIVE":
      case "DEPENDENT_ACTIVE":
        if (!currentSection) {
          return (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
              <p className="text-gray-500">No questions available for this section.</p>
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
            filingId={filingId}
            personalFilingId={state.currentPersonalFilingId}
          />
        )

      case "IDLE":
        // Show loading state while initializing or creating primary filing
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#07477a]" />
            <p className="mt-4 text-gray-500">
              {isCreatingPrimaryRef.current ? "Setting up your tax filing..." : "Initializing wizard..."}
            </p>
          </div>
        )

      default:
        return (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-gray-500">Unknown phase: {state.phase}</p>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Clean White Background - matching dashboard theme */}
      <div className="fixed inset-0 bg-[#f8fbff]" />

      {/* Sidebar / Drawer */}
      <WizardSidebar
        currentPhase={state.phase}
        sections={sections}
        currentSectionIndex={state.currentSectionIndex}
        filing={filing}
        formData={formData}
        onSectionClick={(index) => dispatch({ type: "GO_TO_SECTION", payload: index })}
        onPhaseClick={handlePhaseNavigation}
      />

      {/* Main Content */}
      <main className="relative flex-1 p-4 md:p-8 lg:ml-72">
        <div className="mx-auto max-w-3xl">
          {/* Header with Save & Exit */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1" />
            {/* Only show Save & Exit when actively filling (not on checkpoints or review) */}
            {state.phase !== "IDLE" &&
             state.phase !== "REVIEW" &&
             !state.phase.includes("CHECKPOINT") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveAndExit}
                disabled={isSyncing}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save & Exit
              </Button>
            )}
          </div>

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
