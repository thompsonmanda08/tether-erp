"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getRolesAction,
  getRolePermissionsAction,
  createRoleAction,
  updateRoleAction,
} from "@/app/_actions/roles-permissions";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Fetch all roles with optional filtering
 * Standard data - 5 minute refresh interval
 *
 * @param params - Optional filtering parameters
 * @returns Query result with roles array
 *
 * @example
 * const { data: roles } = useRoles({ isActive: true })
 */
export const useRoles = (params?: {
  departmentId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}) =>
  useQuery({
    queryKey: [QUERY_KEYS.ROLES, params],
    queryFn: async () => {
      const response = await getRolesAction();
      return response.success ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch all active roles (for dropdowns and selection)
 * Standard data - 5 minute refresh interval
 *
 * @returns Query result with active roles array
 *
 * @example
 * const { data: roles } = useActiveRoles()
 */
export const useActiveRoles = () =>
  useQuery({
    queryKey: [QUERY_KEYS.ROLES],
    queryFn: async () => {
      try {
        const response = await getRolesAction();

        // Ensure we always return an array
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }

        // If response is not successful or data is not an array, return empty array
        console.warn(
          "Roles API response was not successful or data is not an array:",
          response,
        );
        return [];
      } catch (error) {
        console.error("Error fetching roles:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a specific role by ID
 *
 * @param roleId - Role ID to fetch
 * @param initialData - Optional initial data
 * @returns Query result with single role
 *
 * @example
 * const { data: role } = useRoleById(roleId)
 */
export const useRoleById = (roleId: string, initialData?: any) =>
  useQuery({
    queryKey: [QUERY_KEYS.ROLES, roleId],
    queryFn: async () => {
      const response = await getRolePermissionsAction(roleId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!roleId,
  });

/**
 * Create role mutation
 *
 * @param onSuccess - Callback after successful creation
 * @returns Mutation object
 *
 * @example
 * const createMutation = useCreateRole(() => {
 *   queryClient.invalidateQueries({ queryKey: ['roles'] })
 * })
 * await createMutation.mutateAsync({
 *   id: 'custom-role-1',
 *   name: 'Custom Role',
 *   code: 'CUSTOM',
 *   description: 'Custom role description'
 * })
 */
export const useCreateRole = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      code: string;
      description?: string;
      is_active?: boolean;
      department_id?: string;
      is_department_head?: boolean;
    }) => {
      const response = await createRoleAction(data.name, data.description);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Role created successfully");

      // Invalidate role queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ROLES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create role");
    },
  });
};

/**
 * Update role mutation
 *
 * @param roleId - Role ID to update
 * @param onSuccess - Callback after successful update
 * @returns Mutation object
 *
 * @example
 * const updateMutation = useUpdateRole(roleId)
 * await updateMutation.mutateAsync({
 *   name: 'Updated Role Name',
 *   description: 'Updated description'
 * })
 */
export const useUpdateRole = (roleId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      code: string;
      description?: string;
      is_active?: boolean;
      is_department_head?: boolean;
    }) => {
      const response = await updateRoleAction(
        data.id,
        data.name,
        data.description,
      );
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ROLES, roleId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ROLES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });
};
