"use client";

import { useEffect, useState } from "react";
import { useTokenRefresh } from "@/hooks/use-auth-queries";
import { toast } from "sonner";
import { SessionDebug } from "@/components/debug/session-debug";

interface TokenRefreshProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Provider component that handles automatic token refresh
 * Place this high in your component tree to enable automatic token refresh
 *
 * @param children - Child components
 * @param enabled - Whether token refresh should be active (default: true)
 */
export function TokenRefreshProvider({
  children,
  enabled = true,
}: TokenRefreshProviderProps) {
  // Disable token refresh for first 2 minutes after page load to avoid conflicts with fresh sessions
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setIsInitialLoad(false);
      },
      2 * 60 * 1000,
    ); // 2 minutes

    return () => clearTimeout(timer);
  }, []);

  const { refreshError } = useTokenRefresh(enabled && !isInitialLoad);

  // Show toast notifications for critical refresh errors
  useEffect(() => {
    if (refreshError) {
      // Only show user-facing error for critical issues
      if (
        refreshError.message?.includes("No refresh token") ||
        refreshError.message?.includes("Invalid or expired")
      ) {
        toast.error("Session expired. Please log in again.");
      }
    }
  }, [refreshError]);

  return (
    <>
      {children}

      {/* Debug component in development */}
      {/* {process.env.NODE_ENV === "development" && <SessionDebug />} */}
    </>
  );
}

/**
 * Hook to manually trigger token refresh
 * Useful for "Extend Session" buttons or user interactions
 */
export function useExtendSession() {
  const { refreshNow, isRefreshing } = useTokenRefresh();

  const extendSession = async () => {
    try {
      await refreshNow();
      toast.success("Session extended successfully");
    } catch {
      toast.error("Failed to extend session");
    }
  };

  return {
    extendSession,
    isExtending: isRefreshing,
  };
}
