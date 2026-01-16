"use client"

import useSWR from "swr"
import { FilingService } from "@/services/filing-service"
import type { Filing } from "@/lib/domain/types"

const fetchFilings = async (): Promise<Filing[]> => {
  return FilingService.getFilings()
}

export function useFilingsList() {
  const { data, error, isLoading, mutate } = useSWR<Filing[]>("filings", fetchFilings, {
    revalidateOnFocus: true,
  })

  return {
    filings: data || [],
    error,
    isLoading,
    refresh: mutate,
  }
}
