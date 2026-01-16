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
  return {
    id,
    documentId: id,
    filingId: data.filing?.documentId || data.filing?.id || data.filing,
    formData: data.formData || {},
    isComplete: data.status === 'COMPLETED',
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
          status: "DRAFT"
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
   */
  static async saveFormData(trustFilingId: string, data: Record<string, unknown>): Promise<TrustFiling> {
    // Merge with existing data
    const existingRes = await strapiClient.get<StrapiResponse<any>>(`/trust-filings/${trustFilingId}`)
    const existingData = existingRes.data.data.formData || {}

    const mergedData = { ...existingData, ...data }

    const response = await strapiClient.put<StrapiResponse<any>>(`/trust-filings/${trustFilingId}`, {
      data: { formData: mergedData }
    })

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
   */
  static async submitForReview(filingId: string): Promise<TrustFilingWithData> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    // Get the UNDER_REVIEW status ID
    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!statusRes.ok) throw new Error('Failed to fetch status')
    const statusJson = await statusRes.json()
    const statusId = statusJson.data?.[0]?.id

    if (!statusId) throw new Error('UNDER_REVIEW status not found')

    // Generate unique confirmation number
    const confirmationNumber = this.generateReferenceNumber()

    // Update the filing status and confirmation number
    const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: {
        filingStatus: statusId,
        confirmationNumber,
        submittedAt: new Date().toISOString()
      }
    })

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
      data: { status: 'COMPLETED' }
    })
    return transformTrustFiling(response.data.data)
  }
}
