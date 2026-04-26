'use client';

/**
 * Approval History Hooks
 * Reusable React Query hooks for fetching approval history and related data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getApprovalHistory,
  getAvailableApprovers,
  getApprovalWorkflowStatus,
  approveApprovalTask,
  rejectApprovalTask,
  reassignApprovalTask,
} from '@/app/_actions/workflow-approval-actions';
import {
  ApprovalHistory,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
} from '@/types';
import { QUERY_KEYS } from '@/lib/constants';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch approval history for a document
 */
export const useApprovalHistory = (documentId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.HISTORY, documentId],
    queryFn: async () => {
      const response = await getApprovalHistory(documentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch approval history');
      }
      return response.data || [];
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch available approvers for a document type
 */
export const useAvailableApprovers = (documentType: string, stage?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.ALL, 'available-approvers', documentType, stage],
    queryFn: async () => {
      const response = await getAvailableApprovers(documentType, stage);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch available approvers');
      }
      return response.data || [];
    },
    enabled: !!documentType,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch approval workflow status for a document
 */
export const useApprovalWorkflowStatus = (documentId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.ALL, 'workflow-status', documentId],
    queryFn: async () => {
      const response = await getApprovalWorkflowStatus(documentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workflow status');
      }
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to approve an approval task
 */
export const useApproveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: ApproveTaskRequest }) => {
      const response = await approveApprovalTask(taskId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to approve task');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Task approved successfully');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.ALL, 'workflow-status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.PENDING] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.TASKS.ALL] 
      });
      
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS] 
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve task');
    },
  });
};

/**
 * Hook to reject an approval task
 */
export const useRejectTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: RejectTaskRequest }) => {
      const response = await rejectApprovalTask(taskId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to reject task');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Task rejected successfully');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.ALL, 'workflow-status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.PENDING] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.TASKS.ALL] 
      });
      
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS] 
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject task');
    },
  });
};

/**
 * Hook to reassign an approval task
 */
export const useReassignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: ReassignTaskRequest }) => {
      const response = await reassignApprovalTask(taskId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to reassign task');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Task reassigned successfully');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.ALL, 'workflow-status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.PENDING] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.TASKS.ALL] 
      });
      
      // Invalidate available approvers (workload might have changed)
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.APPROVALS.ALL, 'available-approvers'] 
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reassign task');
    },
  });
};

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Combined hook for approval panel data
 * Fetches both approval history and available approvers
 */
export const useApprovalPanelData = (documentId: string, documentType: string) => {
  const historyQuery = useApprovalHistory(documentId);
  const approversQuery = useAvailableApprovers(documentType);
  const statusQuery = useApprovalWorkflowStatus(documentId);

  return {
    // Data
    approvalHistory: historyQuery.data || [],
    availableApprovers: approversQuery.data || [],
    workflowStatus: statusQuery.data,
    
    // Loading states
    isLoadingHistory: historyQuery.isLoading,
    isLoadingApprovers: approversQuery.isLoading,
    isLoadingStatus: statusQuery.isLoading,
    isLoading: historyQuery.isLoading || approversQuery.isLoading || statusQuery.isLoading,
    
    // Error states
    historyError: historyQuery.error,
    approversError: approversQuery.error,
    statusError: statusQuery.error,
    hasError: !!historyQuery.error || !!approversQuery.error || !!statusQuery.error,
    
    // Refetch functions
    refetchHistory: historyQuery.refetch,
    refetchApprovers: approversQuery.refetch,
    refetchStatus: statusQuery.refetch,
    refetchAll: () => {
      historyQuery.refetch();
      approversQuery.refetch();
      statusQuery.refetch();
    },
  };
};