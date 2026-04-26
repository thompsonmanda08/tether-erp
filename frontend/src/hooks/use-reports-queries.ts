"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getSystemStatistics,
  getApprovalMetrics,
  getUserActivityMetrics,
  getAnalyticsDashboard,
} from "@/app/_actions/reports";
import type { DateRange } from "@/types/reports";

/**
 * Hook to fetch system statistics
 */
export function useSystemStats(dateRange?: DateRange) {
  return useQuery({
    queryKey: [QUERY_KEYS.REPORTS.SYSTEM_STATS, dateRange],
    queryFn: () => getSystemStatistics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch approval metrics
 */
export function useApprovalMetrics(dateRange?: DateRange) {
  return useQuery({
    queryKey: [QUERY_KEYS.REPORTS.APPROVAL_METRICS, dateRange],
    queryFn: () => getApprovalMetrics(dateRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch user activity metrics
 */
export function useUserActivity(dateRange?: DateRange) {
  return useQuery({
    queryKey: [QUERY_KEYS.REPORTS.USER_ACTIVITY, dateRange],
    queryFn: () => getUserActivityMetrics(dateRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch analytics dashboard data
 */
export function useAnalyticsDashboard(dateRange?: DateRange) {
  return useQuery({
    queryKey: [QUERY_KEYS.REPORTS.ANALYTICS, dateRange],
    queryFn: () => getAnalyticsDashboard(dateRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
