'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  fetchUserOrganizations, 
  getOrganizationById, 
  fetchOrganizationMembers,
  getOrganizationSettings
} from '@/app/_actions/organizations';

/**
 * Hook for fetching user's organizations
 */
export function useOrganizationsQuery() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      return await fetchUserOrganizations();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single organization by ID
 */
export function useOrganizationQuery(orgId: string) {
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      const response = await getOrganizationById(orgId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching organization members
 */
export function useOrganizationMembersQuery(
  page: number = 1,
  limit: number = 20,
  role?: string
) {
  return useQuery({
    queryKey: ['organization-members', page, limit, role],
    queryFn: async () => {
      const response = await fetchOrganizationMembers(page, limit, role);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching organization settings
 */
export function useOrganizationSettingsQuery() {
  return useQuery({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const response = await getOrganizationSettings();
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}