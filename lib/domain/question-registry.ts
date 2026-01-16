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
    // - dependants: handled by DEPENDENT_CHECKPOINT phase in wizard orchestrator (personal only)
    // - review: handled by final REVIEW phase after all family members complete
    // - payment: handled by final REVIEW phase payment step
    // Note: Corporate/Trust filings use different step IDs, so these exclusions mainly apply to personal
    const excludedSteps = ['filing_setup', 'dependants', 'review', 'payment'];

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
        // If step has conditional.anyQuestionVisible, check if any question would be visible
        if (step.conditional?.anyQuestionVisible) {
          const hasVisibleQuestion = step.questions.some(q => this.isQuestionVisible(q, formData));
          return hasVisibleQuestion;
        }
        return true;
      });
  }
  /**
   * Determines if a question should be visible based on current form data and conditional logic.
   */
  static isQuestionVisible(question: any, formData: any): boolean {
    if (!question.conditional) return true;

    const { parentQuestionId, operator, value, values } = question.conditional;
    const parentValue = formData[parentQuestionId];

    switch (operator) {
      case 'equals':
        return parentValue === value;
      case 'notEquals':
        return parentValue !== value;
      case 'greaterThan':
        return Number(parentValue) > Number(value);
      case 'in':
        return Array.isArray(values) && values.includes(parentValue);
      case 'contains':
        return Array.isArray(parentValue) && parentValue.includes(value);
      case 'hasAny':
        if (!Array.isArray(parentValue) || !Array.isArray(values)) return false;
        return values.some(v => parentValue.includes(v));
      default:
        return true;
    }
  }

  /**
   * Validates a section of questions against provided form data.
   * Returns validation result and error usage map.
   */
  static validateSection(section: any, formData: any): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!section || !section.questions) return { isValid: true, errors: {} };

    for (const question of section.questions) {
      // 1. Skip if question is hidden
      if (!this.isQuestionVisible(question, formData)) continue;

      const value = formData[question.name]; // Use name as key in formData
      const validation = question.validation;

      // 2. Check Required
      const isRequired = validation?.required ||
        (validation?.conditionalRequired && this.isQuestionVisible({ conditional: validation.conditionalRequired.when }, formData));

      if (isRequired) {
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          errors[question.id] = "This field is required";
          isValid = false;
          continue;
        }
      }

      // 3. Check Patterns (if value exists)
      if (value) {
        if (validation?.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(String(value))) {
            errors[question.id] = "Invalid format";
            isValid = false;
          }
        }
        // Native Type checks
        if (question.type === 'email' && !String(value).includes('@')) {
          errors[question.id] = "Invalid email address";
          isValid = false;
        }
      }
    }

    return { isValid, errors };
  }
}