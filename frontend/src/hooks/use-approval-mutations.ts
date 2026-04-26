'use client';

/**
 * Approval Mutation Hooks
 * React Query mutations for approval, rejection, and reassignment operations
 * These hooks wrap the server actions and handle caching
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveApprovalTask,
  rejectApprovalTask,
  reassignApprovalTask,
  validateSignature,
  getAvailableApprovers,
} from '@/app/_actions/workflow-approval-actions';
import { QUERY_KEYS } from '@/lib/constants';

// ============================================================================
// APPROVAL MUTATION
// ============================================================================

interface ApproveTaskInput {
  taskId: string;
  approverId: string;
  signature: string;
  remarks?: string;
}

/**
 * Hook: Approve a task
 * Handles approval workflow with signature validation
 *
 * @returns Mutation for task approval
 *
 * @example
 * const approveMutation = useApproveTaskMutation();
 * await approveMutation.mutateAsync({
 *   taskId: 'task-1',
 *   approverId: 'user-1',
 *   signature: 'base64-signature',
 *   remarks: 'Looks good'
 * });
 */
export const useApproveTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApproveTaskInput) => {
      // Validate signature first
      const sigValidation = await validateSignature(input.signature);
      if (!sigValidation.success || !sigValidation.data?.valid) {
        throw new Error(sigValidation.data?.message || 'Invalid signature');
      }

      // Call server action
      return await approveApprovalTask(input.taskId, {
        comments: input.remarks,
        signature: input.signature,
        stageNumber: 0,
      });
    },

    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate approval tasks list
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approvals'],
        });

        // Invalidate task detail
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approval-detail', variables.taskId],
        });

        // Invalidate statistics
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.STATS, 'approvals'],
        });

        // Invalidate history
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'history'],
        });

      }
    },

    onError: (error: any) => {
      console.error('❌ Approval failed:', error.message);
    },
  });
};

// ============================================================================
// REJECTION MUTATION
// ============================================================================

interface RejectTaskInput {
  taskId: string;
  rejectorId: string;
  signature: string;
  remarks: string;
  rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
}

/**
 * Hook: Reject a task
 * Handles task rejection with reason and signature
 *
 * @returns Mutation for task rejection
 *
 * @example
 * const rejectMutation = useRejectTaskMutation();
 * await rejectMutation.mutateAsync({
 *   taskId: 'task-1',
 *   rejectorId: 'user-1',
 *   signature: 'base64-signature',
 *   remarks: 'Need more details'
 * });
 */
export const useRejectTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RejectTaskInput) => {
      // Validate signature first
      const sigValidation = await validateSignature(input.signature);
      if (!sigValidation.success || !sigValidation.data?.valid) {
        throw new Error(sigValidation.data?.message || 'Invalid signature');
      }

      // Call server action
      return await rejectApprovalTask(input.taskId, {
        remarks: input.remarks,
        signature: input.signature,
        rejectionType: input.rejectionType || "reject",
      });
    },

    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate all related caches
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approvals'],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approval-detail', variables.taskId],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.STATS, 'approvals'],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'history'],
        });

      }
    },

    onError: (error) => {
      console.error('❌ Rejection failed:', error.message);
    },
  });
};

// ============================================================================
// REASSIGNMENT MUTATION
// ============================================================================

interface ReassignTaskInput {
  taskId: string;
  reassignedBy: string;
  newApproverId: string;
  newApproverName: string;
  reason: string;
}

/**
 * Hook: Reassign a task
 * Handles task reassignment to a different approver
 *
 * @returns Mutation for task reassignment
 *
 * @example
 * const reassignMutation = useReassignTaskMutation();
 * await reassignMutation.mutateAsync({
 *   taskId: 'task-1',
 *   reassignedBy: 'user-1',
 *   newApproverId: 'user-2',
 *   newApproverName: 'Jane Smith',
 *   reason: 'User unavailable'
 * });
 */
export const useReassignTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReassignTaskInput) => {
      // Call server action
      return await reassignApprovalTask(input.taskId, {
        newApproverId: input.newApproverId,
        reason: input.reason,
      });
    },

    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate all related caches
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approvals'],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approval-detail', variables.taskId],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.STATS, 'approvals'],
        });

        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.TASKS.BY_USER, 'history'],
        });

      }
    },

    onError: (error) => {
      console.error('❌ Reassignment failed:', error.message);
    },
  });
};

// ============================================================================
// UTILITY MUTATIONS
// ============================================================================

/**
 * Hook: Validate digital signature
 * Checks if signature is valid before submission
 *
 * @returns Mutation for signature validation
 *
 * @example
 * const validateMutation = useValidateSignatureMutation();
 * const result = await validateMutation.mutateAsync('base64-signature');
 */
export const useValidateSignatureMutation = () => {
  return useMutation({
    mutationFn: async (signature: string) => {
      return await validateSignature(signature);
    },

    onError: (error) => {
      console.error('❌ Signature validation failed:', error.message);
    },
  });
};

/**
 * Hook: Get available approvers for reassignment
 * Fetches list of users who can take over the approval
 *
 * @returns Mutation for fetching approvers
 *
 * @example
 * const getApproversMutation = useGetAvailableApproversMutation();
 * const result = await getApproversMutation.mutateAsync('task-1');
 */
export const useGetAvailableApproversMutation = () => {
  return useMutation({
    mutationFn: async ({ documentType, stage }: { documentType: string; stage?: number }) => {
      return await getAvailableApprovers(documentType, stage);
    },

    onError: (error) => {
      console.error('❌ Failed to fetch approvers:', error.message);
    },
  });
};

// ============================================================================
// COMBINED MUTATION HOOK
// ============================================================================

/**
 * Hook: Combined approval actions
 * Provides all three mutations (approve, reject, reassign) in one hook
 *
 * @returns Object with all approval mutations
 *
 * @example
 * const { approve, reject, reassign } = useApprovalActions();
 * await approve.mutateAsync({ taskId: 'task-1', ... });
 */
export const useApprovalActions = () => {
  const approve = useApproveTaskMutation();
  const reject = useRejectTaskMutation();
  const reassign = useReassignTaskMutation();

  return {
    approve,
    reject,
    reassign,
    isLoading:
      approve.isPending || reject.isPending || reassign.isPending,
    isError:
      approve.isError || reject.isError || reassign.isError,
    error:
      approve.error || reject.error || reassign.error,
  };
};
