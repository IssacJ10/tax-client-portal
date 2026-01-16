"use client"

import { useState, useCallback } from "react"

interface AsyncActionState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
}

interface AsyncActionReturn<T, Args extends unknown[]> {
  data: T | null
  error: Error | null
  isLoading: boolean
  execute: (...args: Args) => Promise<T | null>
  reset: () => void
}

export function useAsyncAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<T>,
): AsyncActionReturn<T, Args> {
  const [state, setState] = useState<AsyncActionState<T>>({
    data: null,
    error: null,
    isLoading: false,
  })

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, error: null, isLoading: true })

      try {
        const result = await action(...args)
        setState({ data: result, error: null, isLoading: false })
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, error, isLoading: false })
        return null
      }
    },
    [action],
  )

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}
