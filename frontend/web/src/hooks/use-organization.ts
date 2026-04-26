"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganization } from "./use-current-organization";
import { USER_ORGS_QUERY_KEY } from "./use-user-organizations";
import {
  switchOrganization,
  type Organization,
} from "@/app/_actions/organizations";
import {
  clearOrganizationCache,
  prefetchOrganizationData,
} from "@/lib/cache-manager";

export interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  switchWorkspace: (orgId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshOrganizations: () => void;
  retryFetch: () => void;
}

/**
 * Hook that provides organization context backed by React Query.
 * Same interface as the original — zero changes needed in consumers.
 */
export function useOrganizationContext(): OrganizationContextType {
  const queryClient = useQueryClient();
  const {
    currentOrganization,
    organizations,
    isLoading,
    error,
    refetch,
    setSelectedOrgId,
  } = useCurrentOrganization();

  const switchWorkspace = useCallback(
    async (orgId: string) => {
      // Switch organization on backend (updates session cookie)
      await switchOrganization(orgId);

      // Update local selected org ID
      setSelectedOrgId(orgId);

      // Clear all organization-scoped cache data (client + server)
      await clearOrganizationCache({
        queryClient,
        clearLocalStorage: true,
        preserveKeys: [],
        revalidateServerCache: true,
      });

      // Prefetch critical data for the new organization
      await prefetchOrganizationData(orgId);
    },
    [queryClient, setSelectedOrgId],
  );

  return {
    currentOrganization,
    userOrganizations: organizations,
    switchWorkspace,
    isLoading,
    error: error?.message ?? null,
    refreshOrganizations: () => {
      queryClient.invalidateQueries({ queryKey: USER_ORGS_QUERY_KEY });
    },
    retryFetch: () => {
      refetch();
    },
  };
}
