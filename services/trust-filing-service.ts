// tax-client-portal/services/trust-filing-service.ts

import { strapiClient, type StrapiResponse } from "./strapi-client"
import type { Filing, FilingStatus } from "@/lib/domain/types"

/**
 * Trust Filing child entity - stores T3 trust tax data
 */
export interface TrustFiling {
  id: string
  documentId: string
  filingId?: string
  formData: Record<string, unknown>
  trustFilingStatus: 'DRAFT' | 'COMPLETED' | 'FLAGGED' | 'VERIFIED'
  isComplete: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Trust Filing with its child data
 */
export interface TrustFilingWithData extends Filing {
  trustFiling?: TrustFiling
}

// --- Transformers ---

function transformTrustFiling(data: any): TrustFiling {
  const id = data.documentId || data.id || String(data.id)
  const trustFilingStatus = data.trustFilingStatus || 'DRAFT'
  return {
    id,
    documentId: id,
    filingId: data.filing?.documentId || data.filing?.id || data.filing,
    formData: data.formData || {},
    trustFilingStatus: trustFilingStatus,
    isComplete: trustFilingStatus === 'COMPLETED',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function transformFilingWithTrust(data: any): TrustFilingWithData {
  const filingId = data.documentId || data.id || String(data.id)
  const taxYear = typeof data.taxYear === 'object' ? data.taxYear?.year : data.taxYear

  // Handle trustFilings relation
  let trustFilingData = data.trustFilings || data.trustFiling
  if (trustFilingData?.data) {
    trustFilingData = trustFilingData.data
  }
  // Get the first trust filing if it's an array
  if (Array.isArray(trustFilingData)) {
    trustFilingData = trustFilingData[0]
  }

  return {
    id: filingId,
    documentId: filingId,
    referenceNumber: data.confirmationNumber || data.referenceNumber || undefined,
    year: Number(taxYear) || 2025,
    type: 'TRUST',
    status: (data.status || data.filingStatus?.statusCode || data.filingStatus?.code || 'DRAFT') as FilingStatus,
    totalPrice: data.totalPrice || 0,
    paidAmount: data.paidAmount || 0,
    personalFilings: [], // Trust filings don't have personal filings
    trustFiling: trustFilingData ? transformTrustFiling(trustFilingData) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Trust Filing Service - Wrapper class for T3 trust tax filings
 */
export class TrustFilingService {
  /**
   * Get a trust filing by ID with its trust data
   */
  static async getFiling(documentId: string): Promise<TrustFilingWithData> {
    const response = await strapiClient.get<StrapiResponse<any>>(
      `/filings/${documentId}?populate[trustFilings][populate]=*&populate[taxYear]=*&populate[filingType]=*&populate[filingStatus]=*`
    )
    return transformFilingWithTrust(response.data.data)
  }

  /**
   * Initialize a new trust filing
   * Creates the parent Filing and child TrustFiling records
   */
  static async initFiling(year: number): Promise<{ filing: TrustFilingWithData; trustFiling: TrustFiling }> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    try {
      // Step 1: Get tax year ID
      const yearRes = await fetch(`${strapiUrl}/api/tax-years?filters[year][$eq]=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!yearRes.ok) throw new Error('Failed to fetch tax year configuration')
      const yearJson = await yearRes.json()
      if (!yearJson.data || yearJson.data.length === 0) throw new Error(`Tax Year ${year} not configured.`)
      const taxYearId = yearJson.data[0].id

      // Step 2: Get TRUST filing type ID
      const typeRes = await fetch(`${strapiUrl}/api/filing-types?filters[type][$eq]=TRUST`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!typeRes.ok) throw new Error('Failed to fetch filing type')
      const typeJson = await typeRes.json()
      if (!typeJson.data || typeJson.data.length === 0) throw new Error('Trust filing type not found')
      const filingTypeId = typeJson.data[0].id

      // Step 3: Get default status ID
      const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=NOT_STARTED`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      let statusId
      if (statusRes.ok) {
        const statusJson = await statusRes.json()
        statusId = statusJson.data?.[0]?.id
      }
      if (!statusId) {
        const statusRes2 = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=IN_PROGRESS`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (statusRes2.ok) {
          const statusJson2 = await statusRes2.json()
          statusId = statusJson2.data?.[0]?.id
        }
      }
      if (!statusId) throw new Error('Default status not found')

      // Step 4: Create parent Filing record
      const filingRes = await strapiClient.post<StrapiResponse<any>>("/filings", {
        data: {
          taxYear: taxYearId,
          filingStatus: statusId,
          filingType: filingTypeId,
          progress: 0,
          entityName: "New Trust",
          filingData: {}
        }
      })

      const filingId = filingRes.data.data.documentId || filingRes.data.data.id

      // Step 5: Create child TrustFiling record
      const trustRes = await strapiClient.post<StrapiResponse<any>>("/trust-filings", {
        data: {
          filing: filingId,
          formData: {},
          trustFilingStatus: "DRAFT"
        }
      })
      const trustFiling = transformTrustFiling(trustRes.data.data)

      // Fetch the complete filing with the new TrustFiling included
      const completeFiling = await this.getFiling(filingId)
      return { filing: completeFiling, trustFiling }

    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message)
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  }

  /**
   * Save form data to a trust filing
   * Maps form fields to both individual columns AND the formData JSON blob
   */
  static async saveFormData(trustFilingId: string, data: Record<string, unknown>): Promise<TrustFiling> {
    // Merge with existing formData
    const existingRes = await strapiClient.get<StrapiResponse<any>>(`/trust-filings/${trustFilingId}`)
    const existingData = existingRes.data.data.formData || {}
    // Preserve existing trustFilingStatus, default to DRAFT if not set
    const existingStatus = existingRes.data.data.trustFilingStatus || 'DRAFT'

    const mergedFormData = { ...existingData, ...data }

    // Helper to clean empty strings to null
    const clean = (val: unknown): unknown => {
      if (val === '' || val === undefined) return null
      return val
    }

    // Helper to clean date strings (must be YYYY-MM-DD format)
    const cleanDate = (val: unknown): string | null => {
      if (!val) return null
      const strVal = String(val).trim()
      const regex = /^\d{4}-\d{2}-\d{2}$/
      if (regex.test(strVal)) return strVal
      // Handle ISO date strings
      if (strVal.includes('T')) {
        const part = strVal.split('T')[0]
        if (regex.test(part)) return part
      }
      return null
    }

    // Helper to convert to decimal (Strapi decimal type)
    const cleanDecimal = (val: unknown): number | null => {
      if (val === '' || val === undefined || val === null) return null
      const num = Number(val)
      return isNaN(num) ? null : num
    }

    // Map form fields to individual columns
    // Form data comes in dot-notation like "trustInfo.name"
    const mappedData: Record<string, unknown> = {
      // Trust Info - note form uses "trustInfo.name" but schema has "trustName"
      trustName: clean(mergedFormData['trustInfo.name']),
      accountNumber: clean(mergedFormData['trustInfo.accountNumber']),
      creationDate: cleanDate(mergedFormData['trustInfo.creationDate']),
      residency: clean(mergedFormData['trustInfo.residency']),

      // Trustees and Beneficiaries (JSON arrays)
      trustees: mergedFormData['trustees'] || null,
      beneficiaries: mergedFormData['beneficiaries'] || null,

      // Income (individual decimal fields)
      incomeInterest: cleanDecimal(mergedFormData['income.interest']),
      incomeDividends: cleanDecimal(mergedFormData['income.dividends']),
      incomeCapitalGains: cleanDecimal(mergedFormData['income.capitalGains']),
      incomeDistributions: cleanDecimal(mergedFormData['income.distributions']),

      // Always save the full merged form data as backup
      formData: mergedFormData
    }

    // Remove null fields to avoid overwriting existing data with null
    // But keep formData and trustFilingStatus always
    const cleanedData: Record<string, unknown> = {
      formData: mergedFormData,
      // Always preserve/set trustFilingStatus to prevent it from being cleared
      trustFilingStatus: existingStatus
    }
    for (const [key, value] of Object.entries(mappedData)) {
      if (key !== 'formData' && value !== null && value !== undefined) {
        cleanedData[key] = value
      }
    }

    // Explicitly remove any keys that are not in the schema
    // This prevents validation errors from old/stale keys in formData
    const schemaFields = [
      'trustName', 'accountNumber', 'creationDate', 'residency',
      'trustees', 'beneficiaries',
      'incomeInterest', 'incomeDividends', 'incomeCapitalGains', 'incomeDistributions',
      'formData', 'trustFilingStatus'
    ]
    const finalData: Record<string, unknown> = {}
    for (const key of schemaFields) {
      if (cleanedData[key] !== undefined) {
        finalData[key] = cleanedData[key]
      }
    }

    console.log('[TrustFilingService.saveFormData] Saving to:', trustFilingId)
    console.log('[TrustFilingService.saveFormData] Final data keys:', Object.keys(finalData))
    console.log('[TrustFilingService.saveFormData] Status being saved:', finalData.trustFilingStatus)

    const response = await strapiClient.put<StrapiResponse<any>>(`/trust-filings/${trustFilingId}`, {
      data: finalData
    })

    console.log('[TrustFilingService.saveFormData] Response status:', response.data.data?.trustFilingStatus)

    return transformTrustFiling(response.data.data)
  }

  /**
   * Mark filing as IN_PROGRESS
   */
  static async markFilingInProgress(filingId: string): Promise<void> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=IN_PROGRESS`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!statusRes.ok) throw new Error('Failed to fetch status')
    const statusJson = await statusRes.json()
    const statusId = statusJson.data?.[0]?.id

    if (!statusId) throw new Error('IN_PROGRESS status not found')

    await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: { filingStatus: statusId }
    })
  }

  /**
   * Generate a unique reference number for filing (JJ-XXXXXX)
   */
  static generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `JJ-${timestamp.slice(-4)}${random}`
  }

  /**
   * Submit trust filing for review
   * Also marks the child trust-filing as COMPLETED
   */
  static async submitForReview(filingId: string): Promise<TrustFilingWithData> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    // ============================================================
    // STEP 1: Get the filing to find the trust filing child
    // ============================================================
    console.log('[submitForReview] STEP 1: Getting filing data...')
    const filingData = await this.getFiling(filingId)
    const trustFilingId = filingData.trustFiling?.id || filingData.trustFiling?.documentId

    if (!trustFilingId) {
      throw new Error('Trust filing data not found')
    }
    console.log('[submitForReview] STEP 1 COMPLETE: trustFilingId =', trustFilingId)

    // ============================================================
    // STEP 2: Get the UNDER_REVIEW status ID
    // ============================================================
    console.log('[submitForReview] STEP 2: Getting UNDER_REVIEW status ID...')
    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!statusRes.ok) throw new Error('Failed to fetch status')
    const statusJson = await statusRes.json()
    const statusId = statusJson.data?.[0]?.id

    if (!statusId) throw new Error('UNDER_REVIEW status not found')
    console.log('[submitForReview] STEP 2 COMPLETE: statusId =', statusId)

    // ============================================================
    // STEP 3: Use existing confirmation number or generate new one
    // For reopened filings (amendments), preserve the original confirmation number
    // ============================================================
    const existingConfirmationNumber = filingData.referenceNumber
    const confirmationNumber = existingConfirmationNumber || this.generateReferenceNumber()
    console.log('[submitForReview] STEP 3: confirmationNumber =', confirmationNumber, existingConfirmationNumber ? '(preserved existing)' : '(newly generated)')

    // ============================================================
    // STEP 4: Mark the trust filing child as COMPLETED
    // ============================================================
    console.log('[submitForReview] STEP 4: Marking trust filing as COMPLETED...')
    await this.markTrustFilingComplete(trustFilingId)
    console.log('[submitForReview] STEP 4 COMPLETE')

    // ============================================================
    // STEP 5: Update the parent filing status, confirmation number, totalPrice, and paidAmount
    // When submitting (new or amendment), paidAmount = totalPrice because user pays the full amount
    // After submission, paidAmount reflects what they've now paid in total
    // ============================================================
    console.log('[submitForReview] STEP 5: Updating parent filing status...')

    // Get the current total price from the filing
    const totalPrice = filingData.totalPrice || 0

    // After submission, paidAmount should equal totalPrice (user has paid for this filing)
    const paidAmount = totalPrice

    console.log('[submitForReview] STEP 5: totalPrice =', totalPrice, ', paidAmount =', paidAmount)

    const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: {
        filingStatus: statusId,
        confirmationNumber,
        totalPrice,
        paidAmount,
        submittedAt: new Date().toISOString()
      }
    })
    console.log('[submitForReview] STEP 5 COMPLETE: Filing submitted successfully')

    // Return filing with the confirmation number set
    const filing = transformFilingWithTrust(response.data.data)
    filing.referenceNumber = confirmationNumber
    return filing
  }

  /**
   * Mark trust filing child as complete
   */
  static async markTrustFilingComplete(trustFilingId: string): Promise<TrustFiling> {
    const response = await strapiClient.put<StrapiResponse<any>>(`/trust-filings/${trustFilingId}`, {
      data: { trustFilingStatus: 'COMPLETED' }
    })
    return transformTrustFiling(response.data.data)
  }
}
