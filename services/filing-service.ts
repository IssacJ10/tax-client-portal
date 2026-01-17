// tax-client-portal/services/filing-service.ts

import { strapiClient, type StrapiResponse } from "./strapi-client"
import type { Filing, PersonalFiling, FilingRole, FilingType, FilingStatus } from "@/lib/domain/types"

/**
 * Mutex implementation preserved from original project
 * Serializes family member additions to prevent Strapi race conditions.
 */
class AsyncMutex {
  private locked = false
  private queue: (() => void)[] = []

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        const next = this.queue.shift()
        if (next) next()
        else this.locked = false
      }
      if (this.locked) {
        this.queue.push(() => { this.locked = true; resolve(release) })
      } else {
        this.locked = true
        resolve(release)
      }
    })
  }
}

const familyMemberMutex = new AsyncMutex()

// --- Transformers ---

function transformFiling(data: any): Filing & { corporateFiling?: any; trustFiling?: any } {
  // Support for both Strapi v4 (id) and v5 (documentId) response formats
  const filingId = data.documentId || data.id || String(data.id)
  const taxYear = typeof data.taxYear === 'object' ? data.taxYear?.year : data.taxYear;

  // Handle different Strapi response formats for personalFilings
  let personalFilingsData = data.personalFilings;
  // Strapi v5 might wrap relations in a data property
  if (personalFilingsData?.data) {
    personalFilingsData = personalFilingsData.data;
  }
  // Ensure it's an array
  if (!Array.isArray(personalFilingsData)) {
    personalFilingsData = [];
  }

  // Handle corporate filing (singular - oneToOne relation)
  let corporateFilingData = data.corporateFiling || data.corporateFilings;
  if (corporateFilingData?.data) {
    corporateFilingData = corporateFilingData.data;
  }
  // Get first corporate filing if it's an array (shouldn't be, but handle gracefully)
  if (Array.isArray(corporateFilingData)) {
    corporateFilingData = corporateFilingData[0];
  }
  // Transform corporate filing if present
  const corporateFiling = corporateFilingData ? {
    id: corporateFilingData.documentId || corporateFilingData.id,
    documentId: corporateFilingData.documentId || corporateFilingData.id,
    formData: corporateFilingData.formData || {},
    corporateFilingStatus: corporateFilingData.corporateFilingStatus || 'DRAFT',
    isComplete: corporateFilingData.corporateFilingStatus === 'COMPLETED',
    createdAt: corporateFilingData.createdAt,
    updatedAt: corporateFilingData.updatedAt,
  } : undefined;

  // Handle trust filing (singular - oneToOne relation)
  let trustFilingData = data.trustFiling || data.trustFilings;
  if (trustFilingData?.data) {
    trustFilingData = trustFilingData.data;
  }
  // Get first trust filing if it's an array (shouldn't be, but handle gracefully)
  if (Array.isArray(trustFilingData)) {
    trustFilingData = trustFilingData[0];
  }
  const trustFiling = trustFilingData ? {
    id: trustFilingData.documentId || trustFilingData.id,
    documentId: trustFilingData.documentId || trustFilingData.id,
    formData: trustFilingData.formData || {},
    trustFilingStatus: trustFilingData.trustFilingStatus || 'DRAFT',
    isComplete: trustFilingData.trustFilingStatus === 'COMPLETED',
    createdAt: trustFilingData.createdAt,
    updatedAt: trustFilingData.updatedAt,
  } : undefined;

  // Determine filing type from filingType relation
  // Debug: Log what we're getting from Strapi
  console.log('[transformFiling] Raw filingType data:', JSON.stringify(data.filingType, null, 2))
  console.log('[transformFiling] data.type:', data.type)
  console.log('[transformFiling] Has corporateFiling:', !!corporateFiling)
  console.log('[transformFiling] Has trustFiling:', !!trustFiling)

  // Handle various Strapi response formats for filingType
  let filingTypeData = data.filingType
  // Strapi v5 may wrap in .data
  if (filingTypeData?.data) {
    filingTypeData = filingTypeData.data
  }

  // filingType may have: type (enum), displayName ("T2 Corporate Tax Filing"), code, etc.
  // Check displayName to infer type if needed
  let filingTypeCode = filingTypeData?.type || filingTypeData?.code || data.type;

  // If we got displayName instead of type enum, try to infer from it
  if (!filingTypeCode && filingTypeData?.displayName) {
    const displayName = filingTypeData.displayName.toLowerCase()
    if (displayName.includes('corporate') || displayName.includes('t2')) {
      filingTypeCode = 'CORPORATE'
    } else if (displayName.includes('trust') || displayName.includes('t3')) {
      filingTypeCode = 'TRUST'
    } else if (displayName.includes('personal') || displayName.includes('t1')) {
      filingTypeCode = 'PERSONAL'
    }
    console.log('[transformFiling] Inferred type from displayName:', filingTypeCode)
  }

  // Fallback: Infer type from child filings if filingType relation is not populated
  if (!filingTypeCode) {
    if (corporateFiling) {
      filingTypeCode = 'CORPORATE'
    } else if (trustFiling) {
      filingTypeCode = 'TRUST'
    } else {
      filingTypeCode = 'PERSONAL'
    }
    console.log('[transformFiling] Inferred type from child filings:', filingTypeCode)
  }

  console.log('[transformFiling] Resolved filingTypeCode:', filingTypeCode)

  const normalizedType = filingTypeCode === 'PERSONAL' ? 'INDIVIDUAL' : filingTypeCode;

  return {
    id: filingId,
    documentId: filingId,
    referenceNumber: data.confirmationNumber || data.referenceNumber || undefined,
    year: Number(taxYear) || 2025,
    type: (normalizedType || 'INDIVIDUAL') as FilingType,
    status: (data.status || data.filingStatus?.statusCode || data.filingStatus?.code || 'DRAFT') as FilingStatus,
    totalPrice: data.totalPrice || 0,
    personalFilings: personalFilingsData.map(transformPersonalFiling),
    wizardProgress: data.wizardProgress || undefined,
    corporateFiling,
    trustFiling,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function transformPersonalFiling(data: any): PersonalFiling {
  // Handle both Strapi v4 (id) and v5 (documentId) response formats
  const id = data.documentId || data.id || String(data.id)
  return {
    id,
    documentId: id,
    type: (data.type || 'primary') as FilingRole,
    formData: data.formData || {},
    isComplete: data.individualStatus === 'COMPLETED',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

// Helper: Transform component fields, converting YES/NO strings to booleans
// This handles fields that Strapi expects as boolean but come from radio buttons as "YES"/"NO"
function transformComponentWithBooleans(
  obj: any,
  toBool: (val: any) => boolean | null,
  clean: (val: any) => any
): any {
  if (!obj || typeof obj !== 'object') return clean(obj)

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    // Check if value is YES/NO string that should be boolean
    if (value === 'YES' || value === 'NO' || value === 'Yes' || value === 'No') {
      result[key] = toBool(value)
    } else if (Array.isArray(value)) {
      // Keep arrays as-is but clean them
      result[key] = value.map(item =>
        typeof item === 'object' ? transformComponentWithBooleans(item, toBool, clean) : clean(item)
      )
    } else if (typeof value === 'object' && value !== null) {
      // Recursively transform nested objects
      result[key] = transformComponentWithBooleans(value, toBool, clean)
    } else {
      result[key] = clean(value)
    }
  }
  return result
}

// Helper: Transform selfEmployment component specifically
// Handles boolean fields and repeater arrays (capitalAssets, etc.)
// Only includes fields that are actually present in the input data
function transformSelfEmployment(
  obj: any,
  toBool: (val: any) => boolean | null,
  clean: (val: any) => any
): any {
  if (!obj) return undefined

  // Fields that should be converted to boolean
  const booleanFields = ['gstRegistered', 'hasCapitalAssets']
  // Fields that are repeater arrays
  const arrayFields = ['capitalAssets', 'expenseCategories']

  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined/null values to avoid sending extra fields to Strapi
    if (value === undefined) continue

    if (booleanFields.includes(key)) {
      // Convert YES/NO to boolean
      result[key] = toBool(value)
    } else if (arrayFields.includes(key)) {
      // Ensure arrays are properly formatted
      result[key] = Array.isArray(value) ? ensureArray(value, clean) : null
    } else if (value === 'YES' || value === 'NO') {
      // Convert any other YES/NO strings to boolean
      result[key] = toBool(value)
    } else {
      // Clean other values
      result[key] = clean(value)
    }
  }

  return result
}

// Helper: Transform rentalIncome component specifically
// Only includes fields that are actually present in the input data
function transformRentalIncome(
  obj: any,
  toBool: (val: any) => boolean | null,
  clean: (val: any) => any
): any {
  if (!obj) return undefined

  // Fields that should be converted to boolean
  const booleanFields = ['hasRentalIncome', 'coOwned']
  // Fields that are repeater arrays
  const arrayFields = ['properties']

  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values to avoid sending extra fields to Strapi
    if (value === undefined) continue

    if (booleanFields.includes(key)) {
      result[key] = toBool(value)
    } else if (arrayFields.includes(key)) {
      result[key] = Array.isArray(value) ? ensureArray(value, clean) : null
    } else if (value === 'YES' || value === 'NO') {
      result[key] = toBool(value)
    } else if (Array.isArray(value)) {
      result[key] = ensureArray(value, clean)
    } else {
      result[key] = clean(value)
    }
  }

  return result
}

// Helper: Ensure value is an array (for repeater fields)
// If it's a string (from incorrect text input), wrap it or return empty array
function ensureArray(value: any, clean: (val: any) => any): any[] | null {
  if (!value) return null
  if (Array.isArray(value)) {
    // Clean each item in the array
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        // Clean object properties
        const cleanedItem: any = {}
        for (const [k, v] of Object.entries(item)) {
          cleanedItem[k] = clean(v)
        }
        return cleanedItem
      }
      return clean(item)
    })
  }
  // If it's a non-empty string (user typed in text input instead of repeater)
  // This shouldn't happen with proper repeater UI, but handle gracefully
  if (typeof value === 'string' && value.trim()) {
    return [{ name: value.trim() }]
  }
  return null
}

export const FilingService = {

  /**
   * Get all available tax years from the backend
   */
  async getTaxYears(): Promise<{ id: string; year: number }[]> {
    const response = await strapiClient.get<StrapiResponse<any[]>>(
      `/tax-years?sort=year:desc`
    )
    const years = response.data.data || []
    return years.map((y: any) => ({
      id: y.documentId || y.id,
      year: y.year
    }))
  },

  /**
   * Get all filings for the current user
   * Includes all relations needed for dashboard display
   * @param year - Optional year filter
   */
  async getFilings(year?: number): Promise<Filing[]> {
    const populateQuery = [
      'populate[filingType]=true',
      'populate[filingStatus]=true',
      'populate[taxYear]=true',
      'populate[personalFilings]=true',
      'populate[corporateFiling]=true',
      'populate[trustFiling]=true'
    ].join('&')

    let url = `/filings?${populateQuery}&sort[0]=updatedAt:desc`

    // Add year filter if provided
    if (year) {
      url += `&filters[taxYear][year][$eq]=${year}`
    }

    const response = await strapiClient.get<StrapiResponse<any[]>>(url)

    const filings = response.data.data || []
    return filings.map(transformFiling)
  },

  async getFiling(documentId: string): Promise<Filing> {
    // Strapi v5 requires explicit populate for relations
    // Using deep populate syntax to ensure all child filings are included with their formData
    const populateQuery = [
      'populate[filingType]=true',
      'populate[filingStatus]=true',
      'populate[taxYear]=true',
      'populate[personalFilings][populate]=*',
      'populate[corporateFiling][populate]=*',
      'populate[trustFiling][populate]=*',
      'populate[user]=true'
    ].join('&')

    const response = await strapiClient.get<StrapiResponse<any>>(
      `/filings/${documentId}?${populateQuery}`
    )
    // Debug: Log the full raw response from Strapi
    console.log('[getFiling] Full Strapi response:', JSON.stringify(response.data.data, null, 2))
    return transformFiling(response.data.data)
  },

  async initFiling(year: number, type: FilingType = "INDIVIDUAL"): Promise<{ filing: Filing; primaryFiling: PersonalFiling }> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null;

    if (!token) throw new Error('No authentication token');

    try {
      // Step 1: Get tax year ID
      const yearRes = await fetch(`${strapiUrl}/api/tax-years?filters[year][$eq]=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!yearRes.ok) throw new Error('Failed to fetch tax year configuration');
      const yearJson = await yearRes.json();
      if (!yearJson.data || yearJson.data.length === 0) throw new Error(`Tax Year ${year} not configured.`);
      const taxYearId = yearJson.data[0].id;

      // Step 2: Get filing type ID (using 'primary' for INDIVIDUAL filings)
      const typeCode = type === "INDIVIDUAL" ? "PERSONAL" : type;
      const typeRes = await fetch(`${strapiUrl}/api/filing-types?filters[type][$eq]=${typeCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!typeRes.ok) throw new Error('Failed to fetch filing type');
      const typeJson = await typeRes.json();
      if (!typeJson.data || typeJson.data.length === 0) throw new Error(`Filing type ${typeCode} not found`);
      const filingTypeId = typeJson.data[0].id;

      // Step 3: Get default status ID (NOT_STARTED or IN_PROGRESS)
      const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=NOT_STARTED`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let statusId;
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        statusId = statusJson.data?.[0]?.id;
      }
      // Fallback to IN_PROGRESS if NOT_STARTED not found
      if (!statusId) {
        const statusRes2 = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=IN_PROGRESS`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statusRes2.ok) {
          const statusJson2 = await statusRes2.json();
          statusId = statusJson2.data?.[0]?.id;
        }
      }
      if (!statusId) throw new Error('Default status not found');

      // Step 4: Create filing
      const entityName = type === "INDIVIDUAL" ? "Personal Tax Return" :
                        type === "CORPORATE" ? "New Corporation" :
                        type === "TRUST" ? "New Trust" : "New Entity"

      const filingRes = await strapiClient.post<StrapiResponse<any>>("/filings", {
        data: {
          taxYear: taxYearId,
          filingStatus: statusId,
          filingType: filingTypeId,
          progress: 0,
          entityName,
          filingData: {}
        }
      })

      const filingId = filingRes.data.data.documentId || filingRes.data.data.id

      // Step 5: Create child record based on filing type
      const release = await familyMemberMutex.acquire()
      try {
        if (type === "CORPORATE") {
          // Create corporate-filing child record
          const corpRes = await strapiClient.post<StrapiResponse<any>>("/corporate-filings", {
            data: {
              filing: filingId,
              formData: {},
              corporateFilingStatus: "DRAFT"
            }
          })
          // Transform to match PersonalFiling interface for compatibility
          const corporateFiling: PersonalFiling = {
            id: corpRes.data.data.documentId || corpRes.data.data.id,
            documentId: corpRes.data.data.documentId || corpRes.data.data.id,
            type: "primary", // Corporate filings use "primary" as the single entity type
            formData: corpRes.data.data.formData || {},
            isComplete: corpRes.data.data.corporateFilingStatus === 'COMPLETED',
            createdAt: corpRes.data.data.createdAt,
            updatedAt: corpRes.data.data.updatedAt,
          }

          const completeFiling = await this.getFiling(filingId)
          return { filing: completeFiling, primaryFiling: corporateFiling }

        } else if (type === "TRUST") {
          // Create trust-filing child record
          const trustRes = await strapiClient.post<StrapiResponse<any>>("/trust-filings", {
            data: {
              filing: filingId,
              formData: {},
              trustFilingStatus: "DRAFT"
            }
          })
          // Transform to match PersonalFiling interface for compatibility
          const trustFiling: PersonalFiling = {
            id: trustRes.data.data.documentId || trustRes.data.data.id,
            documentId: trustRes.data.data.documentId || trustRes.data.data.id,
            type: "primary",
            formData: trustRes.data.data.formData || {},
            isComplete: trustRes.data.data.trustFilingStatus === 'COMPLETED',
            createdAt: trustRes.data.data.createdAt,
            updatedAt: trustRes.data.data.updatedAt,
          }

          const completeFiling = await this.getFiling(filingId)
          return { filing: completeFiling, primaryFiling: trustFiling }

        } else {
          // INDIVIDUAL: Create personal-filing child record
          const pfRes = await strapiClient.post<StrapiResponse<any>>("/personal-filings", {
            data: {
              filing: filingId,
              type: "primary",
              formData: {},
              individualStatus: "DRAFT"
            }
          })
          const primaryFiling = transformPersonalFiling(pfRes.data.data)

          const completeFiling = await this.getFiling(filingId)
          return { filing: completeFiling, primaryFiling }
        }
      } finally {
        release()
      }
    } catch (error: any) {
      // Extract backend error message from Axios error
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Re-throw original error if no backend message
      throw error;
    }
  },

  async addFamilyMember(filingId: string, role: FilingRole): Promise<PersonalFiling> {
    const release = await familyMemberMutex.acquire()
    try {
      // For primary role, check if one already exists to prevent duplicates
      if (role === "primary") {
        const existingFiling = await this.getFiling(filingId)
        const existingPrimary = existingFiling.personalFilings?.find(pf => pf.type === "primary")
        if (existingPrimary) {
          console.warn("Primary personal filing already exists, returning existing one")
          return existingPrimary
        }
      }

      const response = await strapiClient.post<StrapiResponse<any>>("/personal-filings", {
        data: {
          filing: filingId,
          type: role,
          formData: {},
          individualStatus: "DRAFT"
        }
      })
      return transformPersonalFiling(response.data.data)
    } finally {
      release()
    }
  },

  async saveStepData(pfId: string, data: any): Promise<PersonalFiling> {
    // Helper: Convert dot-notation flat object to nested object
    // e.g., { "personalInfo.firstName": "John" } -> { personalInfo: { firstName: "John" } }
    const unflattenObject = (obj: any): any => {
      const result: any = {}
      for (const key of Object.keys(obj)) {
        if (key.includes('.')) {
          const parts = key.split('.')
          let current = result
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {}
            }
            current = current[parts[i]]
          }
          current[parts[parts.length - 1]] = obj[key]
        } else {
          result[key] = obj[key]
        }
      }
      return result
    }

    // Helper: Clean empty strings to null (Strapi validation hates "" for dates/enums)
    const clean = (val: any): any => {
      if (val === "" || val === undefined) return null
      if (Array.isArray(val)) return val.map(clean)
      if (typeof val === 'object' && val !== null) {
        const newObj: any = {}
        Object.keys(val).forEach(key => {
          newObj[key] = clean(val[key])
        })
        return newObj
      }
      return val
    }

    // Helper: Convert YES/NO to Boolean
    const toBool = (val: any) => {
      if (val === 'YES' || val === 'Yes' || val === true) return true
      if (val === 'NO' || val === 'No' || val === false) return false
      return null
    }

    // Helper: Split full name into firstName, lastName, middleName
    const splitName = (fullName: string | undefined): { firstName: string | null; lastName: string | null; middleName: string | null } => {
      if (!fullName) return { firstName: null, lastName: null, middleName: null }
      const parts = fullName.trim().split(/\s+/)
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: null, middleName: null }
      } else if (parts.length === 2) {
        return { firstName: parts[0], lastName: parts[1], middleName: null }
      } else {
        return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] }
      }
    }

    // Convert dot-notation keys to nested object structure
    const nestedData = unflattenObject(data)

    // Map form data to individual PersonalFiling fields
    // Support both nested structure (after unflatten) and direct flat keys
    const pi = nestedData.personalInfo || nestedData

    // Build spouse component data if present
    let spouseData = undefined
    if (nestedData.spouse) {
      const sp = nestedData.spouse
      // Handle fullName splitting if provided
      const spouseName = sp.fullName ? splitName(sp.fullName) : { firstName: sp.firstName, lastName: sp.lastName, middleName: sp.middleName }

      spouseData = {
        firstName: clean(spouseName.firstName),
        lastName: clean(spouseName.lastName),
        middleName: clean(spouseName.middleName),
        sin: clean(sp.sin),
        birthDate: clean(sp.birthDate || sp.dateOfBirth),
        netIncome: sp.netIncome ? Number(sp.netIncome) : null,
        dateBecameResident: clean(sp.dateBecameResident),
        dateOfEntry: clean(sp.dateOfEntry),
        statusInCanada: clean(sp.statusInCanada),
        incomeSources: sp.incomeSources || null,
        taxSlips: sp.taxSlips || null,
        workExpenses: sp.workExpenses || null,
        deductions: sp.deductions || null,
      }
    }

    // Build dependents array if present (component array in Strapi)
    let dependentsData = undefined
    if (nestedData.dependents && Array.isArray(nestedData.dependents)) {
      dependentsData = nestedData.dependents.map((dep: any) => {
        const depName = dep.fullName ? splitName(dep.fullName) : { firstName: dep.firstName, lastName: dep.lastName, middleName: dep.middleName }
        return {
          firstName: clean(depName.firstName),
          lastName: clean(depName.lastName),
          middleName: clean(depName.middleName),
          birthDate: clean(dep.birthDate || dep.dateOfBirth),
          sin: clean(dep.sin),
          relationship: clean(dep.relationship),
          statusInCanada: clean(dep.statusInCanada),
          dateBecameResident: clean(dep.dateBecameResident),
          earnsIncome: clean(dep.earnsIncome),
          netIncome: dep.netIncome ? Number(dep.netIncome) : null,
          incomeSources: dep.incomeSources || null,
          taxSlips: dep.taxSlips || null,
          workExpenses: dep.workExpenses || null,
          deductions: dep.deductions || null,
        }
      })
    }

    // Extract maritalStatus - handle both object format { status: "MARRIED" } and direct string
    const maritalStatusValue = pi.maritalStatus?.status || pi.maritalStatus || nestedData.maritalStatus?.status || nestedData.maritalStatus

    const mappedPayload = {
      // Personal Info (Flattened)
      firstName: clean(pi.firstName),
      lastName: clean(pi.lastName),
      middleName: clean(pi.middleName),
      sin: clean(pi.sin),
      dateOfBirth: clean(pi.dateOfBirth),
      phoneNumber: clean(pi.phoneNumber),
      email: clean(pi.email || pi.emailAddress),

      // Address
      streetNumber: clean(pi.streetNumber || pi.address?.streetNumber),
      streetName: clean(pi.streetName || pi.address?.streetName),
      apartmentNumber: clean(pi.apartmentNumber || pi.address?.apartmentNumber),
      city: clean(pi.city || pi.address?.city),
      province: clean(pi.province?.code || pi.province || pi.address?.province),
      postalCode: clean(pi.postalCode || pi.address?.postalCode),

      // Status & Residency
      maritalStatus: clean(maritalStatusValue),
      maritalStatusChanged: clean(pi.maritalStatusChanged || nestedData.maritalStatus?.changed),
      maritalStatusChangeDate: clean(pi.maritalStatusChangeDate || nestedData.maritalStatus?.changeDate),
      statusInCanada: clean(pi.statusInCanada),
      dateBecameResident: clean(pi.dateBecameResident || nestedData.residency?.dateBecameResident),
      provinceResided: clean(nestedData.residency?.provinceResided || pi.provinceResided),
      livedOutsideCanada: clean(nestedData.residency?.livedOutsideCanada || pi.livedOutsideCanada),
      countryOfResidence: clean(nestedData.residency?.countryOfResidence || pi.countryOfResidence),
      becameResidentThisYear: clean(nestedData.residency?.becameResidentThisYear || pi.becameResidentThisYear),
      worldIncome: clean(nestedData.residency?.worldIncome || pi.worldIncome),

      // Family members indicator
      hasFamilyMembers: clean(pi.hasFamilyMembers || nestedData.hasFamilyMembers),
      dependentsCount: pi.dependentsCount ?? nestedData.dependentsCount ?? null,

      // Spouse Component (filing.spouse-info)
      spouse: spouseData,

      // Dependents Component Array (filing.dependent-info, repeatable)
      dependents: dependentsData,

      // Components (with type transformation)
      electionsCanada: nestedData.electionsCanada ? {
        authorizeCRA: toBool(nestedData.electionsCanada.authorizeCRA),
        consentRegister: toBool(nestedData.electionsCanada.consentRegister)
      } : undefined,

      propertyAssets: nestedData.propertyAssets ? {
        purchasedPrincipalResidence: toBool(nestedData.propertyAssets.purchasedPrincipalResidence),
        disposedPrincipalResidence: toBool(nestedData.propertyAssets.disposedPrincipalResidence),
        foreignPropertyOver100k: toBool(nestedData.propertyAssets.foreignPropertyOver100k),
        foreignAffiliate: toBool(nestedData.propertyAssets.foreignAffiliate)
      } : undefined,

      disabilityCredit: nestedData.disabilityCredit ? transformComponentWithBooleans(nestedData.disabilityCredit, toBool, clean) : undefined,
      workExpenses: nestedData.workExpenses ? transformComponentWithBooleans(nestedData.workExpenses, toBool, clean) : undefined,
      homeOffice: nestedData.homeOffice ? transformComponentWithBooleans(nestedData.homeOffice, toBool, clean) : undefined,
      vehicleExpenses: nestedData.vehicleExpenses ? transformComponentWithBooleans(nestedData.vehicleExpenses, toBool, clean) : undefined,
      selfEmployment: nestedData.selfEmployment ? transformSelfEmployment(nestedData.selfEmployment, toBool, clean) : undefined,
      rentalIncome: nestedData.rentalIncome ? transformRentalIncome(nestedData.rentalIncome, toBool, clean) : undefined,
      movingExpenses: nestedData.movingExpenses ? transformComponentWithBooleans(nestedData.movingExpenses, toBool, clean) : undefined,

      // JSON Arrays
      incomeSources: nestedData.income?.sources || pi.incomeSources,
      deductionSources: nestedData.deductions?.sources || pi.deductionSources,
      taxSlips: nestedData.taxSlips || pi.taxSlips,
      additionalDocs: nestedData.additionalDocs || pi.additionalDocs,

      // Full Blob Backup (for reconstruction) - keep original format
      formData: data
    }

    // Remove undefined fields (but keep null values for clearing fields)
    const cleanedPayload = Object.fromEntries(
      Object.entries(mappedPayload).filter(([_, v]) => v !== undefined)
    )

    console.log('[saveStepData] Saving to PersonalFiling:', pfId, cleanedPayload)

    const response = await strapiClient.put<StrapiResponse<any>>(`/personal-filings/${pfId}`, {
      data: cleanedPayload
    })
    return transformPersonalFiling(response.data.data)
  },

  /**
   * Update filing status (e.g., NOT_STARTED -> IN_PROGRESS)
   */
  async updateFilingStatus(filingId: string, statusCode: string): Promise<Filing> {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null;

    if (!token) throw new Error('No authentication token');

    // Get the status documentId for the given status code (Strapi v5 uses documentId for relations)
    const statusRes = await fetch(`${strapiUrl}/api/filing-statuses?filters[statusCode][$eq]=${statusCode}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!statusRes.ok) throw new Error(`Failed to fetch status: ${statusCode}`);
    const statusJson = await statusRes.json();
    // Prefer documentId for Strapi v5, fallback to id for compatibility
    const statusIdentifier = statusJson.data?.[0]?.documentId || statusJson.data?.[0]?.id;

    if (!statusIdentifier) throw new Error(`Status ${statusCode} not found`);

    console.log('[updateFilingStatus] Updating filing', filingId, 'with status:', statusIdentifier);

    // Update the filing with the new status (using documentId or id)
    try {
      const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
        data: { filingStatus: statusIdentifier }
      })
      console.log('[updateFilingStatus] Response:', response.data);
      return transformFiling(response.data.data)
    } catch (err: any) {
      console.error('[updateFilingStatus] Error:', err.response?.data || err.message);
      throw err;
    }
  },

  /**
   * Mark filing as IN_PROGRESS (called on first "Next" click)
   */
  async markFilingInProgress(filingId: string): Promise<Filing> {
    return this.updateFilingStatus(filingId, 'IN_PROGRESS')
  },

  /**
   * Save personal filing data with all fields mapped correctly
   */
  async savePersonalFilingData(pfId: string, formData: any): Promise<PersonalFiling> {
    // Send formData to the personal-filing endpoint
    // The backend will handle mapping to individual fields
    const response = await strapiClient.put<StrapiResponse<any>>(`/personal-filings/${pfId}`, {
      data: {
        formData: formData,
        // Also update individualStatus if completing
        individualStatus: formData._isComplete ? 'COMPLETED' : 'DRAFT'
      }
    })
    return transformPersonalFiling(response.data.data)
  },

  /**
   * Update the individualStatus of a PersonalFiling (e.g., DRAFT -> COMPLETED)
   */
  async updatePersonalFilingStatus(pfId: string, status: 'DRAFT' | 'COMPLETED' | 'FLAGGED' | 'VERIFIED'): Promise<PersonalFiling> {
    console.log('[updatePersonalFilingStatus] Updating PersonalFiling:', pfId, 'to status:', status)
    const response = await strapiClient.put<StrapiResponse<any>>(`/personal-filings/${pfId}`, {
      data: { individualStatus: status }
    })
    return transformPersonalFiling(response.data.data)
  },

  /**
   * Flush pending save immediately (for use before navigation)
   * This saves any accumulated form data without waiting for debounce
   */
  async flushSave(pfId: string, data: Record<string, unknown>): Promise<PersonalFiling> {
    console.log('[flushSave] Immediate save for PersonalFiling:', pfId)
    return this.saveStepData(pfId, data)
  },

  /**
   * Save wizard progress to the parent filing record
   * This stores the current phase, section index, and active personal filing ID
   * Used for resuming from where user left off
   */
  async saveWizardProgress(filingId: string, progress: {
    lastPhase: string;
    lastSectionIndex: number;
    lastPersonalFilingId: string;
    lastDependentIndex?: number;
  }): Promise<void> {
    console.log('[saveWizardProgress] Saving progress for filing:', filingId, progress)
    try {
      await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
        data: {
          wizardProgress: progress
        }
      })
    } catch (err) {
      console.error('[saveWizardProgress] Error saving progress:', err)
      // Don't throw - progress saving is non-critical
    }
  },

  /**
   * Generate a unique reference number for filing (JJ-XXXXXX)
   * Uses timestamp + random chars to ensure uniqueness
   */
  generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase() // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random chars
    return `JJ-${timestamp.slice(-4)}${random}`
  },

  /**
   * Submit filing for review - updates status to UNDER_REVIEW and generates reference number
   * Also marks all child personal-filings as COMPLETED
   */
  async submitForReview(filingId: string): Promise<Filing> {
    console.log('[submitForReview] Submitting filing:', filingId)

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null

    if (!token) throw new Error('No authentication token')

    // ============================================================
    // STEP 1: Get the filing with all personal filings
    // ============================================================
    console.log('[submitForReview] STEP 1: Getting filing data...')
    const filingData = await this.getFiling(filingId)
    console.log('[submitForReview] STEP 1 COMPLETE: Found', filingData.personalFilings?.length || 0, 'personal filings')

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
    // STEP 3: Mark ALL personal filings as COMPLETED
    // This must complete before we update the parent filing status
    // ============================================================
    console.log('[submitForReview] STEP 3: Marking all personal filings as COMPLETED...')
    const personalFilings = filingData.personalFilings || []

    for (const pf of personalFilings) {
      const pfId = pf.documentId || pf.id
      console.log('[submitForReview] STEP 3: Marking personal filing', pfId, 'as COMPLETED')
      await this.updatePersonalFilingStatus(pfId, 'COMPLETED')
    }
    console.log('[submitForReview] STEP 3 COMPLETE: All', personalFilings.length, 'personal filings marked as COMPLETED')

    // ============================================================
    // STEP 4: Use existing confirmation number or generate new one
    // For reopened filings (amendments), preserve the original confirmation number
    // ============================================================
    const existingConfirmationNumber = filingData.referenceNumber
    const confirmationNumber = existingConfirmationNumber || this.generateReferenceNumber()
    console.log('[submitForReview] STEP 4: confirmationNumber =', confirmationNumber, existingConfirmationNumber ? '(preserved existing)' : '(newly generated)')

    // ============================================================
    // STEP 5: Update the parent filing status and confirmation number
    // ============================================================
    console.log('[submitForReview] STEP 5: Updating parent filing status...')
    const response = await strapiClient.put<StrapiResponse<any>>(`/filings/${filingId}`, {
      data: {
        filingStatus: statusId,
        confirmationNumber,
        submittedAt: new Date().toISOString()
      }
    })
    console.log('[submitForReview] STEP 5 COMPLETE: Filing submitted successfully')

    // Transform the response and ensure the confirmation number is included
    const filing = transformFiling(response.data.data)
    filing.referenceNumber = confirmationNumber
    return filing
  }
}