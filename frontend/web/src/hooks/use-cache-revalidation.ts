"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { clearOrganizationCache, invalidateQueries } from "@/lib/cache-manager";
import {
  revalidateSpecificPaths,
  revalidateSpecificTags,
} from "@/app/_actions/cache-revalidation";

/**
 * Hook for manual cache revalidation
 * Provides functions to revalidate different types of cache
 */
export function useCacheRevalidation() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Revalidate all organization-scoped cache (client + server)
   */
  const revalidateOrganizationData = useCallback(
    async (organizationId?: string) => {
      try {
        await clearOrganizationCache({
          queryClient,
          clearLocalStorage: true,
          revalidateServerCache: true,
        });

        router.refresh();
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    [queryClient, router]
  );

  /**
   * Revalidate specific query patterns (client-side only)
   */
  const revalidateQueries = useCallback(
    async (patterns: string[]) => {
      try {
        await invalidateQueries(patterns, queryClient);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    [queryClient]
  );

  /**
   * Revalidate specific server-side paths
   */
  const revalidatePaths = useCallback(
    async (paths: string[]) => {
      try {
        const result = await revalidateSpecificPaths(paths);

        if (result.success) {
          if (paths.some((path) => pathname.startsWith(path))) {
            router.refresh();
          }
        }

        return result;
      } catch (error) {
        return { success: false, error };
      }
    },
    [pathname, router]
  );

  /**
   * Revalidate specific server-side cache tags
   */
  const revalidateTags = useCallback(
    async (tags: string[]) => {
      try {
        const result = await revalidateSpecificTags(tags);

        if (result.success) {
          router.refresh();
        }

        return result;
      } catch (error) {
        return { success: false, error };
      }
    },
    [router]
  );

  /**
   * Revalidate current page only
   */
  const revalidateCurrentPage = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
      await revalidatePaths([pathname]);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [pathname, queryClient, revalidatePaths]);

  /**
   * Force hard refresh (clears everything and reloads page)
   */
  const forceHardRefresh = useCallback(async () => {
    try {
      await queryClient.clear();

      await clearOrganizationCache({
        queryClient,
        clearLocalStorage: true,
        revalidateServerCache: false,
      });

      window.location.reload();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [queryClient]);

  /**
   * Revalidate notification-related cache
   */
  const revalidateNotifications = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [queryClient]);

  /**
   * Revalidate workflow-related cache (includes notifications)
   */
  const revalidateWorkflowData = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["workflow"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [queryClient]);

  return {
    revalidateOrganizationData,
    revalidateQueries,
    revalidatePaths,
    revalidateTags,
    revalidateCurrentPage,
    revalidateNotifications,
    revalidateWorkflowData,
    forceHardRefresh,
  };
}

/**
 * Hook for getting cache statistics
 */
export function useCacheStats() {
  const queryClient = useQueryClient();

  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      totalQueries: queries.length,
      activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
      staleQueries: queries.filter((q) => q.isStale()).length,
      errorQueries: queries.filter((q) => q.state.status === "error").length,
      loadingQueries: queries.filter((q) => q.state.status === "pending")
        .length,
    };
  }, [queryClient]);

  return { getCacheStats };
}
