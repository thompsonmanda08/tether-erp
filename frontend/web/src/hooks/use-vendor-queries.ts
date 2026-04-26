"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  activateVendor,
  deactivateVendor,
} from "@/app/_actions/vendors";
import {
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorFilters,
} from "@/types/vendor";
import { toast } from "sonner";

/**
 * Fetch all vendors with optional filters
 */
export const useVendors = (filters?: VendorFilters, initialVendors?: Vendor[]) =>
  useQuery({
    queryKey: [QUERY_KEYS.VENDORS.ALL, filters],
    queryFn: async () => {
      const response = await getVendors(1, 100, filters);
      return response.success ? (response.data as Vendor[]) : [];
    },
    initialData: initialVendors,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a single vendor by ID
 */
export const useVendorById = (id: string, initialData?: Vendor) =>
  useQuery({
    queryKey: [QUERY_KEYS.VENDORS.BY_ID, id],
    queryFn: async () => {
      const response = await getVendorById(id);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

/**
 * Create a new vendor
 */
export const useCreateVendor = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVendorRequest) => {
      const response = await createVendor(data);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: () => {
      toast.success("Vendor created successfully");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS.ALL] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create vendor");
    },
  });
};

/**
 * Update an existing vendor
 */
export const useUpdateVendor = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVendorRequest }) => {
      const response = await updateVendor(id, data);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: (_response, { id }) => {
      toast.success("Vendor updated successfully");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS.BY_ID, id] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update vendor");
    },
  });
};

/**
 * Toggle vendor active/inactive status
 */
export const useToggleVendorStatus = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = active ? await activateVendor(id) : await deactivateVendor(id);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: (_response, { active }) => {
      toast.success(active ? "Vendor activated" : "Vendor deactivated");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS.ALL] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update vendor status");
    },
  });
};
