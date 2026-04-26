"use client";

import { useMemo } from "react";
import { useUserOrganizations } from "./use-user-organizations";
import { useSelectedOrgId } from "./use-selected-org-id";
import type { Organization } from "@/app/_actions/organizations";

/**
 * Derives the current organization from the React Query cache + selected org ID.
 * If the stored ID doesn't match any org, falls back to the first one.
 */
export function useCurrentOrganization(initialOrganizations?: Organization[]) {
  const {
    data: organizations = [],
    isLoading,
    error,
    refetch,
  } = useUserOrganizations(initialOrganizations);
  const { selectedOrgId, setSelectedOrgId } = useSelectedOrgId();

  const currentOrganization = useMemo(() => {
    if (organizations.length === 0) return null;

    // Try to find the stored org
    if (selectedOrgId) {
      const found = organizations.find((org) => org.id === selectedOrgId);
      if (found) return found;
    }

    // Fallback to first org and persist the selection
    return organizations[0];
  }, [organizations, selectedOrgId]);

  return {
    currentOrganization,
    organizations,
    isLoading,
    error,
    refetch,
    selectedOrgId,
    setSelectedOrgId,
  };
}
