"use client"

import useSWR from "swr"
import { FilingService } from "@/services/filing-service"
import { useSession } from "@/context/session-provider"
import type { Filing } from "@/lib/domain/types"

const fetchFilings = async (year?: number): Promise<Filing[]> => {
  return FilingService.getFilings(year)
}

const fetchTaxYears = async (): Promise<{ id: string; year: number }[]> => {
  return FilingService.getTaxYears()
}

/**
 * Hook to fetch filings list
 * IMPORTANT: Only fetches when user is authenticated to prevent 401 race conditions
 * SECURITY: Cache keys include user ID to prevent data leakage between users
 */
export function useFilingsList(year?: number) {
  const { isAuthenticated, isLoading: isSessionLoading, user } = useSession()

  // Only fetch when authenticated - passing null key tells SWR to not fetch
  const shouldFetch = isAuthenticated && !isSessionLoading && user?.id

  // CRITICAL: Include user ID in cache key to prevent data leakage between users
  const cacheKey = shouldFetch
    ? (year ? `user-${user.id}-filings-${year}` : `user-${user.id}-filings`)
    : null

  const { data, error, isLoading, mutate } = useSWR<Filing[]>(
    cacheKey,
    () => fetchFilings(year),
    { revalidateOnFocus: true }
  )

  return {
    filings: data || [],
    error,
    isLoading: isSessionLoading || isLoading,
    refresh: mutate,
  }
}

/**
 * Hook to fetch tax years
 * IMPORTANT: Only fetches when user is authenticated to prevent 401 race conditions
 * SECURITY: Cache keys include user ID to prevent data leakage between users
 */
export function useTaxYears() {
  const { isAuthenticated, isLoading: isSessionLoading, user } = useSession()

  // Only fetch when authenticated
  const shouldFetch = isAuthenticated && !isSessionLoading && user?.id

  // CRITICAL: Include user ID in cache key to prevent data leakage between users
  const cacheKey = shouldFetch ? `user-${user.id}-tax-years` : null

  const { data, error, isLoading } = useSWR<{ id: string; year: number }[]>(
    cacheKey,
    fetchTaxYears,
    { revalidateOnFocus: false }
  )

  return {
    taxYears: data || [],
    error,
    isLoading: isSessionLoading || isLoading,
  }
}
