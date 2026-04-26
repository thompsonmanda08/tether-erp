"use server";

import { getCurrentUser, hasRole, isAdmin, verifySession } from "@/lib/auth";
import type { User } from "@/types";

/**
 * Get the current authenticated user session
 * Server action that can be called from client components using React Query
 *
 * @returns {Promise<{user: User | null, isAuthenticated: boolean}>}
 *
 * @example
 * ```typescript
 * const { data: session } = useQuery({
 *   queryKey: ['session'],
 *   queryFn: () => getCurrentUserSession(),
 * })
 * ```
 */
export async function getCurrentUserSession(): Promise<{
  user: User | null;
  isAuthenticated: boolean;
}> {
  try {
    const { isAuthenticated, session } = await verifySession();

    return {
      user: session?.user ?? null,
      isAuthenticated: isAuthenticated,
    };
  } catch {
    return {
      user: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Check if current user has a specific role
 * Server action that can be called from client components
 *
 * @param {string | string[]} requiredRole - Role(s) to check for
 * @returns {Promise<boolean>}
 *
 * @example
 * ```typescript
 * const { data: isAdmin } = useQuery({
 *   queryKey: ['user-role', 'ADMIN'],
 *   queryFn: () => checkUserRoleAction('ADMIN'),
 * })
 * ```
 */
export async function checkUserRoleAction(
  requiredRole: string | string[]
): Promise<boolean> {
  try {
    return await hasRole(requiredRole as any);
  } catch {
    return false;
  }
}

/**
 * Check if current user is admin
 * Server action that can be called from client components
 *
 * @returns {Promise<boolean>}
 *
 * @example
 * ```typescript
 * const { data: isUserAdmin } = useQuery({
 *   queryKey: ['user-is-admin'],
 *   queryFn: () => checkIsAdminAction(),
 * })
 * ```
 */
export async function checkIsAdminAction(): Promise<boolean> {
  try {
    return await isAdmin();
  } catch {
    return false;
  }
}
