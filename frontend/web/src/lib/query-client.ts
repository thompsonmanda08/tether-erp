"use client";

import {
  isServer,
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { dispatchSessionExpired } from "@/lib/session-events";

function handleGlobalError(error: any) {
  if (error?.status === 401) {
    dispatchSessionExpired();
  }
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleGlobalError }),
    mutationCache: new MutationCache({ onError: handleGlobalError }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error: any) => {
          if (error?.status === 401) return false;
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.status === 401) return false;
          if (
            error?.type === "Network Error" ||
            (typeof navigator !== "undefined" && !navigator.onLine)
          )
            return false;
          return failureCount < 1;
        },
      },
    },
  });
}

// Browser-side singleton — ensures every hook resolves to the exact same
// QueryClient instance that the <QueryClientProvider> was initialized with.
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Always create a fresh client per server request (no shared state).
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
