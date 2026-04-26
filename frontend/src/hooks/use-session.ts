"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  getCurrentUserSession,
  checkUserRoleAction,
  checkIsAdminAction,
} from "@/app/_actions/session";
import type { User } from "@/types";

export interface SessionData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

/**
 * Client-side hook to access session data
 * Uses React Query to fetch the current user session via server action
 * Automatically clears cache when user logs out or updates when user logs in
 *
 * @returns {SessionData} Current user session data
 *
 * @example
 * ```typescript
 * const { user, isLoading, isAuthenticated } = useSession();
 *
 * if (isLoading) return <div>Loading...</div>;
 *
 * return (
 *   <div>
 *     {isAuthenticated ? (
 *       <p>Hello, {user?.name}</p>
 *     ) : (
 *       <p>Please log in</p>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useSession(): SessionData {
  const queryClient = useQueryClient();
  const previousAuthStateRef = useRef<boolean | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session"],
    queryFn: () => getCurrentUserSession(),
    staleTime: 0, // Always treat session as stale for immediate updates on auth changes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Detect auth state changes and invalidate related queries
  useEffect(() => {
    const currentAuthState = data?.isAuthenticated;

    // Only trigger invalidation when auth state actually changes
    if (
      previousAuthStateRef.current !== undefined &&
      previousAuthStateRef.current !== currentAuthState
    ) {
      // Invalidate all related queries to force fresh data
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      queryClient.invalidateQueries({ queryKey: ["user-is-admin"] });
    }

    previousAuthStateRef.current = currentAuthState;
  }, [data?.isAuthenticated, queryClient]);

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: data?.isAuthenticated || false,
    error: error as Error | null,
  };
}

/**
 * Client-side hook to check if user has a specific role
 * Uses React Query to call server action for role checking
 *
 * @param {string | string[]} requiredRole - Role(s) to check for
 * @returns {boolean} Whether user has the required role
 *
 * @example
 * ```typescript
 * const isAdmin = useHasRole('ADMIN');
 * const isApprover = useHasRole(['DEPARTMENT_MANAGER', 'FINANCE_OFFICER']);
 * ```
 */
export function useHasRole(requiredRole: string | string[]): boolean {
  const { data } = useQuery({
    queryKey: ["user-role", requiredRole],
    queryFn: () => checkUserRoleAction(requiredRole),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return data || false;
}

/**
 * Client-side hook to check if user is authenticated
 * Uses React Query to fetch session and check auth status
 *
 * @returns {boolean} Whether user is authenticated
 *
 * @example
 * ```typescript
 * const isLoggedIn = useIsAuthenticated();
 *
 * if (!isLoggedIn) {
 *   return <LoginPage />;
 * }
 * ```
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useSession();
  return isAuthenticated;
}

/**
 * Client-side hook to check if user is admin
 * Uses React Query to call server action for admin check
 *
 * @returns {boolean} Whether user is an admin
 *
 * @example
 * ```typescript
 * const isUserAdmin = useIsAdmin();
 *
 * if (isUserAdmin) {
 *   return <AdminPanel />;
 * }
 * ```
 */
export function useIsAdmin(): boolean {
  const { data } = useQuery({
    queryKey: ["user-is-admin"],
    queryFn: () => checkIsAdminAction(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return data || false;
}
