import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // treat data fresh for 30s by default
      gcTime: 5 * 60_000,        // keep unused cache for 5 min
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false, // avoid noisy refetches in a SaaS app
    },
    mutations: {
      retry: 0,
    },
  },
})
