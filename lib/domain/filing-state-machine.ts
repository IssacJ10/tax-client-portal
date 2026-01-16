// tax-client-portal/lib/domain/filing-state-machine.ts

import type { WizardState, WizardPhase } from "./types"

export const initialWizardState: WizardState = {
  status: "idle",
  error: null,
  isLoading: false,
  isSyncing: false,

  filingId: null,
  currentPersonalFilingId: null,

  phase: "IDLE",
  currentStep: "getting_started",
  currentSectionIndex: 0,
  completedSteps: [],
  totalDependents: 0,
  currentDependentIndex: -1,
}

export type FilingAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SYNCING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "INIT_FILING"; payload: { filingId: string; personalFilingId: string } }
  | { type: "INIT_CORPORATE_FILING"; payload: { filingId: string; corporateFilingId: string } }
  | { type: "INIT_TRUST_FILING"; payload: { filingId: string; trustFilingId: string } }
  | { type: "START_SPOUSE"; payload: { personalFilingId: string } }
  | { type: "START_DEPENDENT"; payload: { personalFilingId: string; index: number } }
  | { type: "NEXT_SECTION"; payload?: { totalSections: number } }
  | { type: "PREV_SECTION" }
  | { type: "GO_TO_SECTION"; payload: number }
  | { type: "COMPLETE_PHASE" }
  | { type: "COMPLETE_PRIMARY" }
  | { type: "COMPLETE_SPOUSE" }
  | { type: "COMPLETE_DEPENDENT" }
  | { type: "COMPLETE_CORPORATE" }
  | { type: "COMPLETE_TRUST" }
  | { type: "SKIP_SPOUSE" }
  | { type: "SKIP_DEPENDENTS" }
  | { type: "ADD_DEPENDENT" }
  | { type: "GO_TO_REVIEW" }
  | { type: "RESET" }

/**
 * Handles phase completion and transitions to the next appropriate phase
 */
function handlePhaseComplete(state: WizardState): WizardState {
  switch (state.phase) {
    case "PRIMARY_ACTIVE":
      return { ...state, phase: "SPOUSE_CHECKPOINT", currentSectionIndex: 0 }
    case "SPOUSE_ACTIVE":
      return { ...state, phase: "DEPENDENT_CHECKPOINT", currentSectionIndex: 0 }
    case "DEPENDENT_ACTIVE":
      return { ...state, phase: "DEPENDENT_CHECKPOINT", currentSectionIndex: 0 }
    // Corporate and Trust filings go directly to REVIEW (no spouse/dependent checkpoints)
    case "CORPORATE_ACTIVE":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }
    case "TRUST_ACTIVE":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }
    default:
      return state
  }
}

export function filingReducer(state: WizardState, action: FilingAction): WizardState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_SYNCING":
      return { ...state, isSyncing: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }

    case "INIT_FILING":
      return {
        ...state,
        status: "success",
        filingId: action.payload.filingId,
        currentPersonalFilingId: action.payload.personalFilingId,
        phase: "PRIMARY_ACTIVE",
        currentSectionIndex: 0,
        error: null,
      }

    case "INIT_CORPORATE_FILING":
      return {
        ...state,
        status: "success",
        filingId: action.payload.filingId,
        currentPersonalFilingId: action.payload.corporateFilingId, // Reuse field for child filing ID
        phase: "CORPORATE_ACTIVE",
        currentSectionIndex: 0,
        error: null,
      }

    case "INIT_TRUST_FILING":
      return {
        ...state,
        status: "success",
        filingId: action.payload.filingId,
        currentPersonalFilingId: action.payload.trustFilingId, // Reuse field for child filing ID
        phase: "TRUST_ACTIVE",
        currentSectionIndex: 0,
        error: null,
      }

    case "START_SPOUSE":
      return {
        ...state,
        currentPersonalFilingId: action.payload.personalFilingId,
        phase: "SPOUSE_ACTIVE",
        currentSectionIndex: 0,
      }

    case "ADD_DEPENDENT":
      return {
        ...state,
        totalDependents: state.totalDependents + 1,
      }

    case "START_DEPENDENT":
      return {
        ...state,
        currentPersonalFilingId: action.payload.personalFilingId,
        phase: "DEPENDENT_ACTIVE",
        currentDependentIndex: action.payload.index,
        currentSectionIndex: 0,
      }

    case "NEXT_SECTION":
      return {
        ...state,
        currentSectionIndex: state.currentSectionIndex + 1,
      }

    case "PREV_SECTION":
      return {
        ...state,
        currentSectionIndex: Math.max(0, state.currentSectionIndex - 1),
      }

    case "GO_TO_SECTION":
      return {
        ...state,
        currentSectionIndex: action.payload,
      }

    case "COMPLETE_PHASE":
      return handlePhaseComplete(state)

    case "COMPLETE_PRIMARY":
      return { ...state, phase: "SPOUSE_CHECKPOINT", currentSectionIndex: 0 }

    case "COMPLETE_SPOUSE":
      return { ...state, phase: "DEPENDENT_CHECKPOINT", currentSectionIndex: 0 }

    case "SKIP_SPOUSE":
      return { ...state, phase: "DEPENDENT_CHECKPOINT", currentSectionIndex: 0 }

    case "COMPLETE_DEPENDENT":
      return { ...state, phase: "DEPENDENT_CHECKPOINT", currentSectionIndex: 0 }

    case "COMPLETE_CORPORATE":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }

    case "COMPLETE_TRUST":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }

    case "SKIP_DEPENDENTS":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }

    case "GO_TO_REVIEW":
      return { ...state, phase: "REVIEW", currentSectionIndex: 0 }

    case "RESET":
      return initialWizardState

    default:
      return state
  }
}

/**
 * Helper function to get display information for each phase
 * Used by WizardProgress component to show step number and label
 */
export function getPhaseInfo(phase: WizardPhase, filingType?: string): { step: number; total: number; label: string } {
  // Corporate/Trust filings have a simpler flow: Form → Review (2 steps)
  if (filingType === "CORPORATE" || filingType === "TRUST") {
    switch (phase) {
      case "IDLE":
        return { step: 0, total: 2, label: "Getting Started" }
      case "CORPORATE_ACTIVE":
        return { step: 1, total: 2, label: "Corporation Details" }
      case "TRUST_ACTIVE":
        return { step: 1, total: 2, label: "Trust Details" }
      case "REVIEW":
        return { step: 2, total: 2, label: "Review & Submit" }
      case "CORPORATE_COMPLETE":
      case "TRUST_COMPLETE":
        return { step: 2, total: 2, label: "Complete" }
      default:
        return { step: 0, total: 2, label: "Unknown" }
    }
  }

  // Personal (INDIVIDUAL) filing flow: 5 steps
  switch (phase) {
    case "IDLE":
      return { step: 0, total: 5, label: "Getting Started" }
    case "PRIMARY_ACTIVE":
      return { step: 1, total: 5, label: "Your Information" }
    case "SPOUSE_CHECKPOINT":
      return { step: 2, total: 5, label: "Spouse Decision" }
    case "SPOUSE_ACTIVE":
      return { step: 2, total: 5, label: "Spouse Information" }
    case "DEPENDENT_CHECKPOINT":
      return { step: 3, total: 5, label: "Dependents Decision" }
    case "DEPENDENT_ACTIVE":
      return { step: 3, total: 5, label: "Dependent Information" }
    case "REVIEW":
      return { step: 4, total: 5, label: "Review & Submit" }
    case "PRIMARY_COMPLETE":
    case "SPOUSE_COMPLETE":
    case "DEPENDENT_COMPLETE":
      return { step: 5, total: 5, label: "Complete" }
    default:
      return { step: 0, total: 5, label: "Unknown" }
  }
}