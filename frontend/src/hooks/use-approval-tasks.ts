'use client';

/**
 * Approval Tasks Hooks
 * Reusable React Query hooks for fetching and managing approval tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getApprovalTasks,
  getApprovalTaskDetail,
  getApprovalStats,
  getPendingApprovalCount,
} from '@/app/_actions/workflow-approval-actions';
import { ApprovalTask } from '@/types';
import { QUERY_KEYS } from '@/lib/constants';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch approval tasks with filtering and pagination
 */
export const useApprovalTasks = (
  filters?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    documentType?: string;
    assignedToMe?: boolean;
  },
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.ALL, 'tasks', filters, page, limit],
    queryFn: async () => {
      const response = await getApprovalTasks(filters, page, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch approval tasks');
      }
      return response.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch pending approval tasks for current user
 */
export const usePendingApprovalTasks = () => {
  return useApprovalTasks(
    { status: 'PENDING', assignedToMe: true },
    1,
    50 // Get more pending tasks
  );
};

/**
 * Hook to fetch approval task detail
 */
export const useApprovalTaskDetail = (taskId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.BY_ID, taskId],
    queryFn: async () => {
      const response = await getApprovalTaskDetail(taskId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch task details');
      }
      return response.data;
    },
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch approval statistics
 */
export const useApprovalStats = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.ALL, 'stats'],
    queryFn: async () => {
      const response = await getApprovalStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch approval stats');
      }
      return response.data || {
        totalPending: 0,
        highPriority: 0,
        thisMonth: 0,
        overdue: 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch pending approval count
 */
export const usePendingApprovalCount = (userId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.APPROVALS.PENDING_COUNT, userId],
    queryFn: async () => {
      const response = await getPendingApprovalCount(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch pending count');
      }
      return response.data?.count || 0;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get approval task counts by status
 */
export const useApprovalTaskCounts = () => {
  const pendingQuery = useApprovalTasks({ status: 'PENDING' }, 1, 1);
  const approvedQuery = useApprovalTasks({ status: 'APPROVED' }, 1, 1);
  const rejectedQuery = useApprovalTasks({ status: 'REJECTED' }, 1, 1);

  return {
    pending: pendingQuery.data?.length || 0,
    approved: approvedQuery.data?.length || 0,
    rejected: rejectedQuery.data?.length || 0,
    isLoading: pendingQuery.isLoading || approvedQuery.isLoading || rejectedQuery.isLoading,
  };
};

/**
 * Hook to check if user can perform approval actions
 */
export const useCanApprove = (task?: ApprovalTask, userRole?: string) => {
  return {
    canApprove: task?.status === 'PENDING' && !!userRole,
    canReject: task?.status === 'PENDING' && !!userRole,
    canReassign: task?.status === 'PENDING' && !!userRole,
    isPending: task?.status === 'PENDING',
    isCompleted: task?.status === 'APPROVED' || task?.status === 'REJECTED',
  };
};