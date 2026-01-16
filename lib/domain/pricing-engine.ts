// tax-client-portal/lib/domain/pricing-engine.ts

import type { Filing, PricingConfig, PricingBreakdown, PricingSchema } from "./types"

const DEFAULT_PRICING: PricingConfig = {
  baseFee: 149.99,
  spouseFee: 49.99,
  dependentFee: 29.99,
  currency: "CAD"
}

// Check if a pricing rule condition is met
function evaluateCondition(condition: any, formData: Record<string, unknown>): boolean {
  if (!condition) return true

  const { parentQuestionId, operator, value, values } = condition
  const parentValue = formData[parentQuestionId]

  switch (operator) {
    case 'equals':
      return parentValue === value
    case 'notEquals':
      return parentValue !== value
    case 'contains':
      return Array.isArray(parentValue) && parentValue.includes(value)
    case 'in':
      return Array.isArray(values) && values.includes(parentValue)
    case 'hasAny':
      if (!Array.isArray(parentValue) || !Array.isArray(values)) return false
      return values.some(v => parentValue.includes(v))
    default:
      return false
  }
}

export class PricingEngine {
  // Legacy calculation method (backward compatible)
  static calculate(filing: Filing, config: PricingConfig = DEFAULT_PRICING): PricingBreakdown {
    const hasSpouse = filing.personalFilings?.some((pf) => pf.type === "spouse") || false
    const dependentCount = filing.personalFilings?.filter((pf) => pf.type === "dependent").length || 0

    const items = []
    let subtotal = config.baseFee

    if (hasSpouse) {
      subtotal += config.spouseFee
      items.push({ label: "Spouse Return", amount: config.spouseFee })
    }

    if (dependentCount > 0) {
      const depTotal = dependentCount * config.dependentFee
      subtotal += depTotal
      items.push({
        label: `Dependents (${dependentCount} x $${config.dependentFee})`,
        amount: depTotal
      })
    }

    const taxRate = 0.13
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      baseFee: config.baseFee,
      items,
      subtotal,
      tax,
      total,
      currency: config.currency || "CAD"
    }
  }

  // Schema-based calculation using pricing rules from the schema
  static calculateFromSchema(
    filing: Filing,
    schema: { pricing?: PricingSchema }
  ): PricingBreakdown {
    const pricing = schema?.pricing
    if (!pricing) {
      return this.calculate(filing)
    }

    const items: { label: string; amount: number }[] = []
    let subtotal = pricing.baseFee || 0

    // Get all form data from all personal filings
    const allFormData: Record<string, unknown> = {}
    filing.personalFilings?.forEach(pf => {
      Object.assign(allFormData, pf.formData || {})
    })

    // Count people
    const hasSpouse = filing.personalFilings?.some((pf) => pf.type === "spouse") || false
    const dependentCount = filing.personalFilings?.filter((pf) => pf.type === "dependent").length || 0

    // Add spouse fee (if applicable)
    if (hasSpouse) {
      // Use base fee for spouse too (or could be configured differently)
      subtotal += pricing.baseFee || 0
      items.push({ label: "Spouse Return", amount: pricing.baseFee || 0 })
    }

    // Add dependent fees
    if (dependentCount > 0) {
      const perDependent = pricing.baseFee || 0
      const depTotal = dependentCount * perDependent
      subtotal += depTotal
      items.push({
        label: `Dependents (${dependentCount} × $${perDependent.toFixed(2)})`,
        amount: depTotal
      })
    }

    // Evaluate pricing rules
    if (pricing.rules && Array.isArray(pricing.rules)) {
      for (const rule of pricing.rules) {
        if (evaluateCondition(rule.condition, allFormData)) {
          subtotal += rule.amount
          items.push({
            label: rule.description,
            amount: rule.amount
          })
        }
      }
    }

    // Calculate tax
    const taxRate = pricing.taxRate || 0.13
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      baseFee: pricing.baseFee || 0,
      items,
      subtotal,
      tax,
      total,
      currency: pricing.currency || "CAD"
    }
  }
}

// --- Helper Functions (Added to fix Build Errors) ---

export function calculatePricing(filing: Filing, config?: PricingConfig) {
  return PricingEngine.calculate(filing, config);
}

export function calculatePricingFromSchema(filing: Filing, schema: { pricing?: PricingSchema }) {
  return PricingEngine.calculateFromSchema(filing, schema);
}

export function formatPrice(amount: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatFilingRef(id: string) {
  // Creates a short reference ID from the UUID/DocumentID
  if (!id) return "JJ-PENDING";
  // Take last 6 chars for display
  return `JJ-${id.slice(-6).toUpperCase()}`
}