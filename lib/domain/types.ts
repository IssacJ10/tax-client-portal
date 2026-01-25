// tax-client-portal/lib/domain/types.ts

// --- Enums (Lowercase to match Strapi v5) ---
export type FilingRole = "primary" | "spouse" | "dependent";
export type FilingStatus = "NOT_STARTED" | "DRAFT" | "IN_PROGRESS" | "UNDER_REVIEW" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type FilingType = "INDIVIDUAL" | "CORPORATE" | "TRUST";

// --- Progress Tracking for Resume ---
export interface WizardProgress {
  lastPhase: string;
  lastSectionIndex: number;
  lastPersonalFilingId: string;
  lastDependentIndex?: number;
}

// --- Database Models ---
export interface Filing {
  id: string; // Strapi documentId
  documentId: string;
  referenceNumber?: string; // Unique reference number (JJ-XXXXXX)
  year: number;
  type: FilingType;
  status: FilingStatus;
  totalPrice: number;
  paidAmount?: number; // Amount already paid (for tracking amendments)
  personalFilings: PersonalFiling[];
  wizardProgress?: WizardProgress; // Progress tracking for resume functionality
  createdAt: string;
  updatedAt: string;
}

export interface PersonalFiling {
  id: string; // Strapi documentId
  documentId: string;
  filingId?: string;
  type: FilingRole;
  firstName?: string;
  lastName?: string;
  formData: Record<string, unknown>;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- State Machine Types ---
export type WizardPhase =
  | "IDLE"
  | "PRIMARY_ACTIVE"
  | "PRIMARY_COMPLETE"
  | "SPOUSE_CHECKPOINT"
  | "SPOUSE_ACTIVE"
  | "SPOUSE_COMPLETE"
  | "DEPENDENT_CHECKPOINT"
  | "DEPENDENT_ACTIVE"
  | "DEPENDENT_COMPLETE"
  | "CORPORATE_ACTIVE"
  | "CORPORATE_COMPLETE"
  | "TRUST_ACTIVE"
  | "TRUST_COMPLETE"
  | "REVIEW";

export interface WizardState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  isLoading: boolean;
  isSyncing: boolean;

  // Data Context
  filingId: string | null;
  currentPersonalFilingId: string | null;

  // Flow State
  phase: WizardPhase;
  currentStep: string;
  currentSectionIndex: number;

  // Progress Tracking
  completedSteps: string[];
  totalDependents: number;
  currentDependentIndex: number;
}

// --- Validation & Schema (Keep as is) ---
export interface ValidationRule {
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  conditionalRequired?: { when: ConditionalLogic };
}

export interface ConditionalLogic {
  parentQuestionId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'in' | 'greaterThan' | 'hasAny';
  value?: any;
  values?: any[];
}

export interface QuestionField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file' | 'repeater' | 'textarea';
  name: string;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: ValidationRule;
  conditional?: ConditionalLogic;
  visibleForRoles?: FilingRole[];
  step?: string;
  order?: number;
  helpText?: string;
  fields?: QuestionField[];
  config?: {
    addButtonLabel?: string;
    emptyMessage?: string;
    // File upload options
    multiple?: boolean;  // Allow multiple file uploads
    maxFiles?: number;   // Maximum number of files (default: 10)
    accept?: string;     // Accepted file types (e.g., ".pdf,.jpg")
  };
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  visibleForRoles?: FilingRole[];
  conditional?: {
    anyQuestionVisible?: boolean;
    // Step-level gating conditional - step only shows if this condition is met
    parentQuestionId?: string;
    operator?: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'in' | 'hasAny' | 'greaterThan';
    value?: unknown;
    values?: unknown[];
  };
}

export interface PricingSchema {
  baseFee: number;
  currency: string;
  taxRate: number;
  rules: any[];
}

export interface TaxFilingSchema {
  header: { title: string; description: string; showProgress: boolean };
  steps: WizardStep[];
  questions: QuestionField[];
  pricing?: PricingSchema;
  review?: any;
}

export interface QuestionSection extends WizardStep {
  questions: QuestionField[];
}

export type Question = QuestionField;

export interface PricingConfig {
  baseFee: number;
  spouseFee: number;
  dependentFee: number;
  currency?: string;
}

export interface PricingItem {
  label: string;
  amount: number;
}

export interface PricingBreakdown {
  baseFee: number;
  items: PricingItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

// tax-client-portal/lib/domain/types.ts

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  confirmed?: boolean;
  blocked?: boolean;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}