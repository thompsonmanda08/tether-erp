"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getRefreshToken } from "@/app/_actions/auth";
import { verifySession } from "@/lib/auth";
import { shouldRefreshToken, calculateRefreshInterval, SESSION_CONFIG } from "@/lib/session-config";
import type { APIResponse } from "@/types";

// Query keys for auth-related queries
export const AUTH_QUERY_KEYS = {
  REFRESH_TOKEN: ["auth", "refresh-token"],
  SESSION: ["auth", "session"],
} as const;

/**
 * Hook to automatically refresh JWT tokens using TanStack Query
 * Provides intelligent token refresh with automatic retries, background updates,
 * and proper error handling
 * 
 * @param enabled - Whether token refresh should be active (default: true)
 * @returns TanStack Query result with token refresh data and state
 */
export function useTokenRefresh(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const refreshIntervalRef = useRef<number | null>(null);

  // Query to get current session and determine if refresh is needed
  const sessionQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.SESSION,
    queryFn: async () => {
      const { session } = await verifySession();
      return session;
    },
    enabled,
    staleTime: 30 * 1000, // Consider session data stale after 30 seconds
    refetchInterval: 60 * 1000, // Check session every minute
  });

  // Determine if token needs refreshing
  // Add grace period for newly created sessions (don't refresh within first 2 minutes)
  const needsRefresh = sessionQuery.data?.expiresAt 
    ? (() => {
        const expiresAt = new Date(sessionQuery.data.expiresAt);
        const now = new Date();
        const sessionAge = now.getTime() - (expiresAt.getTime() - (sessionQuery.data.expiresIn || 3600) * 1000);
        const isNewSession = sessionAge < 2 * 60 * 1000; // Less than 2 minutes old
        
        return !isNewSession && shouldRefreshToken(sessionQuery.data.expiresAt);
      })()
    : false;

  // Token refresh query with intelligent refetch interval
  const refreshQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.REFRESH_TOKEN,
    queryFn: async (): Promise<APIResponse<any>> => {
      const response = await getRefreshToken();
      
      if (!response.success) {
        throw new Error(response.message || "Failed to refresh token");
      }
      
      return response;
    },
    enabled: enabled && needsRefresh && !!sessionQuery.data?.refresh_token,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for auth errors
      if (failureCount >= 3) return false;
      if (error.message?.includes("No refresh token")) return false;
      if (error.message?.includes("Invalid or expired")) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Token refresh data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: () => {
      // If we have session data, calculate refresh interval based on expiration
      if (sessionQuery.data?.expiresAt) {
        const expiresAt = new Date(sessionQuery.data.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        // Refresh 5 minutes before expiration, but at least every 20 minutes
        const refreshIn = Math.max(
          timeUntilExpiry - SESSION_CONFIG.TOKEN_REFRESH_BUFFER,
          SESSION_CONFIG.TOKEN_REFRESH_INTERVAL
        );
        return Math.max(refreshIn, 60 * 1000); // At least every minute
      }

      // Default: refresh every 20 minutes (from config)
      return SESSION_CONFIG.TOKEN_REFRESH_INTERVAL;
    },
    refetchIntervalInBackground: true, // Continue refreshing in background
  });

  // Invalidate session query when token is refreshed
  useEffect(() => {
    if (refreshQuery.isSuccess && refreshQuery.data?.success) {
      // Invalidate session to get updated expiration time
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SESSION });
      
      // Invalidate other auth-related queries
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      queryClient.invalidateQueries({ queryKey: ["user-is-admin"] });
    }
  }, [refreshQuery.isSuccess, refreshQuery.data, queryClient]);

  // Handle refresh errors
  useEffect(() => {
    if (refreshQuery.isError) {
      console.error("Token refresh failed:", refreshQuery.error);
      
      // If refresh fails due to invalid refresh token, user needs to re-login
      if (refreshQuery.error?.message?.includes("No refresh token") ||
          refreshQuery.error?.message?.includes("Invalid or expired")) {
        // Optionally redirect to login or show re-authentication modal
        console.warn("Refresh token invalid, user may need to re-authenticate");
      }
    }
  }, [refreshQuery.isError, refreshQuery.error]);

  return {
    // Token refresh state
    isRefreshing: refreshQuery.isFetching,
    refreshError: refreshQuery.error,
    refreshData: refreshQuery.data,
    
    // Session state
    session: sessionQuery.data,
    isLoadingSession: sessionQuery.isLoading,
    sessionError: sessionQuery.error,
    
    // Computed state
    needsRefresh,
    isAuthenticated: !!sessionQuery.data?.access_token,
    
    // Manual refresh function
    refreshNow: () => refreshQuery.refetch(),
    
    // Query objects for advanced usage
    refreshQuery,
    sessionQuery,
  };
}

/**
 * Hook for manual token refresh operations
 * Useful for triggering refresh on user interaction or specific events
 */
export function useManualTokenRefresh() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...AUTH_QUERY_KEYS.REFRESH_TOKEN, "manual"],
    queryFn: async (): Promise<APIResponse<any>> => {
      const response = await getRefreshToken();
      
      if (!response.success) {
        throw new Error(response.message || "Failed to refresh token");
      }
      
      // Invalidate related queries on successful refresh
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SESSION });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      
      return response;
    },
    enabled: false, // Only run when manually triggered
    retry: 2,
    staleTime: 0, // Always fresh when manually triggered
  });
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useTokenRefresh instead
 */
export function useRefreshToken(
  shouldRefresh: boolean = true,
  interval: number = 20 * 60 * 1000
) {
  const { refreshData, isRefreshing, refreshError } = useTokenRefresh(shouldRefresh);

  return {
    data: refreshData?.data || null,
    error: refreshError,
    isLoading: isRefreshing,
  };
}
