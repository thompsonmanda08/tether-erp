"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  submitPurchaseOrderForApproval,
  withdrawPurchaseOrder,
  updatePurchaseOrder,
} from "@/app/_actions/purchase-orders";
import {
  SubmitPurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from "@/types/purchase-order";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Submit purchase order for approval mutation hook
 *
 * Submits a DRAFT purchase order to the workflow engine for approval.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful submission
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const submitMutation = useSubmitPurchaseOrderForApproval(() => {
 *   router.push('/purchase-orders')
 * })
 *
 * await submitMutation.mutateAsync({
 *   purchaseOrderId: 'po-123',
 *   workflowId: 'workflow-1',
 *   submittingUserId: userId,
 *   submittedByName: 'John Doe',
 *   submittedByRole: 'PROCUREMENT_OFFICER',
 *   comments: 'Please review urgently'
 * })
 * ```
 *
 * **Validates: Requirements 1.4, 8.2, 13.1, 13.4, 14.1**
 */
export const useSubmitPurchaseOrderForApproval = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitPurchaseOrderRequest) => {
      const result = await submitPurchaseOrderForApproval(data);
      if (!result.success) {
        throw new Error(result.message || "Failed to submit purchase order");
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(
        result.message || "Purchase order submitted for approval successfully",
      );

      // Invalidate purchase order queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });

      // Invalidate specific purchase order if we have the ID
      if (result.data?.id) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, result.data.id],
        });
      }

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate approval-related queries for approval chain and action tabs
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TASKS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_APPROVALS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_HISTORY],
      });

      // Invalidate generic query keys
      queryClient.invalidateQueries({
        queryKey: ["approvalTasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["approvals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit purchase order");
    },
  });
};

/**
 * Withdraw purchase order mutation hook
 *
 * Withdraws a PENDING purchase order from the approval workflow and returns it to DRAFT status.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful withdrawal
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const withdrawMutation = useWithdrawPurchaseOrder(() => {
 *   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] })
 * })
 *
 * await withdrawMutation.mutateAsync('po-123')
 * ```
 *
 * **Validates: Requirements 8.2, 13.2, 13.4, 14.7**
 */
export const useWithdrawPurchaseOrder = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const result = await withdrawPurchaseOrder(purchaseOrderId);
      if (!result.success) {
        throw new Error(result.message || "Failed to withdraw purchase order");
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message || "Purchase order withdrawn successfully");

      // Invalidate purchase order queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });

      // Invalidate specific purchase order if we have the ID
      if (result.data?.id) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, result.data.id],
        });
      }

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate approval-related queries for approval chain and action tabs
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TASKS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_APPROVALS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_HISTORY],
      });

      // Invalidate generic query keys
      queryClient.invalidateQueries({
        queryKey: ["approvalTasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["approvals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to withdraw purchase order");
    },
  });
};

/**
 * Update purchase order mutation hook
 *
 * Updates a DRAFT or REJECTED purchase order with new field values.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful update
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdatePurchaseOrder(() => {
 *   toast.success('Purchase order updated successfully')
 *   onOpenChange(false)
 * })
 *
 * await updateMutation.mutateAsync({
 *   purchaseOrderId: 'po-123',
 *   poId: 'po-123',
 *   title: 'Updated Title',
 *   description: 'Updated description',
 *   priority: 'HIGH',
 *   budgetCode: 'BUD-001',
 *   costCenter: 'CC-001',
 *   projectCode: 'PROJ-001',
 *   deliveryDate: new Date('2025-12-31')
 * })
 * ```
 *
 * **Validates: Requirements 8.2, 13.2, 13.4, 14.7**
 */
export const useUpdatePurchaseOrder = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePurchaseOrderRequest) => {
      const result = await updatePurchaseOrder(data);
      if (!result.success) {
        throw new Error(result.message || "Failed to update purchase order");
      }
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate purchase order queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });

      // Invalidate specific purchase order
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, variables.purchaseOrderId],
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate audit events for this document
      queryClient.invalidateQueries({
        queryKey: ["audit-events", "purchase_order", variables.purchaseOrderId],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update purchase order");
    },
  });
};
