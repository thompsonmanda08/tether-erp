"use client";

/**
 * Quality Issue Mutations
 * React Query mutations for GRN quality issue operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addQualityIssueToGRN,
  removeQualityIssueFromGRN,
  updateQualityIssueInGRN,
} from "@/app/_actions/grn-actions";
import type {
  QualityIssue,
  GoodsReceivedNote,
} from "@/types/goods-received-note";

/**
 * Mutation hook for adding a quality issue to a GRN
 * Automatically invalidates related queries and updates local state
 */
export function useAddQualityIssueMutation(grnId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: Omit<QualityIssue, "id">) => {
      const result = await addQualityIssueToGRN(grnId, issue);
      return result;
    },
    onSuccess: (updatedGRN) => {
      // Update the GRN query cache with the updated data
      queryClient.setQueryData(["grn", grnId], updatedGRN);

      // Invalidate related queries if needed
      queryClient.invalidateQueries({
        queryKey: ["grns"],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to add quality issue:", error);
    },
  });
}

/**
 * Mutation hook for removing a quality issue from a GRN
 */
export function useRemoveQualityIssueMutation(grnId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      const result = await removeQualityIssueFromGRN(grnId, issueId);
      return result;
    },
    onSuccess: (updatedGRN) => {
      queryClient.setQueryData(["grn", grnId], updatedGRN);
      queryClient.invalidateQueries({
        queryKey: ["grns"],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to remove quality issue:", error);
    },
  });
}

/**
 * Mutation hook for updating a quality issue in a GRN
 */
export function useUpdateQualityIssueMutation(grnId: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.setQueryData(["grn", grnId], updatedGRN);
      queryClient.invalidateQueries({
        queryKey: ["grns"],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update quality issue:", error);
    },
  });
}
