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
  corporateFilingStatus: 'DRAFT' | 'COMPLETED' | 'FLAGGED' | 'VERIFIED'
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
  const corporateFilingStatus = data.corporateFilingStatus || 'DRAFT'
  return {
    id,
    documentId: id,
    filingId: data.filing?.documentId || data.filing?.id || data.filing,
    formData: data.formData || {},
    corporateFilingStatus: corporateFilingStatus,
    isComplete: corporateFilingStatus === 'COMPLETED',
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
    paidAmount: data.paidAmount || 0,
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
    console.log('[CorporateFilingService.getFiling] Fetching filing:', documentId)
    const response = await strapiClient.get<StrapiResponse<any>>(
      `/filings/${documentId}?populate[corporateFilings][populate]=*&populate[taxYear]=*&populate[filingType]=*&populate[filingStatus]=*`
    )
    console.log('[CorporateFilingService.getFiling] Raw response taxYear:', JSON.stringify(response.data.data?.taxYear))
    const result = transformFilingWithCorporate(response.data.data)
    console.log('[CorporateFilingService.getFiling] Transformed year:', result.year)
    return result
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
          corporateFilingStatus: "DRAFT"
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
   * for the current user in the specified tax year.
   * Returns details about the existing filing if found.
   */
  static async checkDuplicateBusinessNumber(
    businessNumber: string,
    taxYear: number,
    excludeCorporateFilingId?: string
  ): Promise<{
    exists: boolean
    existingFilingId?: string
    legalName?: string
    filingStatus?: string
    corporateFilingStatus?: string
  }> {
    if (!businessNumber) return { exists: false }

    // Normalize business number (remove spaces for comparison)
    const normalizedBN = businessNumber.replace(/\s+/g, '')

    console.log('[checkDuplicateBusinessNumber] Starting check:', {
      businessNumber,
      normalizedBN,
      taxYear,
      excludeCorporateFilingId
    })

    try {
      // Query CORPORATE type filings and then fetch their corporate-filing children
      console.log('[checkDuplicateBusinessNumber] Querying CORPORATE filings...')

      // Step 1: Get all CORPORATE type filings for this user
      const filingsResponse = await strapiClient.get<StrapiResponse<any[]>>(
        `/filings?populate[taxYear]=*&populate[filingStatus]=*&populate[filingType]=*`
      )

      const allFilings = filingsResponse.data.data || []
      console.log('[checkDuplicateBusinessNumber] Total filings from API:', allFilings.length)

      // Filter to CORPORATE type only
      const corporateFilings = allFilings.filter((f: any) => {
        const filingType = f.filingType?.type || f.filingType
        return filingType === 'CORPORATE'
      })

      console.log('[checkDuplicateBusinessNumber] CORPORATE filings found:', corporateFilings.length)

      // Step 2: For each corporate filing, fetch the corporate-filing child record
      const results: any[] = []

      for (const filing of corporateFilings) {
        try {
          // Query corporate-filings by parent filing documentId
          const corpFilingResponse = await strapiClient.get<StrapiResponse<any[]>>(
            `/corporate-filings?filters[filing][documentId][$eq]=${filing.documentId}`
          )

          const corpFilingData = corpFilingResponse.data.data
          if (corpFilingData && corpFilingData.length > 0) {
            const cf = corpFilingData[0]
            results.push({
              ...cf,
              filing: {
                documentId: filing.documentId,
                id: filing.id,
                taxYear: filing.taxYear,
                filingStatus: filing.filingStatus
              }
            })
            console.log(`[checkDuplicateBusinessNumber] Found corporate-filing for ${filing.documentId}: BN="${cf.businessNumber}", legalName="${cf.legalName}"`)
          } else {
            console.log(`[checkDuplicateBusinessNumber] No corporate-filing found for filing ${filing.documentId}`)
          }
        } catch (err) {
          console.warn(`[checkDuplicateBusinessNumber] Error fetching corporate-filing for ${filing.documentId}:`, err)
        }
      }

      console.log('[checkDuplicateBusinessNumber] Total corporate filings with data:', results.length)

      // Log ALL corporate filings with their business numbers and years for debugging
      results.forEach((cf: any, idx: number) => {
        const cfBN = cf.businessNumber || '(none)'
        const cfYear = cf.filing?.taxYear?.year || cf.filing?.taxYear || '(no year)'
        const cfDocId = cf.documentId || cf.id
        console.log(`[checkDuplicateBusinessNumber] Filing ${idx}: docId=${cfDocId}, BN="${cfBN}", year=${cfYear}, legalName="${cf.legalName || '(none)'}"`);
        // Log the full filing object to see if relations are populated
        console.log(`[checkDuplicateBusinessNumber] Filing ${idx} full data:`, JSON.stringify({
          documentId: cf.documentId,
          id: cf.id,
          businessNumber: cf.businessNumber,
          legalName: cf.legalName,
          filing: cf.filing ? {
            documentId: cf.filing.documentId,
            id: cf.filing.id,
            taxYear: cf.filing.taxYear,
            filingStatus: cf.filing.filingStatus
          } : null
        }))
      })

      // Filter results:
      // 1. Match business number (normalized, case-insensitive)
      // 2. Exclude the current filing being edited
      // 3. Only include filings for the same tax year
      console.log('[checkDuplicateBusinessNumber] Starting filter with excludeId:', excludeCorporateFilingId, 'normalizedBN:', normalizedBN, 'taxYear:', taxYear)

      const duplicates = results.filter((cf: any) => {
        const cfDocumentId = cf.documentId
        const cfId = String(cf.id)
        const excludeId = excludeCorporateFilingId ? String(excludeCorporateFilingId) : null

        console.log('[checkDuplicateBusinessNumber] Checking filing:', {
          cfDocumentId,
          cfId,
          excludeId,
          cfBusinessNumber: cf.businessNumber
        })

        // Check if this is the same filing we're editing (by either ID format)
        const isSameFiling = excludeId && (cfDocumentId === excludeId || cfId === excludeId)
        if (isSameFiling) {
          console.log('[checkDuplicateBusinessNumber] Skipping same filing:', cfDocumentId)
          return false
        }

        // Check business number match (normalize both for comparison)
        const cfBusinessNumber = cf.businessNumber || ''
        const cfNormalizedBN = cfBusinessNumber.replace(/\s+/g, '')
        const bnMatches = cfNormalizedBN.toLowerCase() === normalizedBN.toLowerCase()

        console.log('[checkDuplicateBusinessNumber] BN comparison:', {
          cfBusinessNumber,
          cfNormalizedBN,
          normalizedBN,
          bnMatches
        })

        if (!bnMatches) {
          return false
        }

        // Check if the filing is for the same tax year
        const filingYear = cf.filing?.taxYear?.year || cf.filing?.taxYear
        const isSameYear = Number(filingYear) === Number(taxYear)

        // SAFETY: If we can't determine the year (relation not populated),
        // still flag as duplicate to be safe - better to block than allow duplicates
        const yearUnavailable = !filingYear && taxYear
        const shouldBlock = isSameYear || yearUnavailable

        console.log('[checkDuplicateBusinessNumber] Found BN match:', {
          cfDocumentId,
          cfBusinessNumber,
          cfNormalizedBN,
          filingYear,
          taxYear,
          isSameYear,
          yearUnavailable,
          shouldBlock,
          legalName: cf.legalName
        })

        // If year is unavailable, warn but still block
        if (yearUnavailable) {
          console.warn('[checkDuplicateBusinessNumber] WARNING: Could not determine filing year for duplicate check. Blocking as safety measure.')
        }

        return shouldBlock
      })

      console.log('[checkDuplicateBusinessNumber] Duplicates found:', duplicates.length)

      if (duplicates.length > 0) {
        const duplicate = duplicates[0]
        const filingStatus = duplicate.filing?.filingStatus?.statusCode ||
                            duplicate.filing?.filingStatus?.code ||
                            'UNKNOWN'

        console.log('[checkDuplicateBusinessNumber] Returning duplicate:', {
          existingFilingId: duplicate.filing?.documentId || duplicate.filing?.id,
          legalName: duplicate.legalName,
          filingStatus,
          corporateFilingStatus: duplicate.corporateFilingStatus
        })

        return {
          exists: true,
          existingFilingId: duplicate.filing?.documentId || duplicate.filing?.id,
          legalName: duplicate.legalName,
          filingStatus: filingStatus,
          corporateFilingStatus: duplicate.corporateFilingStatus
        }
      }

      console.log('[checkDuplicateBusinessNumber] No duplicates found')
      return { exists: false }
    } catch (error) {
      console.error('[CorporateFilingService.checkDuplicateBusinessNumber] Error:', error)
      return { exists: false } // Don't block on error, let Strapi handle uniqueness
    }
  }

  /**
   * Get a user-friendly error message for duplicate business number
   */
  static getDuplicateErrorMessage(
    businessNumber: string,
    taxYear: number,
    filingStatus?: string,
    legalName?: string
  ): string {
    const bnDisplay = businessNumber || 'this Business Number'
    const nameInfo = legalName ? ` for "${legalName}"` : ''

    switch (filingStatus) {
      case 'IN_PROGRESS':
        return `A ${taxYear} corporate filing${nameInfo} with Business Number ${bnDisplay} is already in progress. Please continue with the existing filing or delete it to start a new one.`
      case 'UNDER_REVIEW':
        return `A ${taxYear} corporate filing${nameInfo} with Business Number ${bnDisplay} is already under review. Please wait for the review to complete before creating a new filing.`
      case 'COMPLETED':
      case 'APPROVED':
        return `A ${taxYear} corporate filing${nameInfo} with Business Number ${bnDisplay} has already been completed. You cannot create another filing for the same business number in the same tax year.`
      case 'FLAGGED':
        return `A ${taxYear} corporate filing${nameInfo} with Business Number ${bnDisplay} has been flagged for review. Please address the issues with the existing filing before creating a new one.`
      default:
        return `A ${taxYear} corporate filing${nameInfo} with Business Number ${bnDisplay} already exists. Only one filing per business number per tax year is allowed.`
    }
  }

  /**
   * Save form data to a corporate filing
   * Maps form fields to both individual columns AND the formData JSON blob
   */
  static async saveFormData(corporateFilingId: string, data: Record<string, unknown>): Promise<CorporateFiling> {
    // Merge with existing formData - also get the filing relation to check tax year
    const existingRes = await strapiClient.get<StrapiResponse<any>>(
      `/corporate-filings/${corporateFilingId}?populate[filing][populate]=taxYear`
    )
    const existingData = existingRes.data.data.formData || {}
    const existingBusinessNumber = existingRes.data.data.businessNumber
    // Preserve existing status, default to DRAFT if not set
    const existingStatus = existingRes.data.data.corporateFilingStatus || 'DRAFT'
    // Get tax year from the parent filing
    const taxYear = existingRes.data.data.filing?.taxYear?.year ||
                    existingRes.data.data.filing?.taxYear ||
                    new Date().getFullYear()

    // Check for duplicate business number if it's being set or changed
    const newBusinessNumber = data['corpInfo.businessNumber'] as string
    // Normalize both for comparison (remove spaces)
    const normalizedNew = newBusinessNumber?.replace(/\s+/g, '')
    const normalizedExisting = existingBusinessNumber?.replace(/\s+/g, '')

    // Check if business number is new or changed (case-insensitive comparison)
    const isNewOrChanged = normalizedNew &&
      (!normalizedExisting || normalizedNew.toLowerCase() !== normalizedExisting.toLowerCase())

    console.log('[saveFormData] BN check details:', {
      newBusinessNumber,
      existingBusinessNumber,
      normalizedNew,
      normalizedExisting,
      isNewOrChanged,
      taxYear,
      corporateFilingId
    })

    if (isNewOrChanged) {
      console.log('[saveFormData] BN is new or changed - checking for duplicates...')
      const duplicateCheck = await this.checkDuplicateBusinessNumber(newBusinessNumber, Number(taxYear), corporateFilingId)
      console.log('[saveFormData] Duplicate check result:', duplicateCheck)
      if (duplicateCheck.exists) {
        // Use the status-aware error message
        const msg = this.getDuplicateErrorMessage(
          newBusinessNumber,
          Number(taxYear),
          duplicateCheck.filingStatus,
          duplicateCheck.legalName
        )
        console.log('[saveFormData] BLOCKING - Duplicate found:', msg)
        throw new Error(msg)
      }
      console.log('[saveFormData] No duplicate found - proceeding with save')
    } else {
      console.log('[saveFormData] BN unchanged or empty - skipping duplicate check')
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

      // Expenses (individual decimal fields instead of JSON)
      expensesSalaries: cleanDecimal(mergedFormData['financials.expenses.salaries']),
      expensesRent: cleanDecimal(mergedFormData['financials.expenses.rent']),
      expensesProfessionalFees: cleanDecimal(mergedFormData['financials.expenses.professionalFees']),
      expensesOther: cleanDecimal(mergedFormData['financials.expenses.other']),

      // Financial Statements (JSON type - wrap string filenames in object)
      financialStatements: cleanJson(mergedFormData['documents.financialStatements']),

      // Always save the full merged form data as backup
      formData: mergedFormData
    }

    // Remove null fields to avoid overwriting existing data with null
    // But keep formData and corporateFilingStatus always
    const cleanedData: Record<string, unknown> = {
      formData: mergedFormData,
      // Always preserve/set corporateFilingStatus to prevent it from being cleared
      corporateFilingStatus: existingStatus
    }
    for (const [key, value] of Object.entries(mappedData)) {
      if (key !== 'formData' && value !== null && value !== undefined) {
        cleanedData[key] = value
      }
    }

    // Explicitly remove any keys that are not in the schema
    // This prevents validation errors from old/stale keys in formData
    const schemaFields = [
      'legalName', 'businessNumber', 'address', 'incorporationDate', 'fiscalYearEnd',
      'shareholders', 'totalRevenue', 'netIncome',
      'expensesSalaries', 'expensesRent', 'expensesProfessionalFees', 'expensesOther',
      'financialStatements', 'formData', 'corporateFilingStatus'
    ]
    const finalData: Record<string, unknown> = {}
    for (const key of schemaFields) {
      if (cleanedData[key] !== undefined) {
        finalData[key] = cleanedData[key]
      }
    }

    console.log('[CorporateFilingService.saveFormData] Saving to:', corporateFilingId)
    console.log('[CorporateFilingService.saveFormData] Final data keys:', Object.keys(finalData))
    console.log('[CorporateFilingService.saveFormData] Status being saved:', finalData.corporateFilingStatus)

    const response = await strapiClient.put<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`, {
      data: finalData
    })

    console.log('[CorporateFilingService.saveFormData] Response status:', response.data.data?.corporateFilingStatus)

    // VERIFICATION: Fetch the record again to confirm it was actually persisted
    const verifyRes = await strapiClient.get<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`)
    console.log('[CorporateFilingService.saveFormData] VERIFY - Fetched status after save:', verifyRes.data.data?.corporateFilingStatus)

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
    // Prefer documentId for Strapi v5
    const corporateFilingId = filingData.corporateFiling?.documentId || filingData.corporateFiling?.id

    if (!corporateFilingId) {
      throw new Error('Corporate filing data not found')
    }
    console.log('[submitForReview] STEP 1 COMPLETE: corporateFilingId =', corporateFilingId)
    console.log('[submitForReview] STEP 1: Full corporateFiling data:', JSON.stringify(filingData.corporateFiling, null, 2))

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
    // Check if another filing exists for same business number in same tax year
    // ============================================================
    console.log('[submitForReview] STEP 4: Starting duplicate check (BLOCKING)...')
    console.log('[submitForReview] STEP 4: Checking BN:', businessNumber, 'for year:', filingData.year)

    const duplicateCheck = await this.checkDuplicateBusinessNumber(
      businessNumber,
      filingData.year,
      corporateFilingId
    )

    if (duplicateCheck.exists) {
      const duplicateErrorMessage = this.getDuplicateErrorMessage(
        businessNumber,
        filingData.year,
        duplicateCheck.filingStatus,
        duplicateCheck.legalName
      )
      console.log('[submitForReview] STEP 4 FAILED: Duplicate found -', duplicateErrorMessage)
      throw new Error(duplicateErrorMessage)
    }
    console.log('[submitForReview] STEP 4 PASSED: No duplicates found')

    // ============================================================
    // STEP 5: Get status ID for UNDER_REVIEW (must complete before mutation)
    // ============================================================
    console.log('[submitForReview] STEP 5: Getting UNDER_REVIEW status ID...')
    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!statusRes.ok) throw new Error('Failed to fetch status')
    const statusJson = await statusRes.json()
    const statusId = statusJson.data?.[0]?.id

    if (!statusId) throw new Error('UNDER_REVIEW status not found')
    console.log('[submitForReview] STEP 5 COMPLETE: statusId =', statusId)

    // ============================================================
    // STEP 6: Use existing confirmation number or generate new one
    // For reopened filings (amendments), preserve the original confirmation number
    // ============================================================
    const existingConfirmationNumber = (filingData as any).referenceNumber
    const confirmationNumber = existingConfirmationNumber || this.generateReferenceNumber()
    console.log('[submitForReview] STEP 6: confirmationNumber =', confirmationNumber, existingConfirmationNumber ? '(preserved existing)' : '(newly generated)')

    // ============================================================
    // STEP 7: Mark corporate filing as COMPLETED (mutation)
    // ============================================================
    console.log('[submitForReview] STEP 7: Marking corporate filing as COMPLETED...')
    await this.markCorporateFilingComplete(corporateFilingId)
    console.log('[submitForReview] STEP 7 COMPLETE')

    // ============================================================
    // STEP 8: Update parent filing status, confirmation number, totalPrice, and paidAmount
    // When submitting (new or amendment), paidAmount = totalPrice because user pays the full amount
    // After submission, paidAmount reflects what they've now paid in total
    // ============================================================
    console.log('[submitForReview] STEP 8: Updating parent filing status...')

    // Get the current total price from the filing
    const totalPrice = (filingData as any).totalPrice || 0

    // After submission, paidAmount should equal totalPrice (user has paid for this filing)
    const paidAmount = totalPrice

    console.log('[submitForReview] STEP 8: totalPrice =', totalPrice, ', paidAmount =', paidAmount)

    const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: {
        filingStatus: statusId,
        confirmationNumber,
        totalPrice,
        paidAmount,
        submittedAt: new Date().toISOString()
      }
    })
    console.log('[submitForReview] STEP 8 COMPLETE: Filing submitted successfully')

    // Return filing with the confirmation number set
    const filing = transformFilingWithCorporate(response.data.data)
    filing.referenceNumber = confirmationNumber
    return filing
  }

  /**
   * Mark corporate filing child as complete
   */
  static async markCorporateFilingComplete(corporateFilingId: string): Promise<CorporateFiling> {
    console.log('[markCorporateFilingComplete] Updating corporate filing:', corporateFilingId, 'with corporateFilingStatus: COMPLETED')

    const response = await strapiClient.put<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`, {
      data: { corporateFilingStatus: 'COMPLETED' }
    })

    console.log('[markCorporateFilingComplete] Response status:', response.data.data?.corporateFilingStatus)

    // VERIFICATION: Fetch the record again to confirm it was actually persisted
    const verifyRes = await strapiClient.get<StrapiResponse<any>>(`/corporate-filings/${corporateFilingId}`)
    console.log('[markCorporateFilingComplete] VERIFY - Fetched status after update:', verifyRes.data.data?.corporateFilingStatus)

    return transformCorporateFiling(response.data.data)
  }
}
