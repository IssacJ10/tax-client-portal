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
  // Evaluates pricing rules for EACH personal filing (primary, spouse, dependents)
  static calculateFromSchema(
    filing: Filing,
    schema: { pricing?: PricingSchema }
  ): PricingBreakdown {
    const pricing = schema?.pricing
    if (!pricing) {
      return this.calculate(filing)
    }

    const items: { label: string; amount: number }[] = []
    let subtotal = 0
    const baseFee = pricing.baseFee || 0

    // Helper to get person label
    const getPersonLabel = (pf: { type: string; formData?: Record<string, unknown> }, index?: number): string => {
      const firstName = pf.formData?.["personalInfo.firstName"] as string || ""
      const lastName = pf.formData?.["personalInfo.lastName"] as string || ""
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : ""

      switch (pf.type) {
        case "primary":
          return fullName || "Primary Filer"
        case "spouse":
          return fullName || "Spouse"
        case "dependent":
          return fullName || `Dependent ${(index || 0) + 1}`
        default:
          return fullName || "Person"
      }
    }

    // Helper to evaluate pricing rules for a single person's form data
    const evaluateRulesForPerson = (
      formData: Record<string, unknown>,
      personLabel: string
    ): { personSubtotal: number; personItems: { label: string; amount: number }[] } => {
      const personItems: { label: string; amount: number }[] = []
      let personSubtotal = baseFee

      // Add base fee for this person
      personItems.push({ label: `${personLabel} - Base Fee`, amount: baseFee })

      // Evaluate pricing rules for this person's form data
      if (pricing.rules && Array.isArray(pricing.rules)) {
        for (const rule of pricing.rules) {
          if (evaluateCondition(rule.condition, formData)) {
            personSubtotal += rule.amount
            personItems.push({
              label: `${personLabel} - ${rule.description}`,
              amount: rule.amount
            })
          }
        }
      }

      return { personSubtotal, personItems }
    }

    // Process each personal filing
    const personalFilings = filing.personalFilings || []
    let dependentIndex = 0

    for (const pf of personalFilings) {
      const formData = pf.formData || {}
      const personLabel = getPersonLabel(pf, pf.type === "dependent" ? dependentIndex : undefined)

      if (pf.type === "dependent") {
        dependentIndex++
      }

      const { personSubtotal, personItems } = evaluateRulesForPerson(formData, personLabel)

      subtotal += personSubtotal
      items.push(...personItems)
    }

    // If no personal filings exist, at least charge the base fee for primary
    if (personalFilings.length === 0) {
      subtotal = baseFee
      items.push({ label: "Primary Filer - Base Fee", amount: baseFee })
    }

    // Calculate tax
    const taxRate = pricing.taxRate || 0.13
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      baseFee: baseFee,
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