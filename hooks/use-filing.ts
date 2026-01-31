// tax-client-portal/hooks/use-filing.ts

"use client"

import { useReducer, useCallback, useRef } from "react"
import useSWR, { mutate } from "swr"
import { FilingService } from "@/services/filing-service"
import { CorporateFilingService } from "@/services/corporate-filing-service"
import { TrustFilingService } from "@/services/trust-filing-service"
import { filingReducer, initialWizardState } from "@/lib/domain/filing-state-machine"
import type { Filing, FilingType } from "@/lib/domain/types"
import { toast } from "@/hooks/use-toast"

const fetchFiling = async (key: string) => {
  const docId = key.split("/")[1]
  if (!docId || docId === 'undefined' || docId === 'null') return null
  return FilingService.getFiling(docId)
}

export function useFiling(filingId?: string, initialData?: Filing) {
  const [state, dispatch] = useReducer(filingReducer, initialWizardState)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formDataRef = useRef<Record<string, unknown>>({})

  // Refs to prevent duplicate creation calls (persists across re-renders)
  const isCreatingPrimaryRef = useRef(false)
  const isAddingSpouseRef = useRef(false)
  const isAddingDependentRef = useRef(false)

  // SWR for data fetching and synchronization
  const { data: filing, isLoading } = useSWR<Filing | null>(
    filingId ? `filing/${filingId}` : null,
    fetchFiling,
    { fallbackData: initialData, revalidateOnFocus: false }
  )

  // Initialize a new filing record in Strapi
  const initFiling = useCallback(async (year: number, type: FilingType = "INDIVIDUAL") => {
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const { filing, primaryFiling } = await FilingService.initFiling(year, type)
      dispatch({
        type: "INIT_FILING",
        payload: {
          filingId: filing.id,
          personalFilingId: primaryFiling.id,
        },
      })
      return { filing, primaryFiling }
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Failed to create filing",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  // Action: Add Spouse (with mutex guard)
  // NOTE: We no longer mark primary as COMPLETED here - all filings stay DRAFT until submission
  const addSpouse = useCallback(async () => {
    if (!state.filingId || isAddingSpouseRef.current) return null
    isAddingSpouseRef.current = true
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const spouseFiling = await FilingService.addFamilyMember(state.filingId, "spouse")
      dispatch({ type: "START_SPOUSE", payload: { personalFilingId: spouseFiling.id } })
      await mutate(`filing/${state.filingId}`)
      return spouseFiling
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Error" })
    } finally {
      isAddingSpouseRef.current = false
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [state.filingId])

  // Action: Add Dependent (with mutex guard)
  // Returns the created dependent but does NOT automatically start it
  const addDependent = useCallback(async () => {
    if (!state.filingId || isAddingDependentRef.current) return null
    isAddingDependentRef.current = true
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const dependentFiling = await FilingService.addFamilyMember(state.filingId, "dependent")
      dispatch({ type: "ADD_DEPENDENT" })
      await mutate(`filing/${state.filingId}`)
      return dependentFiling
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Error" })
      return null
    } finally {
      isAddingDependentRef.current = false
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [state.filingId])

  // Action: Start a specific dependent by index
  const startDependent = useCallback((personalFilingId: string, index: number) => {
    dispatch({
      type: "START_DEPENDENT",
      payload: { personalFilingId, index },
    })
  }, [])

  // Action: Create Primary Personal Filing (if none exists) - with mutex guard
  const createPrimaryFiling = useCallback(async (targetFilingId: string) => {
    // Prevent duplicate calls using ref guard
    if (isCreatingPrimaryRef.current) {
      return null
    }
    isCreatingPrimaryRef.current = true
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const primaryFiling = await FilingService.addFamilyMember(targetFilingId, "primary")
      dispatch({
        type: "INIT_FILING",
        payload: {
          filingId: targetFilingId,
          personalFilingId: primaryFiling.id,
        },
      })
      await mutate(`filing/${targetFilingId}`)
      return primaryFiling
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Error creating personal filing" })
      throw err
    } finally {
      isCreatingPrimaryRef.current = false
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  // Track the current personal filing ID to reset formDataRef when it changes
  const currentPfIdRef = useRef<string | null>(null)

  // Track if we've already marked the filing as IN_PROGRESS
  const hasMarkedInProgressRef = useRef(false)

  // Action: Mark filing as IN_PROGRESS (called on first "Next" click)
  const markFilingInProgress = useCallback(async (targetFilingId: string) => {
    // Only mark once per session
    if (hasMarkedInProgressRef.current) return

    try {
      hasMarkedInProgressRef.current = true
      await FilingService.markFilingInProgress(targetFilingId)
      await mutate(`filing/${targetFilingId}`)
    } catch (err) {
      console.error("Failed to mark filing as IN_PROGRESS:", err)
      // Reset flag on error to allow retry
      hasMarkedInProgressRef.current = false
    }
  }, [])

  // Debounced auto-save logic
  // Handles both personal filings and corporate/trust filings based on filing type
  // Note: This is a background operation - errors are logged but not shown to user
  // User-initiated saves (flushSave, saveAndExit) will show error toasts
  const saveFormData = useCallback(async (pfId: string, data: Record<string, unknown>) => {
    // Reset accumulated form data if we switched to a different personal filing
    if (currentPfIdRef.current !== pfId) {
      formDataRef.current = {}
      currentPfIdRef.current = pfId
    }

    formDataRef.current = { ...formDataRef.current, ...data }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      dispatch({ type: "SET_SYNCING", payload: true })
      try {
        // Check if this is a corporate or trust filing based on current phase
        const isCorporateFiling = state.phase === "CORPORATE_ACTIVE"
        const isTrustFiling = state.phase === "TRUST_ACTIVE"

        if (isCorporateFiling) {
          await CorporateFilingService.saveFormData(pfId, formDataRef.current)
        } else if (isTrustFiling) {
          await TrustFilingService.saveFormData(pfId, formDataRef.current)
        } else {
          await FilingService.saveStepData(pfId, formDataRef.current)
        }

        if (state.filingId) mutate(`filing/${state.filingId}`)
      } catch (err) {
        // Silently log auto-save errors - don't show toast for background operations
        // User will see errors when they explicitly try to save/submit
        const errorMessage = err instanceof Error ? err.message : "Failed to save data"
        console.error('[useFiling.saveFormData] Background auto-save error (not shown to user):', errorMessage)
      } finally {
        dispatch({ type: "SET_SYNCING", payload: false })
      }
    }, 1000)
  }, [state.filingId, state.phase])

  // Flush save immediately (cancel debounce and save now)
  // Used before navigation to ensure data is persisted
  const flushSave = useCallback(async () => {
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    // Only save if we have accumulated data and a valid personal filing ID
    if (currentPfIdRef.current && Object.keys(formDataRef.current).length > 0) {
      dispatch({ type: "SET_SYNCING", payload: true })
      try {
        // Check if this is a corporate or trust filing based on current phase
        const isCorporateFiling = state.phase === "CORPORATE_ACTIVE"
        const isTrustFiling = state.phase === "TRUST_ACTIVE"

        if (isCorporateFiling) {
          await CorporateFilingService.saveFormData(currentPfIdRef.current, formDataRef.current)
        } else if (isTrustFiling) {
          await TrustFilingService.saveFormData(currentPfIdRef.current, formDataRef.current)
        } else {
          await FilingService.saveStepData(currentPfIdRef.current, formDataRef.current)
        }

        if (state.filingId) mutate(`filing/${state.filingId}`)
      } catch (err) {
        // Show the exact error message to the user
        const errorMessage = err instanceof Error ? err.message : "Failed to save data"

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        console.error('[useFiling.flushSave] Error:', errorMessage)
        // Re-throw to let caller know save failed
        throw err
      } finally {
        dispatch({ type: "SET_SYNCING", payload: false })
      }
    }
  }, [state.filingId, state.phase])

  // Submit filing for review - returns the updated filing with reference number
  // Accepts optional calculatedTotalPrice to store the pricing at submission time
  // Accepts optional recaptchaToken for bot protection verification
  const submitForReview = useCallback(async (calculatedTotalPrice?: number, recaptchaToken?: string | null): Promise<Filing | null> => {
    if (!state.filingId) return null
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const updatedFiling = await FilingService.submitForReview(state.filingId, calculatedTotalPrice, recaptchaToken)
      await mutate(`filing/${state.filingId}`)
      return updatedFiling
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to submit for review" })
      return null
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [state.filingId])

  // Force refresh filing data from server
  const refreshFiling = useCallback(async () => {
    if (state.filingId) {
      await mutate(`filing/${state.filingId}`)
    }
  }, [state.filingId])

  // Save wizard progress for resume functionality
  // This is called on section changes and save & exit
  // Optional overrides can be passed to save expected values after navigation
  // (needed because React state updates are async and the callback may have stale values)
  const saveWizardProgress = useCallback(async (overrides?: {
    sectionIndex?: number;
    phase?: string;
    personalFilingId?: string;
    dependentIndex?: number;
  }) => {
    const filingId = state.filingId
    const personalFilingId = overrides?.personalFilingId ?? state.currentPersonalFilingId
    const phase = overrides?.phase ?? state.phase
    const sectionIndex = overrides?.sectionIndex ?? state.currentSectionIndex
    const dependentIndex = overrides?.dependentIndex ?? state.currentDependentIndex

    if (!filingId || !personalFilingId) {
      console.log('[saveWizardProgress] Skipping - missing IDs:', {
        filingId,
        personalFilingId
      })
      return
    }

    // Don't save progress for IDLE or REVIEW phases
    if (phase === "IDLE" || phase === "REVIEW") {
      console.log('[saveWizardProgress] Skipping - phase is:', phase)
      return
    }

    const progressData = {
      lastPhase: phase,
      lastSectionIndex: sectionIndex,
      lastPersonalFilingId: personalFilingId,
      lastDependentIndex: dependentIndex >= 0 ? dependentIndex : undefined,
    }
    console.log('[saveWizardProgress] Saving progress:', progressData)

    await FilingService.saveWizardProgress(filingId, progressData)
  }, [state.filingId, state.currentPersonalFilingId, state.phase, state.currentSectionIndex, state.currentDependentIndex])

  // Save & Exit: Flush form data and save progress, then return to dashboard
  const saveAndExit = useCallback(async () => {
    try {
      // 1. Flush any pending form data
      await flushSave()

      // 2. Save wizard progress
      await saveWizardProgress()

      return true
    } catch (err) {
      console.error('[saveAndExit] Error:', err)
      return false
    }
  }, [flushSave, saveWizardProgress])

  return {
    state,
    filing,
    isLoading: isLoading || state.isLoading,
    isSyncing: state.isSyncing,
    initFiling,
    addSpouse,
    addDependent,
    startDependent,
    createPrimaryFiling,
    markFilingInProgress,
    saveFormData,
    flushSave,
    submitForReview,
    refreshFiling,
    saveWizardProgress,
    saveAndExit,
    dispatch
  }
}