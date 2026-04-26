import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllOrganizations,
  getOrganizationById,
  getOrganizationStatistics,
  createOrganization,
  updateOrganization,
  updateOrganizationStatus,
  deleteOrganization,
  getOrganizationUsers,
  getOrganizationActivity,
  type OrganizationFilters,
  type CreateOrganizationRequest,
  type UpdateOrganizationRequest,
} from "@/app/_actions/organizations";
import { queryKeys } from "@/lib/query-keys";

// --- Query Hooks ---

export function useOrganizations(filters?: OrganizationFilters) {
  return useQuery({
    queryKey: queryKeys.organizations.list(filters),
    queryFn: async () => {
      const result = await getAllOrganizations(filters);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: async () => {
      const result = await getOrganizationById(id);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useOrganizationStats() {
  return useQuery({
    queryKey: queryKeys.organizations.stats(),
    queryFn: async () => {
      const result = await getOrganizationStatistics();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useOrganizationUsers(
  organizationId: string,
  page: number = 1,
  limit: number = 50,
) {
  return useQuery({
    queryKey: queryKeys.organizations.users(organizationId, page, limit),
    queryFn: async () => {
      const result = await getOrganizationUsers(organizationId, page, limit);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!organizationId,
  });
}

export function useOrganizationActivity(
  organizationId: string,
  page: number = 1,
  limit: number = 50,
) {
  return useQuery({
    queryKey: queryKeys.organizations.activity(organizationId, page, limit),
    queryFn: async () => {
      const result = await getOrganizationActivity(
        organizationId,
        page,
        limit,
      );
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!organizationId,
  });
}

// --- Mutation Hooks ---

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOrganizationRequest;
    }) => updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "active" | "suspended" | "pending";
      reason?: string;
    }) => updateOrganizationStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}
