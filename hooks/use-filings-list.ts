"use client"

import useSWR from "swr"
import { FilingService } from "@/services/filing-service"
import type { Filing } from "@/lib/domain/types"

const fetchFilings = async (year?: number): Promise<Filing[]> => {
  return FilingService.getFilings(year)
}

const fetchTaxYears = async (): Promise<{ id: string; year: number }[]> => {
  return FilingService.getTaxYears()
}

export function useFilingsList(year?: number) {
  const { data, error, isLoading, mutate } = useSWR<Filing[]>(
    year ? `filings-${year}` : "filings",
    () => fetchFilings(year),
    { revalidateOnFocus: true }
  )

  return {
    filings: data || [],
    error,
    isLoading,
    refresh: mutate,
  }
}

export function useTaxYears() {
  const { data, error, isLoading } = useSWR<{ id: string; year: number }[]>(
    "tax-years",
    fetchTaxYears,
    { revalidateOnFocus: false }
  )

  return {
    taxYears: data || [],
    error,
    isLoading,
  }
}
