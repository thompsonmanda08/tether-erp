"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  addQualityIssueToGRN,
  removeQualityIssueFromGRN,
  updateQualityIssueInGRN,
  type GoodsReceivedNote,
} from "@/app/_actions/grn-actions";
import type { QualityIssue } from "@/types/goods-received-note";

/**
 * Hook for adding a quality issue to a GRN
    id: string;
    itemNumber: number;
    description: string;
    poQuantity: number;
    receivedQuantity: number;
    unit: string;
    variance: number;
    damage: number;
    damageNotes?: string;
    condition: "GOOD" | "DAMAGED" | "PARTIAL";
  }>;
  qualityIssues: QualityIssue[];
  notes?: string;
  currentStage: number;
  stageName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mutation hook for adding a quality issue to a GRN
 * Automatically invalidates related GRN queries and updates local cache
 *
 * @param grnId - The GRN ID to add a quality issue to
 * @param onSuccess - Optional callback after successful mutation
 * @returns Mutation object with mutateAsync, isPending, and error
 *
 * @example
 * ```typescript
 * const { addIssue, isPending, error } = useAddQualityIssueMutation(grnId);
 * await addIssue({
 *   itemId: 'item-123',
 *   description: 'Damaged corner',
 *   severity: 'MEDIUM'
 * });
 * ```
 */
export function useAddQualityIssueMutation(
  grnId: string,
  onSuccess?: (data: GoodsReceivedNote) => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (issue: Omit<QualityIssue, "id">) => {
      const result = await addQualityIssueToGRN(grnId, issue);
      return result;
    },
    onSuccess: (updatedGRN) => {
      // Update the GRN query cache with the updated data
      queryClient.setQueryData([QUERY_KEYS.GRN.BY_ID, grnId], updatedGRN.data);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      // Call optional success callback
      if (onSuccess && updatedGRN.data) {
        onSuccess(updatedGRN.data);
      }
    },
    onError: (error: Error) => {
      console.error("Failed to add quality issue:", error);
    },
  });

  return {
    addIssue: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Mutation hook for removing a quality issue from a GRN
 * Automatically invalidates related GRN queries
 *
 * @param grnId - The GRN ID
 * @param onSuccess - Optional callback after successful mutation
 * @returns Mutation object with mutateAsync, isPending, and error
 *
 * @example
 * ```typescript
 * const { removeIssue, isPending } = useRemoveQualityIssueMutation(grnId);
 * await removeIssue('issue-123');
 * ```
 */
export function useRemoveQualityIssueMutation(
  grnId: string,
  onSuccess?: (data: GoodsReceivedNote) => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (issueId: string) => {
      const result = await removeQualityIssueFromGRN(grnId, issueId);
      return result;
    },
    onSuccess: (updatedGRN) => {
      queryClient.setQueryData([QUERY_KEYS.GRN.BY_ID, grnId], updatedGRN.data);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess && updatedGRN.data) {
        onSuccess(updatedGRN.data);
      }
    },
    onError: (error: Error) => {
      console.error("Failed to remove quality issue:", error);
    },
  });

  return {
    removeIssue: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Mutation hook for updating a quality issue in a GRN
 * Automatically invalidates related GRN queries
 *
 * @param grnId - The GRN ID
 * @param onSuccess - Optional callback after successful mutation
 * @returns Mutation object with mutateAsync, isPending, and error
 *
 * @example
 * ```typescript
 * const { updateIssue, isPending } = useUpdateQualityIssueMutation(grnId);
 * await updateIssue({
 *   issueId: 'issue-123',
 *   updates: { severity: 'HIGH' }
 * });
 * ```
 */
export function useUpdateQualityIssueMutation(
  grnId: string,
  onSuccess?: (data: GoodsReceivedNote) => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      issueId,
      updates,
    }: {
      issueId: string;
      updates: Partial<Omit<QualityIssue, "id">>;
    }) => {
      const result = await updateQualityIssueInGRN(grnId, issueId, updates);
      return result;
    },
    onSuccess: (updatedGRN) => {
      queryClient.setQueryData([QUERY_KEYS.GRN.BY_ID, grnId], updatedGRN.data);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GRN.ALL],
      });

      if (onSuccess && updatedGRN.data) {
        onSuccess(updatedGRN.data);
      }
    },
    onError: (error: Error) => {
      console.error("Failed to update quality issue:", error);
    },
  });

  return {
    updateIssue: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * TODO: Implement additional GRN mutations for:
 * - useCreateGRNMutation() - Create a new GRN from PO
 * - useUpdateGRNMutation() - Update GRN details
 * - useApproveGRNMutation() - Approve a GRN
 * - useRejectGRNMutation() - Reject a GRN
 * - useConfirmGRNMutation() - Confirm GRN receipt
 *
 * These will require corresponding server actions that call the backend API.
 */
