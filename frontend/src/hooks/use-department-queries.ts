"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDepartments,
  getActiveDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "@/app/_actions/departments";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Fetch all departments with optional active filter
 * Standard data - 5 minute refresh interval
 *
 * @param activeOnly - Only fetch active departments (default: true)
 * @returns Query result with departments array
 *
 * @example
 * const { data: departments } = useDepartments(true)
 */
export const useDepartments = (activeOnly: boolean = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.DEPARTMENTS, "all", activeOnly],
    queryFn: async () => {
      const response = activeOnly
        ? await getActiveDepartments()
        : await getDepartments();
      return response.success ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch all active departments (for dropdowns and selection)
 * Standard data - 5 minute refresh interval
 *
 * @returns Query result with active departments array
 *
 * @example
 * const { data: departments } = useActiveDepartments()
 */
export const useActiveDepartments = () =>
  useQuery({
    queryKey: [QUERY_KEYS.DEPARTMENTS, "active"],
    queryFn: async () => {
      try {
        const response = await getActiveDepartments();
        return response.success && Array.isArray(response.data)
          ? response.data
          : [];
      } catch (error) {
        console.error("Error fetching departments:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a specific department by ID
 *
 * @param departmentId - Department ID to fetch
 * @param initialData - Optional initial data
 * @returns Query result with single department
 *
 * @example
 * const { data: department } = useDepartmentById(departmentId)
 */
export const useDepartmentById = (
  departmentId: string,
  initialData?: Department,
) =>
  useQuery({
    queryKey: [QUERY_KEYS.DEPARTMENTS, "by-id", departmentId],
    queryFn: async () => {
      const response = await getDepartmentById(departmentId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!departmentId,
  });

/**
 * Create department mutation
 *
 * @param onSuccess - Callback after successful creation
 * @returns Mutation object
 *
 * @example
 * const createMutation = useCreateDepartment(() => {
 *   queryClient.invalidateQueries({ queryKey: ['departments'] })
 * })
 * await createMutation.mutateAsync({
 *   name: 'Finance',
 *   code: 'FIN',
 *   description: 'Finance Department'
 * })
 */
export const useCreateDepartment = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDepartmentRequest) => {
      const response = await createDepartment(data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Department created successfully");

      // Invalidate department queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS, "active"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create department");
    },
  });
};

/**
 * Update department mutation
 *
 * @param departmentId - Department ID to update
 * @param onSuccess - Callback after successful update
 * @returns Mutation object
 *
 * @example
 * const updateMutation = useUpdateDepartment(departmentId)
 * await updateMutation.mutateAsync({
 *   name: 'Updated Finance',
 *   description: 'Updated description'
 * })
 */
export const useUpdateDepartment = (
  departmentId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<UpdateDepartmentRequest, "id">) => {
      const response = await updateDepartment({ ...data, id: departmentId });
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Department updated successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS, "by-id", departmentId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS, "active"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update department");
    },
  });
};

/**
 * Delete department mutation
 *
 * @param departmentId - Department ID to delete
 * @param onSuccess - Callback after successful deletion
 * @returns Mutation object
 *
 * @example
 * const deleteMutation = useDeleteDepartment(departmentId)
 * await deleteMutation.mutateAsync()
 */
export const useDeleteDepartment = (
  departmentId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await deleteDepartment(departmentId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Department deleted successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DEPARTMENTS, "active"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });
};
