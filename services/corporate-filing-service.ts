// tax-client-portal/services/corporate-filing-service.ts

import { strapiClient, type StrapiResponse } from "./strapi-client"
import type { Filing, FilingStatus } from "@/lib/domain/types"

/**
 * Corporate Filing child entity - stores T2 corporate tax data
 */
export interface CorporateFiling {
  id: string
  documentId: string
  filingId?: string
  formData: Record<string, unknown>
  isComplete: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Corporate Filing with its child data
 */
export interface CorporateFilingWithData extends Filing {
  corporateFiling?: CorporateFiling
}

// --- Transformers ---

function transformCorporateFiling(data: any): CorporateFiling {
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

function transformFilingWithCorporate(data: any): CorporateFilingWithData {
  const filingId = data.documentId || data.id || String(data.id)
  const taxYear = typeof data.taxYear === 'object' ? data.taxYear?.year : data.taxYear

  // Handle corporateFilings relation
  let corporateFilingData = data.corporateFilings || data.corporateFiling
  if (corporateFilingData?.data) {
    corporateFilingData = corporateFilingData.data
  }
  // Get the first corporate filing if it's an array
  if (Array.isArray(corporateFilingData)) {
    corporateFilingData = corporateFilingData[0]
  }

  return {
    id: filingId,
    documentId: filingId,
    referenceNumber: data.confirmationNumber || data.referenceNumber || undefined,
    year: Number(taxYear) || 2025,
    type: 'CORPORATE',
    status: (data.status || data.filingStatus?.statusCode || data.filingStatus?.code || 'DRAFT') as FilingStatus,
    totalPrice: data.totalPrice || 0,
    personalFilings: [], // Corporate filings don't have personal filings
    corporateFiling: corporateFilingData ? transformCorporateFiling(corporateFilingData) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Corporate Filing Service - Wrapper class for T2 corporate tax filings
 */
export class CorporateFilingService {
  /**
   * Get a corporate filing by ID with its corporate data
   */
  static async getFiling(documentId: string): Promise<CorporateFilingWithData> {
    const response = await strapiClient.get<StrapiResponse<any>>(
      `/filings/${documentId}?populate[corporateFilings][populate]=*&populate[taxYear]=*&populate[filingType]=*&populate[filingStatus]=*`
    )
    return transformFilingWithCorporate(response.data.data)
  }

  /**
   * Initialize a new corporate filing
   * Creates the parent Filing and child CorporateFiling records
   */
  static async initFiling(year: number): Promise<{ filing: CorporateFilingWithData; corporateFiling: CorporateFiling }> {
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

      // Step 2: Get CORPORATE filing type ID
      const typeRes = await fetch(`${strapiUrl}/api/filing-types?filters[type][$eq]=CORPORATE`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!typeRes.ok) throw new Error('Failed to fetch filing type')
      const typeJson = await typeRes.json()
      if (!typeJson.data || typeJson.data.length === 0) throw new Error('Corporate filing type not found')
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
          entityName: "New Corporation",
          filingData: {}
        }
      })

      const filingId = filingRes.data.data.documentId || filingRes.data.data.id

      // Step 5: Create child CorporateFiling record
      const corpRes = await strapiClient.post<StrapiResponse<any>>("/corporate-filings", {
        data: {
          filing: filingId,
          formData: {},
          status: "DRAFT"
        }
      })
      const corporateFiling = transformCorporateFiling(corpRes.data.data)

      // Fetch the complete filing with the new CorporateFiling included
      const completeFiling = await this.getFiling(filingId)
      return { filing: completeFiling, corporateFiling }

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
   * Check if a corporate filing with the same business number already exists
   * Returns the existing filing if found, null otherwise
   */
  static async checkDuplicateBusinessNumber(
    businessNumber: string,
    excludeCorporateFilingId?: string
  ): Promise<{ exists: boolean; existingFilingId?: string; legalName?: string }> {
    if (!businessNumber) return { exists: false }

    // Normalize business number (remove spaces)
    const normalizedBN = businessNumber.replace(/\s+/g, '')

    try {
      // Query corporate filings with the same business number
      const response = await strapiClient.get<StrapiResponse<any[]>>(
        `/corporate-filings?filters[businessNumber][$containsi]=${normalizedBN}&populate[filing][populate]=taxYear`
      )

      const results = response.data.data || []

      console.log('[checkDuplicateBusinessNumber] Query results:', results.length, 'excludeId:', excludeCorporateFilingId)

      // Filter out the current filing being edited
      // Compare both documentId and id to handle different ID formats
      const duplicates = results.filter((cf: any) => {
        const cfDocumentId = cf.documentId
        const cfId = String(cf.id)
        const excludeId = excludeCorporateFilingId ? String(excludeCorporateFilingId) : null

        // Check if this is the same filing we're editing (by either ID format)
        const isSameFiling = excludeId && (cfDocumentId === excludeId || cfId === excludeId)

        console.log('[checkDuplicateBusinessNumber] Comparing:', { cfDocumentId, cfId, excludeId, isSameFiling })

        return !isSameFiling
      })

      if (duplicates.length > 0) {
        const duplicate = duplicates[0]
        return {
          exists: true,
          existingFilingId: duplicate.filing?.documentId || duplicate.filing?.id,
          legalName: duplicate.legalName
        }
      }

      return { exists: false }
    } catch (error) {
      console.error('[CorporateFilingService.checkDuplicateBusinessNumber] Error:', error)
      return { exists: false } // Don't block on error, let Strapi handle uniqueness
    }
  }

  /**
   * Save form data to a corporate filing
   * Maps form fields to both individual columns AND the formData JSON blob
   */
  static async saveFormData(corporateFilingId: string, data: Record<string, unknown>): Promise<CorporateFiling> {
    // Merge with existing formData
    const existingRes = await strapiClient.get<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`)
    const existingData = existingRes.data.data.formData || {}
    const existingBusinessNumber = existingRes.data.data.businessNumber

    // Check for duplicate business number if it's being set or changed
    const newBusinessNumber = data['corpInfo.businessNumber'] as string
    // Normalize both for comparison (remove spaces)
    const normalizedNew = newBusinessNumber?.replace(/\s+/g, '')
    const normalizedExisting = existingBusinessNumber?.replace(/\s+/g, '')

    // Check if business number is new or changed (case-insensitive comparison)
    const isNewOrChanged = normalizedNew &&
      (!normalizedExisting || normalizedNew.toLowerCase() !== normalizedExisting.toLowerCase())

    if (isNewOrChanged) {
      console.log('[saveFormData] Checking for duplicate BN:', { newBusinessNumber, existingBusinessNumber, isNewOrChanged })
      const duplicateCheck = await this.checkDuplicateBusinessNumber(newBusinessNumber, corporateFilingId)
      if (duplicateCheck.exists) {
        const msg = duplicateCheck.legalName
          ? `A corporate filing with this Business Number already exists for "${duplicateCheck.legalName}".`
          : 'A corporate filing with this Business Number already exists.'
        throw new Error(msg)
      }
    }

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

    // Helper to ensure JSON type (wrap strings in an object if needed)
    const cleanJson = (val: unknown): unknown => {
      if (val === '' || val === undefined || val === null) return null
      // If it's already an object/array, return as-is
      if (typeof val === 'object') return val
      // If it's a string (like a filename), wrap it in an object
      if (typeof val === 'string') return { filename: val }
      return val
    }

    // Build expenses object from individual expense fields
    const expensesData: Record<string, number | null> = {}
    const salaries = cleanDecimal(mergedFormData['financials.expenses.salaries'])
    const rent = cleanDecimal(mergedFormData['financials.expenses.rent'])
    const professionalFees = cleanDecimal(mergedFormData['financials.expenses.professionalFees'])

    if (salaries !== null) expensesData.salaries = salaries
    if (rent !== null) expensesData.rent = rent
    if (professionalFees !== null) expensesData.professionalFees = professionalFees

    // Only include expenses if we have any values
    const expenses = Object.keys(expensesData).length > 0 ? expensesData : null

    // Map form fields to individual columns
    // Form data comes in dot-notation like "corpInfo.legalName"
    const mappedData: Record<string, unknown> = {
      // Corporate Info - use merged data to ensure we have the latest values
      legalName: clean(mergedFormData['corpInfo.legalName']),
      businessNumber: clean(mergedFormData['corpInfo.businessNumber']),
      address: clean(mergedFormData['corpInfo.address']),
      incorporationDate: cleanDate(mergedFormData['corpInfo.incorporationDate']),
      fiscalYearEnd: cleanDate(mergedFormData['corpInfo.fiscalYearEnd']),

      // Shareholders (JSON array)
      shareholders: mergedFormData['shareholders'] || null,

      // Financials (decimal type - must be numbers)
      totalRevenue: cleanDecimal(mergedFormData['financials.totalRevenue']),
      netIncome: cleanDecimal(mergedFormData['financials.netIncome']),

      // Expenses (JSON object with individual expense types)
      expenses: expenses,

      // Financial Statements (JSON type - wrap string filenames in object)
      financialStatements: cleanJson(mergedFormData['documents.financialStatements']),

      // Always save the full merged form data as backup
      formData: mergedFormData
    }

    // Remove null fields to avoid overwriting existing data with null
    // But keep formData always
    const cleanedData: Record<string, unknown> = { formData: mergedFormData }
    for (const [key, value] of Object.entries(mappedData)) {
      if (key !== 'formData' && value !== null && value !== undefined) {
        cleanedData[key] = value
      }
    }

    console.log('[CorporateFilingService.saveFormData] Saving:', cleanedData)

    const response = await strapiClient.put<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`, {
      data: cleanedData
    })

    return transformCorporateFiling(response.data.data)
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
   * Submit corporate filing for review
   * Uses strict await and mutation to ensure duplicate check completes before submission
   */
  static async submitForReview(filingId: string): Promise<CorporateFilingWithData> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    // ============================================================
    // STEP 1: Get filing data (must complete before proceeding)
    // ============================================================
    console.log('[submitForReview] STEP 1: Getting filing data...')
    const filingData = await this.getFiling(filingId)
    const corporateFilingId = filingData.corporateFiling?.id || filingData.corporateFiling?.documentId

    if (!corporateFilingId) {
      throw new Error('Corporate filing data not found')
    }
    console.log('[submitForReview] STEP 1 COMPLETE: corporateFilingId =', corporateFilingId)

    // ============================================================
    // STEP 2: Get corporate filing details (must complete before proceeding)
    // ============================================================
    console.log('[submitForReview] STEP 2: Getting corporate filing details...')
    const corpFilingRes = await strapiClient.get<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`)
    const corpFilingData = corpFilingRes.data.data
    const businessNumber: string | undefined = corpFilingData.businessNumber
    const legalName: string | undefined = corpFilingData.legalName
    console.log('[submitForReview] STEP 2 COMPLETE: BN =', businessNumber, ', legalName =', legalName)

    // ============================================================
    // STEP 3: Validate required fields (synchronous check)
    // ============================================================
    console.log('[submitForReview] STEP 3: Validating required fields...')
    if (!businessNumber) {
      throw new Error('Business Number is required before submitting. Please complete the Identification section.')
    }
    if (!legalName) {
      throw new Error('Corporation Name is required before submitting. Please complete the Identification section.')
    }
    console.log('[submitForReview] STEP 3 COMPLETE: Required fields validated')

    // ============================================================
    // STEP 4: DUPLICATE CHECK - MUST COMPLETE BEFORE ANY MUTATION
    // This is a blocking operation - submission cannot proceed until
    // we have confirmed no duplicates exist
    // ============================================================
    console.log('[submitForReview] STEP 4: Starting duplicate check (BLOCKING)...')

    // Mutable flag - will be set based on search results
    let duplicateCheckPassed = false
    let duplicateErrorMessage: string | null = null

    // Normalize values for search
    const normalizedBN = businessNumber.replace(/\s+/g, '')

    // Build query - search for BN OR legal name matches
    const searchQuery = `/corporate-filings?filters[$or][0][businessNumber][$containsi]=${encodeURIComponent(normalizedBN)}&filters[$or][1][legalName][$eqi]=${encodeURIComponent(legalName)}&populate[filing][fields]=documentId,id`

    console.log('[submitForReview] STEP 4: Executing search query:', searchQuery)

    // Execute the search and WAIT for results
    const searchResponse = await strapiClient.get<StrapiResponse<any[]>>(searchQuery)
    const searchResults = searchResponse.data.data || []

    console.log('[submitForReview] STEP 4: Search returned', searchResults.length, 'results')

    // Process results - filter out current filing
    const duplicates = searchResults.filter((cf: any) => {
      const cfDocId = cf.documentId
      const cfNumId = String(cf.id)
      const currentId = String(corporateFilingId)

      // Exclude current filing (match on either ID format)
      const isCurrent = cfDocId === currentId || cfNumId === currentId

      console.log('[submitForReview] STEP 4: Comparing filing:', { cfDocId, cfNumId, currentId, isCurrent })

      return !isCurrent
    })

    console.log('[submitForReview] STEP 4: Found', duplicates.length, 'potential duplicates after filtering')

    // Check for actual duplicates
    if (duplicates.length > 0) {
      const dup = duplicates[0]
      const dupBN = dup.businessNumber
      const dupName = dup.legalName

      // Determine which field matched
      if (dupBN && dupBN.replace(/\s+/g, '').toLowerCase() === normalizedBN.toLowerCase()) {
        duplicateErrorMessage = `A corporate filing with Business Number "${businessNumber}" already exists${dupName ? ` for "${dupName}"` : ''}. Please use a unique Business Number or edit the existing filing.`
      } else if (dupName && dupName.toLowerCase() === legalName.toLowerCase()) {
        duplicateErrorMessage = `A corporate filing for "${legalName}" already exists. Please use a unique corporation name or edit the existing filing.`
      } else {
        duplicateErrorMessage = 'A corporate filing with the same Business Number or Corporation Name already exists.'
      }

      console.log('[submitForReview] STEP 4 FAILED: Duplicate found -', duplicateErrorMessage)
      duplicateCheckPassed = false
    } else {
      console.log('[submitForReview] STEP 4 PASSED: No duplicates found')
      duplicateCheckPassed = true
    }

    // ============================================================
    // STEP 5: GATE - Only proceed if duplicate check passed
    // ============================================================
    if (!duplicateCheckPassed) {
      console.log('[submitForReview] STEP 5: BLOCKED - Throwing duplicate error')
      throw new Error(duplicateErrorMessage || 'A duplicate corporate filing already exists.')
    }
    console.log('[submitForReview] STEP 5: Gate passed, proceeding to submission')

    // ============================================================
    // STEP 6: Get status ID for UNDER_REVIEW (must complete before mutation)
    // ============================================================
    console.log('[submitForReview] STEP 6: Getting UNDER_REVIEW status ID...')
    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!statusRes.ok) throw new Error('Failed to fetch status')
    const statusJson = await statusRes.json()
    const statusId = statusJson.data?.[0]?.id

    if (!statusId) throw new Error('UNDER_REVIEW status not found')
    console.log('[submitForReview] STEP 6 COMPLETE: statusId =', statusId)

    // ============================================================
    // STEP 7: Generate confirmation number (synchronous)
    // ============================================================
    const confirmationNumber = this.generateReferenceNumber()
    console.log('[submitForReview] STEP 7: Generated confirmationNumber =', confirmationNumber)

    // ============================================================
    // STEP 8: Mark corporate filing as COMPLETED (mutation)
    // ============================================================
    console.log('[submitForReview] STEP 8: Marking corporate filing as COMPLETED...')
    await this.markCorporateFilingComplete(corporateFilingId)
    console.log('[submitForReview] STEP 8 COMPLETE')

    // ============================================================
    // STEP 9: Update parent filing status (final mutation)
    // ============================================================
    console.log('[submitForReview] STEP 9: Updating parent filing status...')
    const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: {
        filingStatus: statusId,
        confirmationNumber,
        submittedAt: new Date().toISOString()
      }
    })
    console.log('[submitForReview] STEP 9 COMPLETE: Filing submitted successfully')

    // Return filing with the confirmation number set
    const filing = transformFilingWithCorporate(response.data.data)
    filing.referenceNumber = confirmationNumber
    return filing
  }

  /**
   * Mark corporate filing child as complete
   */
  static async markCorporateFilingComplete(corporateFilingId: string): Promise<CorporateFiling> {
    const response = await strapiClient.put<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`, {
      data: { status: 'COMPLETED' }
    })
    return transformCorporateFiling(response.data.data)
  }
}
