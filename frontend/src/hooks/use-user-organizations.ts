"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchUserOrganizations,
  type Organization,
} from "@/app/_actions/organizations";

export const USER_ORGS_QUERY_KEY = ["user-organizations"] as const;
export const USER_ORGS_STALE_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * React Query hook for fetching user organizations.
 * Uses a 30-minute staleTime so the data is fetched once and shared
 * globally via the queryClient — no refetching on page navigation.
 *
 * Pass `initialData` from SSR to avoid loading flash.
 */
export function useUserOrganizations(initialData?: Organization[]) {
  return useQuery({
    queryKey: USER_ORGS_QUERY_KEY,
    queryFn: () => fetchUserOrganizations(),
    staleTime: USER_ORGS_STALE_TIME,
    ...(initialData
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
