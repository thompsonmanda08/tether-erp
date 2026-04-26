"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import {
  getApprovalTasks,
  getApprovalTaskDetail,
  approveApprovalTask,
  rejectApprovalTask,
  reassignApprovalTask,
  claimWorkflowTask,
  getApprovalHistory,
  getPendingApprovalCount,
} from "@/app/_actions/workflow-approval-actions";
import {
  ApprovalTask,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
} from "@/types";

/**
 * Fetch approval tasks with pagination and filtering
 * Standard data - 5 minute refresh interval
 *
 * @param filters - Optional filters (status, documentType, assignedToMe)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Query result with approval tasks array
 *
 * @example
 * const { data: tasks } = useApprovalTasks({ assignedToMe: true }, 1, 10)
 */
export const useApprovalTasks = (
  filters?: {
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    documentType?: string;
    priority?: string;
    assignedToMe?: boolean;
    viewAll?: boolean;
  },
  page: number = 1,
  limit: number = 10,
  initialData?: { data: ApprovalTask[]; pagination?: any },
) =>
  useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.ALL, filters, page, limit],
    queryFn: async () => {
      const response = await getApprovalTasks(filters, page, limit);
      if (!response.success) throw new Error(response.message);
      return {
        data: response.data || [],
        pagination: response.pagination,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {}),
  });

/**
 * Fetch single approval task with full details
 *
 * @param taskId - Task ID to fetch
 * @returns Query result with single approval task detail
 *
 * @example
 * const { data: task } = useApprovalTaskDetail(taskId)
 */
export const useApprovalTaskDetail = (taskId: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId],
    queryFn: async () => {
      const response = await getApprovalTaskDetail(taskId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Claim workflow task mutation
 *
 * @param taskId - Task ID to claim
 * @param onSuccess - Callback after successful claim
 * @returns Mutation object
 *
 * @example
 * const claimMutation = useClaimTask(taskId)
 * await claimMutation.mutateAsync()
 */
export const useClaimTask = (taskId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await claimWorkflowTask(taskId);
      if (!response.success) {
        throw new Error(response.message || "Failed to claim task");
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success("Task claimed successfully");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId] });
      // Refresh approval chain + workflow status on the document detail page
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.HISTORY] });
      queryClient.invalidateQueries({ queryKey: ["workflow-status"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.BY_ID] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to claim task");
    },
  });
};

/**
 * Unclaim workflow task mutation
 *
 * @param taskId - Task ID to unclaim
 * @param onSuccess - Callback after successful unclaim
 * @returns Mutation object
 *
 * @example
 * const unclaimMutation = useUnclaimTask(taskId)
 * await unclaimMutation.mutateAsync()
 */
export const useUnclaimTask = (taskId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/v1/approvals/tasks/${taskId}/unclaim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to unclaim task");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Task unclaimed successfully");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.HISTORY] });
      queryClient.invalidateQueries({ queryKey: ["workflow-status"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.BY_ID] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unclaim task");
    },
  });
};

/**
 * Approve approval task mutation (enhanced with version control)
 *
 * @param taskId - Task ID to approve
 * @param onSuccess - Callback after successful approval
 * @returns Mutation object
 *
 * @example
 * const approveMutation = useApproveTask(taskId)
 * await approveMutation.mutateAsync({
 *   comments: 'Approved',
 *   signature: 'data:image/png;base64,...',
 *   stageNumber: 1,
 *   expectedVersion: 1
 * })
 */
export const useApproveTask = (taskId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: ApproveTaskRequest & { expectedVersion?: number }
    ) => {
      const response = await approveApprovalTask(taskId, data);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: (response) => {
      toast.success("Task approved successfully");

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.PENDING_COUNT] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.HISTORY] });
      queryClient.invalidateQueries({ queryKey: ["workflow-status"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD.METRICS] });

      onSuccess?.();
    },
    onError: (error: Error) => {
      if (
        error.message.includes("version") ||
        error.message.includes("modified by another user")
      ) {
        toast.error(
          "Task was modified by another user. Please refresh and try again."
        );
      } else if (
        error.message.includes("claimed by another user") ||
        error.message.includes("claim has expired")
      ) {
        toast.error("Task claim issue: " + error.message);
      } else {
        toast.error(error.message || "Failed to approve task");
      }
    },
  });
};

/**
 * Reject approval task mutation
 *
 * @param taskId - Task ID to reject
 * @param onSuccess - Callback after successful rejection
 * @returns Mutation object
 *
 * @example
 * const rejectMutation = useRejectTask(taskId)
 * await rejectMutation.mutateAsync({
 *   remarks: 'Missing details',
 *   comments: 'Please provide more information',
 *   signature: 'data:image/png;base64,...'
 * })
 */
export const useRejectTask = (taskId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RejectTaskRequest) => {
      const response = await rejectApprovalTask(taskId, data);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: (response) => {
      toast.success("Task rejected successfully");

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.PENDING_COUNT] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.HISTORY] });
      queryClient.invalidateQueries({ queryKey: ["workflow-status"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GRN.BY_ID] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD.METRICS] });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject task");
    },
  });
};

/**
 * Reassign approval task mutation
 *
 * @param taskId - Task ID to reassign
 * @param onSuccess - Callback after successful reassignment
 * @returns Mutation object
 *
 * @example
 * const reassignMutation = useReassignTask(taskId)
 * await reassignMutation.mutateAsync({
 *   newApproverId: 'user-2',
 *   reason: 'Original approver on leave'
 * })
 */
export const useReassignTask = (taskId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReassignTaskRequest) => {
      const response = await reassignApprovalTask(taskId, data);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    onSuccess: () => {
      toast.success("Task reassigned successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reassign task");
    },
  });
};

/**
 * Fetch approval history for a document
 *
 * @param documentId - Document ID to get history for
 * @returns Query result with approval history array
 *
 * @example
 * const { data: history } = useApprovalHistory(documentId)
 */
export const useApprovalHistory = (documentId: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.HISTORY, documentId],
    queryFn: async () => {
      const response = await getApprovalHistory(documentId);
      if (!response.success) throw new Error(response.message);
      return response.data || [];
    },
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Get pending approval count for current user
 *
 * @returns Query result with pending approval count
 *
 * @example
 * const { data: count } = usePendingApprovalCount()
 */
export const usePendingApprovalCount = (initialCount?: number) =>
  useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.PENDING_COUNT],
    queryFn: async () => {
      const response = await getApprovalTasks(
        { status: "PENDING", assignedToMe: true },
        1,
        1
      );
      if (!response.success) throw new Error(response.message);
      // Return total count from pagination metadata or array length
      return (
        (response.data as any)?.total ||
        (Array.isArray(response.data) ? response.data.length : 0)
      );
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...(initialCount !== undefined
      ? { initialData: initialCount, initialDataUpdatedAt: Date.now() }
      : {}),
  });

/**
 * Get pending approval tasks assigned to current user
 *
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Query result with pending approval tasks
 *
 * @example
 * const { data: tasks } = usePendingApprovals(1, 20)
 */
export const usePendingApprovals = (page: number = 1, limit: number = 10) =>
  useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.PENDING, page, limit],
    queryFn: async () => {
      const response = await getApprovalTasks(
        { status: "PENDING", assignedToMe: true },
        page,
        limit
      );
      if (!response.success) throw new Error(response.message);
      return response.data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

/**
 * Combined hook for approval flow component
 * Handles getting task details, claiming, unclaiming, approving, rejecting, and reassigning
 *
 * @param taskId - Task ID to manage
 * @param onSuccess - Callback after any successful action
 * @returns Object with all approval actions
 *
 * @example
 * const workflow = useApprovalWorkflow(taskId, () => {
 *   router.push('/approvals')
 * })
 *
 * // Use in component:
 * const { task, claim, unclaim, approve, reject, reassign } = workflow
 */
export const useApprovalWorkflow = (taskId: string, onSuccess?: () => void) => {
  const { data: task, isLoading, error } = useApprovalTaskDetail(taskId);
  const claimMutation = useClaimTask(taskId, onSuccess);
  const unclaimMutation = useUnclaimTask(taskId, onSuccess);
  const approveMutation = useApproveTask(taskId, onSuccess);
  const rejectMutation = useRejectTask(taskId, onSuccess);
  const reassignMutation = useReassignTask(taskId, onSuccess);

  return {
    // Task data
    task,
    isLoading,
    error,

    // Actions
    claim: () => claimMutation.mutateAsync(),
    unclaim: () => unclaimMutation.mutateAsync(),
    approve: (
      data: Omit<ApproveTaskRequest, "taskId"> & { expectedVersion?: number }
    ) => approveMutation.mutateAsync(data),
    reject: (
      data: Omit<RejectTaskRequest, "taskId"> & { expectedVersion?: number }
    ) => rejectMutation.mutateAsync(data),
    reassign: (data: Omit<ReassignTaskRequest, "taskId">) =>
      reassignMutation.mutateAsync(data),

    // Mutation states
    isClaiming: claimMutation.isPending,
    isUnclaiming: unclaimMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isReassigning: reassignMutation.isPending,
    isProcessing:
      claimMutation.isPending ||
      unclaimMutation.isPending ||
      approveMutation.isPending ||
      rejectMutation.isPending ||
      reassignMutation.isPending,

    // Mutation errors
    claimError: claimMutation.error,
    unclaimError: unclaimMutation.error,
    approveError: approveMutation.error,
    rejectError: rejectMutation.error,
    reassignError: reassignMutation.error,
  };
};
