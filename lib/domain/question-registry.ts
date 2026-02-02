// tax-client-portal/lib/domain/question-registry.ts

import { TaxFilingSchema, FilingType, FilingRole } from './types';

// Assuming you have moved your JSON files to these paths as discussed
import personal2025 from '@/config/2025/personal.json'; // Or '@/config/2024/personal.json'
import corporate2025 from '@/config/2025/corporate.json';
import trust2025 from '@/config/2025/trust.json';

// Simple fallback map. In a real app, you might have 2023, 2025, etc.
const REGISTRY: Record<string, Record<FilingType, any>> = {
  '2025': {
    INDIVIDUAL: personal2025,
    CORPORATE: corporate2025,
    TRUST: trust2025,
  }
};

export class QuestionRegistry {
  /**
   * Retrieves the schema for a specific year and type.
   */
  static getSchema(year: number | string, type: FilingType): TaxFilingSchema {
    const yearKey = String(year);

    // 1. Try to find exact year match
    const yearConfig = REGISTRY[yearKey];

    if (yearConfig && yearConfig[type]) {
      return yearConfig[type] as unknown as TaxFilingSchema;
    }

    // 2. Fallback to 2025 if year not found
    console.warn(`Configuration for ${year} ${type} not found. Falling back to 2025.`);
    return REGISTRY['2025'][type] as unknown as TaxFilingSchema;
  }

  /**
   * Helper to valid role inclusion case-insensitively
   */
  private static matchRole(role: FilingRole, visibleForRoles?: string[]) {
    if (!visibleForRoles || visibleForRoles.length === 0) return true;
    const normalizedRole = role.toUpperCase();
    return visibleForRoles.some(r => r.toUpperCase() === normalizedRole);
  }

  /**
   * Filters questions based on the active role (Primary vs Spouse).
   * Used by the QuestionRenderer.
   */
  static filterQuestionsForRole(questions: any[], role: FilingRole) {
    return questions.filter(q =>
      this.matchRole(role, q.visibleForRoles)
    );
  }

  /**
   * Retrieves the sections (steps) for a specific role from the schema.
   * Also maps the relevant questions into each step.
   * Filters out conditional sections where no questions would be visible.
   */
  static getSectionsForRole(schema: TaxFilingSchema, role: FilingRole, formData: Record<string, unknown> = {}) {
    if (!schema || !schema.steps || !schema.questions) {
      return [];
    }

    if (!role) {
      return [];
    }

    // Steps to exclude from the wizard flow (handled separately or not needed)
    // - filing_setup: handled by new-filing-dialog (personal only)
    // - review: handled by final REVIEW phase after all family members complete
    // - payment: handled by final REVIEW phase payment step
    // Note: Corporate/Trust filings use different step IDs, so these exclusions mainly apply to personal
    // Note: 'dependants' step is now included in primary questionnaire (repeater collects all dependant info)
    const excludedSteps = ['filing_setup', 'review', 'payment'];

    // Filter steps by role, exclude certain steps, and sort by order
    const filteredSteps = schema.steps
      .filter(step => !excludedSteps.includes(step.id))
      .filter(step => this.matchRole(role, step.visibleForRoles))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Map questions to steps and filter out conditional sections with no visible questions
    return filteredSteps
      .map(step => {
        const stepQuestions = schema.questions.filter(q =>
          q.step === step.id &&
          this.matchRole(role, q.visibleForRoles)
        ).sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
          ...step,
          questions: stepQuestions
        };
      })
      .filter(step => {
        // Check step-level gating conditional first (e.g., requires TRAVEL_FOR_WORK)
        if (step.conditional?.parentQuestionId) {
          const gatingConditionMet = this.evaluateConditional(step.conditional, formData);
          if (!gatingConditionMet) {
            return false; // Step's primary condition not met, hide entire step
          }
        }

        // If step also has anyQuestionVisible, check if any question would be visible
        if (step.conditional?.anyQuestionVisible) {
          const hasVisibleQuestion = step.questions.some(q => this.isQuestionVisible(q, formData));
          return hasVisibleQuestion;
        }
        return true;
      });
  }
  /**
   * Evaluates a single conditional clause against formData.
   * This is the core conditional evaluation logic.
   */
  private static evaluateConditional(conditional: any, formData: any): boolean {
    const { parentQuestionId, operator, value, values } = conditional;
    const parentValue = formData[parentQuestionId];

    switch (operator) {
      case 'equals':
        return parentValue === value;
      case 'notEquals':
        return parentValue !== value;
      case 'notEqualsStrict':
        // Strict version: treats undefined as NOT passing the condition
        // Use this when you want "not checked" to require explicit false, not just undefined
        if (parentValue === undefined || parentValue === null) return false;
        return parentValue !== value;
      case 'greaterThan':
        return Number(parentValue) > Number(value);
      case 'in':
        return Array.isArray(values) && values.includes(parentValue);
      case 'notIn':
        // Returns true if the value is NOT in the array (shows field when value is not in list)
        // Use this to hide fields when value IS in a specific list
        // Example: Hide "Date Became Resident" when status is CANADIAN_CITIZEN
        return !Array.isArray(values) || !values.includes(parentValue);
      case 'contains':
        return Array.isArray(parentValue) && parentValue.includes(value);
      case 'notContains':
        // Returns true if the array does NOT contain the value (or if array is empty/undefined)
        if (!Array.isArray(parentValue)) return true;
        return !parentValue.includes(value);
      case 'hasAny':
        if (!Array.isArray(parentValue) || !Array.isArray(values)) return false;
        return values.some(v => parentValue.includes(v));
      default:
        return true;
    }
  }

  /**
   * Determines if a question should be visible based on current form data and conditional logic.
   * Supports compound conditionals with 'and' array for multiple conditions that must ALL be true.
   */
  static isQuestionVisible(question: any, formData: any): boolean {
    if (!question.conditional) return true;

    const conditional = question.conditional;

    // Support for compound conditionals using 'and' array
    // Example: { "and": [{ parentQuestionId: "...", operator: "...", value: "..." }, ...] }
    if (conditional.and && Array.isArray(conditional.and)) {
      return conditional.and.every((clause: any) => this.evaluateConditional(clause, formData));
    }

    // Support for 'or' array - any condition being true shows the question
    if (conditional.or && Array.isArray(conditional.or)) {
      return conditional.or.some((clause: any) => this.evaluateConditional(clause, formData));
    }

    // Single conditional (backward compatible)
    return this.evaluateConditional(conditional, formData);
  }

  /**
   * Finds a related YES/NO question that should trigger file upload requirement.
   * Maps file field names to their triggering question names.
   * e.g., "assetReceipts" in "selfEmployment" namespace -> "selfEmployment.hasCapitalAssets"
   */
  private static findRelatedYesNoQuestion(
    fileFieldName: string,
    namespace: string,
    questionsByName: Map<string, any>
  ): string | null {
    // Map of file field patterns to their triggering YES/NO question field names
    const fileToTriggerMap: Record<string, string[]> = {
      // selfEmployment namespace
      'assetReceipts': ['hasCapitalAssets'],
      'expenseDocuments': [], // Always required when self-employed (no specific YES/NO trigger)
      'businessDocuments': [], // Always required when self-employed

      // workExpenses namespace
      't2200Document': [], // Required when work expenses selected
      'receiptDocuments': [], // Required when work expenses selected

      // rentalIncome namespace
      'documents': [], // Required when rental income selected

      // movingExpenses namespace
      // 'documents': [], // Required when moving expenses selected

      // Generic patterns
    };

    const possibleTriggers = fileToTriggerMap[fileFieldName];

    if (possibleTriggers && possibleTriggers.length > 0) {
      for (const triggerField of possibleTriggers) {
        const fullFieldName = `${namespace}.${triggerField}`;
        if (questionsByName.has(fullFieldName)) {
          const triggerQuestion = questionsByName.get(fullFieldName);
          // Verify it's a YES/NO question
          const isYesNo = triggerQuestion?.options?.some((opt: any) =>
            opt.value === 'YES' || opt.value === 'NO'
          );
          if (isYesNo) {
            return fullFieldName;
          }
        }
      }
    }

    return null;
  }

  /**
   * Validates a section of questions against provided form data.
   * Returns validation result and error usage map.
   * @param section - The current section with questions to validate
   * @param formData - The form data to validate against
   * @param allQuestions - Optional: all questions from the schema for cross-section parent lookups
   */
  static validateSection(section: any, formData: any, allQuestions?: any[]): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!section || !section.questions) return { isValid: true, errors: {} };

    // Build a map of all available questions by name for parent lookup
    // Include both section questions and all schema questions if provided
    const questionsByName = new Map<string, any>();
    for (const q of section.questions) {
      questionsByName.set(q.name, q);
    }
    if (allQuestions) {
      for (const q of allQuestions) {
        if (!questionsByName.has(q.name)) {
          questionsByName.set(q.name, q);
        }
      }
    }

    for (const question of section.questions) {
      // 1. Skip if question is hidden
      if (!this.isQuestionVisible(question, formData)) continue;

      const value = formData[question.name]; // Use name as key in formData
      const validation = question.validation;

      // Special handling for repeater fields - validate each item's fields
      if (question.type === 'repeater' && question.fields) {
        const items = Array.isArray(value) ? value : [];

        // Validate each item in the repeater
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          const item = items[itemIndex] as Record<string, unknown>;

          for (const field of question.fields as any[]) {
            // Check conditional visibility for this field within the repeater item
            if (field.conditional) {
              const { field: parentField, operator, value: condValue, values: condValues } = field.conditional;
              const parentValue = item[parentField];

              let isFieldVisible = false;
              switch (operator) {
                case "equals":
                  isFieldVisible = parentValue === condValue;
                  break;
                case "notEquals":
                  isFieldVisible = parentValue !== condValue;
                  break;
                case "in":
                  isFieldVisible = Array.isArray(condValues) && condValues.includes(parentValue);
                  break;
                case "notIn":
                  isFieldVisible = !Array.isArray(condValues) || !condValues.includes(parentValue);
                  break;
                default:
                  isFieldVisible = true;
              }

              if (!isFieldVisible) continue; // Skip validation for hidden fields
            }

            const fieldValue = item[field.name];
            const fieldValidation = field.validation;

            // Check required - simple "is required" message
            if (fieldValidation?.required) {
              if (fieldValue === undefined || fieldValue === null || fieldValue === "" ||
                  (Array.isArray(fieldValue) && fieldValue.length === 0)) {
                errors[`${question.id}_${itemIndex}_${field.name}`] = "is required";
                isValid = false;
              }
            }

            // Check pattern - simple "invalid format" message
            if (fieldValue && fieldValidation?.pattern) {
              const regex = new RegExp(fieldValidation.pattern);
              if (!regex.test(String(fieldValue))) {
                errors[`${question.id}_${itemIndex}_${field.name}`] = "invalid format";
                isValid = false;
              }
            }
          }
        }
        continue; // Skip regular validation for repeater questions (already handled above)
      }

      // 2. Check Required
      let isRequired = validation?.required ||
        (validation?.conditionalRequired && this.isQuestionVisible({ conditional: validation.conditionalRequired.when }, formData));

      // 3. For file upload questions, determine if they should be required
      // Rule: File uploads are required when there's a triggering question answered affirmatively
      // EXCEPTION: If the question has renderInline: true, respect the explicit validation.required setting
      const isInlineUpload = (question as any).renderInline === true;

      if (question.type === 'file' && !isRequired && !isInlineUpload) {
        const fileNamespace = question.name.split('.')[0]; // e.g., "selfEmployment" from "selfEmployment.assetReceipts"
        const fileFieldName = question.name.split('.').slice(1).join('.'); // e.g., "assetReceipts"

        // Case A: File has explicit conditional pointing to a YES/NO question
        // Only require if the parent question's answer is affirmative (YES)
        if (question.conditional) {
          const parentQuestionId = question.conditional.parentQuestionId;
          const parentValue = formData[parentQuestionId];
          const parentQuestion = questionsByName.get(parentQuestionId);

          // Check if parent is a YES/NO type question
          const isYesNoQuestion = parentQuestion?.options?.some((opt: any) =>
            opt.value === 'YES' || opt.value === 'NO'
          );

          if (isYesNoQuestion) {
            // Only require file if user answered YES
            if (parentValue === 'YES') {
              isRequired = true;
            }
          } else if (question.conditional.operator === 'contains' || question.conditional.operator === 'hasAny') {
            // For checkbox/multi-select conditionals (like income.sources contains SELF_EMPLOYMENT)
            // Look for a more specific YES/NO question in the same namespace that relates to this file
            // e.g., selfEmployment.assetReceipts should check selfEmployment.hasCapitalAssets
            const relatedYesNoField = this.findRelatedYesNoQuestion(fileFieldName, fileNamespace, questionsByName);

            if (relatedYesNoField) {
              const relatedValue = formData[relatedYesNoField];
              if (relatedValue === 'YES') {
                isRequired = true;
              }
              // If NO or unanswered, file is not required
            } else {
              // No specific YES/NO question found, use original conditional logic
              // File is visible, so it should be required
              isRequired = true;
            }
          } else {
            // For equals operator with YES value, the conditional already checks for YES
            if (question.conditional.value === 'YES' && parentValue === 'YES') {
              isRequired = true;
            } else if (question.conditional.value !== 'YES' && question.conditional.value !== 'NO') {
              // Non YES/NO conditional (like contains DEPENDANT), file is required when visible
              isRequired = true;
            }
          }
        }

        // Case B: File has no conditional, but shares a namespace prefix with another question
        // e.g., income.documents relates to income.sources
        // If the related question has a meaningful answer, file becomes required
        if (!isRequired && !question.conditional) {
          // Find related questions in same namespace that might trigger file requirement
          for (const [qName, q] of questionsByName) {
            if (qName === question.name) continue;
            const qNamespace = qName.split('.')[0];

            if (qNamespace === fileNamespace && q.type !== 'file') {
              const relatedValue = formData[qName];

              // Check if the related question has a meaningful answer
              if (relatedValue !== undefined && relatedValue !== null && relatedValue !== '') {
                // For checkbox/multi-select: check if any meaningful selection
                if (Array.isArray(relatedValue)) {
                  // Filter out "NA" or "N/A" type values
                  const meaningfulSelections = relatedValue.filter(v =>
                    v !== 'NA' && v !== 'N/A' && v !== 'NONE' && v !== ''
                  );
                  if (meaningfulSelections.length > 0) {
                    isRequired = true;
                    break;
                  }
                } else if (typeof relatedValue === 'string') {
                  // For single value: check it's not NA
                  if (relatedValue !== 'NA' && relatedValue !== 'N/A' && relatedValue !== 'NONE') {
                    isRequired = true;
                    break;
                  }
                } else {
                  // For other types (numbers, etc.), treat as meaningful
                  isRequired = true;
                  break;
                }
              }
            }
          }
        }
      }

      if (isRequired) {
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          // Simple "is required" message - the field label is already shown above
          errors[question.id] = "is required";
          isValid = false;
          continue;
        }
      }

      // 4. Check Patterns (if value exists) - simple client-side validation
      // Detailed error messages come from server if this passes
      if (value) {
        if (validation?.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(String(value))) {
            errors[question.id] = "invalid format";
            isValid = false;
          }
        }
        // Native Type checks
        if (question.type === 'email' && !String(value).includes('@')) {
          errors[question.id] = "invalid email";
          isValid = false;
        }
        // Phone format check
        if (question.type === 'phone' && !/^[\d\s\-+()]+$/.test(String(value))) {
          errors[question.id] = "invalid phone";
          isValid = false;
        }
        // Number range checks
        if (question.type === 'number' && validation) {
          const numValue = Number(value);
          if (validation.min !== undefined && numValue < validation.min) {
            errors[question.id] = `minimum ${validation.min}`;
            isValid = false;
          }
          if (validation.max !== undefined && numValue > validation.max) {
            errors[question.id] = `maximum ${validation.max}`;
            isValid = false;
          }
        }
      }
    }

    return { isValid, errors };
  }

  /**
   * Gets all field names that should be cleared when a conditional trigger changes.
   * This is called when a parent field (like income.sources) is updated, and we need to
   * clear data from conditional sections that are no longer visible.
   *
   * @param schema - The tax filing schema
   * @param changedFieldName - The field that was changed (e.g., "income.sources")
   * @param oldValue - The previous value of the field
   * @param newValue - The new value of the field
   * @param role - The current filing role
   * @returns Array of field names to clear from formData
   */
  static getFieldsToClearForConditional(
    schema: TaxFilingSchema,
    changedFieldName: string,
    oldValue: unknown,
    newValue: unknown,
    role: FilingRole,
    fullFormData: Record<string, unknown> = {}
  ): string[] {
    if (!schema || !schema.steps || !schema.questions) {
      return [];
    }

    const fieldsToClear: string[] = [];

    // Create formData contexts for before and after the change
    const oldFormData = { ...fullFormData, [changedFieldName]: oldValue };
    const newFormData = { ...fullFormData, [changedFieldName]: newValue };

    // Find steps that have conditional rules referencing the changed field
    for (const step of schema.steps) {
      if (!step.conditional?.parentQuestionId) continue;
      if (step.conditional.parentQuestionId !== changedFieldName) continue;

      // Check if the step was previously visible but is now hidden
      const wasVisible = this.evaluateConditional(step.conditional, oldFormData);
      const isVisible = this.evaluateConditional(step.conditional, newFormData);

      if (wasVisible && !isVisible) {
        // Step is now hidden - collect all question names in this step
        const stepQuestions = schema.questions.filter(
          q => q.step === step.id && this.matchRole(role, q.visibleForRoles)
        );

        for (const question of stepQuestions) {
          if (question.name) {
            fieldsToClear.push(question.name);
          }
        }
      }
    }

    // Also check individual questions that have conditional rules referencing the changed field
    for (const question of schema.questions) {
      if (!question.conditional) continue;
      if (!this.matchRole(role, question.visibleForRoles)) continue;

      // Handle compound conditionals
      let relevantClauses: any[] = [];
      if (question.conditional.and) {
        relevantClauses = question.conditional.and.filter((c: any) => c.parentQuestionId === changedFieldName);
      } else if (question.conditional.or) {
        relevantClauses = question.conditional.or.filter((c: any) => c.parentQuestionId === changedFieldName);
      } else if (question.conditional.parentQuestionId === changedFieldName) {
        relevantClauses = [question.conditional];
      }

      if (relevantClauses.length === 0) continue;

      // Check if the question was previously visible but is now hidden
      const wasVisible = this.isQuestionVisible(question, oldFormData);
      const isVisible = this.isQuestionVisible(question, newFormData);

      if (wasVisible && !isVisible && question.name) {
        if (!fieldsToClear.includes(question.name)) {
          fieldsToClear.push(question.name);
        }
      }
    }

    return fieldsToClear;
  }

  /**
   * Validates ALL sections for a specific role (primary/spouse/dependent).
   * Used when completing a phase to ensure all required fields are filled.
   * @param schema - The tax filing schema
   * @param role - The filing role (primary, spouse, dependent)
   * @param formData - The form data to validate against
   * @returns Validation result with all errors and missing sections info
   */
  static validateAllSectionsForRole(
    schema: TaxFilingSchema,
    role: FilingRole,
    formData: Record<string, unknown>
  ): {
    isValid: boolean;
    errors: Record<string, string>;
    missingSections: { sectionId: string; sectionTitle: string; missingFields: string[] }[];
    totalMissingFields: number;
  } {
    const allErrors: Record<string, string> = {};
    const missingSections: { sectionId: string; sectionTitle: string; missingFields: string[] }[] = [];
    let totalMissingFields = 0;

    // Get all sections for this role
    const sections = this.getSectionsForRole(schema, role, formData);

    // Validate each section
    for (const section of sections) {
      const { isValid, errors } = this.validateSection(section, formData, schema?.questions);

      if (!isValid) {
        // Collect errors
        Object.assign(allErrors, errors);

        // Track which fields are missing in this section
        const missingFields: string[] = [];
        for (const errorKey of Object.keys(errors)) {
          // For repeater fields, the error key format is: questionId_itemIndex_fieldName
          // For regular fields, the error key is just: questionId
          const errorMessage = errors[errorKey];

          // Find the question to get its label (handle both regular and repeater fields)
          const baseQuestionId = errorKey.split('_')[0];
          const question = section.questions?.find((q: any) => q.id === baseQuestionId || q.id === errorKey);

          if (question) {
            // For repeater fields, the error message already contains the item and field info
            missingFields.push(errorMessage);
          } else {
            // Fallback: use the error message itself
            missingFields.push(errorMessage);
          }
          totalMissingFields++;
        }

        if (missingFields.length > 0) {
          missingSections.push({
            sectionId: section.id,
            sectionTitle: section.title,
            missingFields,
          });
        }
      }
    }

    return {
      isValid: totalMissingFields === 0,
      errors: allErrors,
      missingSections,
      totalMissingFields,
    };
  }
}