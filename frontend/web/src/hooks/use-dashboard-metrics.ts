"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics } from "@/app/_actions/dashboard";
import { getPendingApprovalCount } from "@/app/_actions/workflow-approval-actions";
import type { DashboardMetrics } from "@/types";

/**
 * Hook for fetching dashboard metrics with enhanced pending approval count.
 *
 * Fetches both dashboard metrics and pending approval count in a single query
 * to avoid nested useQuery calls that can break during SSR.
 *
 * @param initialMetrics - Optional SSR-prefetched metrics
 * @param initialPendingCount - Optional SSR-prefetched pending count
 */
export function useDashboardMetrics(
  initialMetrics?: DashboardMetrics,
  initialPendingCount?: number,
) {
  const computedInitialData = initialMetrics
    ? { ...initialMetrics, pendingApproval: initialPendingCount ?? 0 }
    : undefined;

  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async (): Promise<DashboardMetrics> => {
      const [metricsResult, pendingResult] = await Promise.all([
        getDashboardMetrics(),
        getPendingApprovalCount(),
      ]);

      if (!metricsResult.success || !metricsResult.data) {
        throw new Error(
          metricsResult.message || "Failed to load dashboard metrics",
        );
      }

      const pendingCount =
        pendingResult.success ? (pendingResult.data?.count ?? 0) : 0;

      return {
        ...metricsResult.data,
        pendingApproval: pendingCount,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    ...(computedInitialData
      ? { initialData: computedInitialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
