'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { ApprovalTask, ApprovalTaskDetail } from '@/types';
import {
  getApprovalTasks,
  getApprovalTaskDetail,
  getApprovalStats,
  getApprovalHistory,
} from '@/app/_actions/workflow-approval-actions';

/**
 * Fetch all pending approval tasks for the current user
 * Live data - updates frequently with 30-second refresh interval
 *
 * @param params - Query parameters (status filter)
 * @returns Query result with approval tasks array
 *
 * @example
 * const { data: tasks, isLoading } = useGetApprovalTasks({ status: 'pending' })
 */
export const useGetApprovalTasks = (params?: { status?: string }) =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approvals', params?.status],
    queryFn: async () => {
      // Call server action
      const result = await getApprovalTasks(
        params?.status ? { status: params.status as any } : undefined
      );
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch approval tasks');
      }
      return result.data || [];
    },
    staleTime: 0, // Always stale, refetch frequently
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

/**
 * Fetch detailed approval task information
 * Includes related workflow and entity data
 *
 * @param taskId - Approval task ID
 * @returns Query result with approval task detail
 *
 * @example
 * const { data: detail, isLoading } = useGetApprovalTaskDetail(taskId)
 */
export const useGetApprovalTaskDetail = (taskId: string) =>
  useQuery<ApprovalTaskDetail>({
    queryKey: [QUERY_KEYS.TASKS.BY_USER, 'approval-detail', taskId],
    queryFn: async () => {
      // Call server action
      const result = await getApprovalTaskDetail(taskId);
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch task detail');
      }
      return result.data;
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

/**
 * Fetch approval statistics
 * Shows counts and summary data for the dashboard
 *
 * @returns Query result with approval stats
 *
 * @example
 * const { data: stats } = useGetApprovalStats()
 */
export const useGetApprovalStats = () =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS.STATS, 'approvals'],
    queryFn: async () => {
      // Call server action
      const result = await getApprovalStats();
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to fetch approval statistics');
      }
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

/**
 * Fetch task history for an entity
 * Shows all approvals, rejections, and reassignments
 *
 * @param entityId - Entity ID
 * @param entityType - Type of entity
 * @returns Query result with history entries
 *
 * @example
 * const { data: history } = useGetTaskHistory(entityId, entityType)
 */
export const useGetTaskHistory = (entityId: string, entityType: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS.BY_USER, 'history', entityId],
    queryFn: async () => {
      // Call server action
      const result = await getApprovalHistory(entityId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch approval history');
      }
      return result.data || [];
    },
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
  });
