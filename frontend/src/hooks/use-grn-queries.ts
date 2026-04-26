"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getGRNAction,
  getGRNsAction,
  createGRNAction,
  updateGRNAction,
  deleteGRNAction,
  confirmGRNAction,
  GoodsReceivedNote,
} from "@/app/_actions/grn-actions";
import { toast } from "sonner";
import { APIResponse } from "@/types";

export type { GoodsReceivedNote };

/**
 * Fetch all GRNs with pagination
 * Standard data - 5 minute refresh interval
 *
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param filters - Optional filters (status, poDocumentNumber)
 * @returns Query result with GRNs array
 *
 * @example
 * const { data: grns } = useGRNs(1, 10, { status: 'DRAFT' })
 */
export const useGRNs = (
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    poDocumentNumber?: string;
  }
) =>
  useQuery({
    queryKey: [QUERY_KEYS.GRN.ALL, page, limit, filters],
    queryFn: async () => {
      const response = await getGRNsAction(page, limit, filters);
      return response.success ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a specific GRN by ID
 *
 * @param grnId - GRN ID to fetch
 * @param initialData - Optional initial data
 * @returns Query result with single GRN
 *
 * @example
 * const { data: grn } = useGRNById(grnId)
 */
export const useGRNById = (grnId: string, initialData?: GoodsReceivedNote) =>
  useQuery({
    queryKey: [QUERY_KEYS.GRN.BY_ID, grnId],
    queryFn: async () => {
      const response = await getGRNAction(grnId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!grnId,
  });

/**
 * Create a new GRN from a Purchase Order
 * Automatically invalidates GRN list queries
 *
 * @param onSuccess - Optional callback after successful creation
 * @returns Mutation object with mutateAsync, isPending, error
 *
 * @example
 * const { mutateAsync: createGRN, isPending } = useCreateGRN();
 * await createGRN({
 *   poDocumentNumber: 'PO-123',
 *   items: [...],
 *   receivedBy: 'user-id'
 * });
 */
export const useCreateGRN = (onSuccess?: (data: GoodsReceivedNote) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poDocumentNumber,
      items,
      receivedBy,
      warehouseLocation,
      notes,
    }: {
      poDocumentNumber: string;
      items: any[];
      receivedBy: string;
      warehouseLocation?: string;
      notes?: string;
    }) => {
      const response = await createGRNAction(
        poDocumentNumber,
        items,
        receivedBy,
        warehouseLocation,
        notes
      );
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      toast.success("GRN created successfully");
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess && response.data) {
        onSuccess(response.data);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create GRN");
    },
  });
};

/**
 * Update an existing GRN
 * Automatically invalidates GRN queries
 *
 * @param grnId - GRN ID to update
 * @param onSuccess - Optional callback after successful update
 * @returns Mutation object with mutateAsync, isPending, error
 *
 * @example
 * const { mutateAsync: updateGRN } = useUpdateGRN(grnId);
 * await updateGRN({
 *   items: [...],
 *   qualityIssues: [...]
 * });
 */
export const useUpdateGRN = (
  grnId: string,
  onSuccess?: (data: GoodsReceivedNote) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      items?: any[];
      receivedBy?: string;
      qualityIssues?: any[];
      warehouseLocation?: string;
      notes?: string;
    }) => {
      const response = await updateGRNAction(grnId, updates);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      toast.success("GRN updated successfully");

      // Update the specific GRN in cache
      queryClient.setQueryData([QUERY_KEYS.GRN.BY_ID, grnId], response.data);

      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess && response.data) {
        onSuccess(response.data);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update GRN");
    },
  });
};

/**
 * Confirm a GRN (Mark as confirmed/received)
 * Automatically invalidates GRN queries
 *
 * @param grnId - GRN ID to confirm
 * @param onSuccess - Optional callback after successful confirmation
 * @returns Mutation object with mutateAsync, isPending, error
 *
 * @example
 * const { mutateAsync: confirmGRN } = useConfirmGRN(grnId);
 * await confirmGRN();
 */
export const useConfirmGRN = (
  grnId: string,
  onSuccess?: (data: GoodsReceivedNote) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await confirmGRNAction(grnId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      toast.success("GRN confirmed successfully");

      queryClient.setQueryData([QUERY_KEYS.GRN.BY_ID, grnId], response.data);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess && response.data) {
        onSuccess(response.data);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to confirm GRN");
    },
  });
};

/**
 * Delete a GRN (only DRAFT GRNs can be deleted)
 * Automatically invalidates GRN queries
 *
 * @param grnId - GRN ID to delete
 * @param onSuccess - Optional callback after successful deletion
 * @returns Mutation object with mutateAsync, isPending, error
 *
 * @example
 * const { mutateAsync: deleteGRN } = useDeleteGRN(grnId);
 * await deleteGRN();
 */
export const useDeleteGRN = (grnId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await deleteGRNAction(grnId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("GRN deleted successfully");

      queryClient.removeQueries({
        queryKey: [QUERY_KEYS.GRN.BY_ID, grnId],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete GRN");
    },
  });
};
