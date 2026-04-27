/**
 * Cache Manager for Organization-Scoped Data
 * Handles cache invalidation when switching between organizations
 * Includes both client-side (React Query) and server-side (Next.js) cache invalidation
 *
 * All functions require a QueryClient from useQueryClient() — the single
 * source of truth provided by QueryClientProvider in providers.tsx.
 */

import { QueryClient } from "@tanstack/react-query";

export interface CacheManagerOptions {
  queryClient?: QueryClient;
  clearLocalStorage?: boolean;
  preserveKeys?: string[];
  revalidateServerCache?: boolean;
}

/**
 * Organization-scoped query keys that should be invalidated on org switch
 */
const ORGANIZATION_SCOPED_QUERIES = [
  "requisitions",
  "purchase-orders",
  "grn",
  "goods-received-notes",
  "budgets",
  "analytics",
  "dashboard",
  "workflows",
  "approvals",
  "categories",
  "vendors",
  "users",
  "members",
  "settings",
  "reports",
  "notifications",
  "audit-logs",
  "documents",
  "templates",
  "payment-vouchers",
  "invoices",
  "contracts",
  "projects",
  "departments",
  "cost-centers",
  "inventory",
  "assets",
] as const;

/**
 * LocalStorage keys that are organization-specific and should be cleared
 */
const ORGANIZATION_SCOPED_STORAGE_PATTERNS = [
  "requisitions",
  "purchase-orders",
  "grn",
  "budget",
  "analytics",
  "workflow",
  "approval",
  "dashboard",
  "filters",
  "preferences",
  "table-state",
  "form-data",
  "draft",
  "cache",
] as const;

/**
 * Keys that should never be cleared (global app state)
 */
const PRESERVE_STORAGE_KEYS = [
  "current-organization-id",
  "theme",
  "sidebar-state",
  "user-preferences",
  "auth-session",
  "language",
  "timezone",
] as const;

/**
 * Clear all organization-scoped cache data.
 * Selectively invalidates org-scoped React Query keys while preserving
 * global queries like user-organizations and user-permissions.
 */
export async function clearOrganizationCache(
  options: CacheManagerOptions = {},
) {
  const {
    queryClient,
    clearLocalStorage = true,
    preserveKeys = [],
    revalidateServerCache = true,
  } = options;

  // Invalidate org-scoped React Query cache
  if (queryClient) {
    try {
      for (const queryKey of ORGANIZATION_SCOPED_QUERIES) {
        await queryClient.invalidateQueries({
          queryKey: [queryKey],
          exact: false,
        });
      }
    } catch (error) {
      console.error("[CacheManager] Failed to clear React Query cache:", error);
    }
  }

  // Clear localStorage
  if (clearLocalStorage) {
    clearOrganizationStorage(preserveKeys);
  }

  // Revalidate server-side cache
  if (revalidateServerCache) {
    await revalidateServerCache_();
  }
}

/**
 * Invalidate specific query patterns
 */
export async function invalidateQueries(
  patterns: string[],
  queryClient: QueryClient,
) {
  try {
    for (const pattern of patterns) {
      await queryClient.invalidateQueries({
        queryKey: [pattern],
        exact: false,
      });
    }
  } catch (error) {
    console.error("[CacheManager] Failed to invalidate queries:", error);
  }
}

/**
 * Prefetch critical data for new organization (placeholder)
 */
export async function prefetchOrganizationData(
  organizationId: string,
  queryClient?: QueryClient,
) {
  // Placeholder — actual prefetch logic would go here
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  return {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    organizationScopedQueries: queries.filter((q) =>
      ORGANIZATION_SCOPED_QUERIES.some((pattern) =>
        q.queryKey.some(
          (key) => typeof key === "string" && key.includes(pattern),
        ),
      ),
    ).length,
  };
}

// ---- Internal helpers ----

function clearOrganizationStorage(preserveKeys: string[] = []) {
  if (typeof window === "undefined") return;

  try {
    const allPreserveKeys = [...PRESERVE_STORAGE_KEYS, ...preserveKeys];
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (allPreserveKeys.some((preserveKey) => key.includes(preserveKey))) {
        continue;
      }

      if (
        ORGANIZATION_SCOPED_STORAGE_PATTERNS.some((pattern) =>
          key.includes(pattern),
        )
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("[CacheManager] Failed to clear localStorage:", error);
  }
}

async function revalidateServerCache_() {
  try {
    const { revalidateOrganizationCache } = await import(
      "@/app/_actions/cache-revalidation"
    );
    await revalidateOrganizationCache();
  } catch (error) {
    console.error(
      "[CacheManager] Failed to revalidate server-side cache:",
      error,
    );
  }
}
