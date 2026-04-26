'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { getTasksForUser, getTaskStats } from '@/app/_actions/tasks';
import { Task, TaskStatus, TaskStats } from '@/types/tasks';

/**
 * Fetch all tasks for a user with optional status filter
 * Live data - updates frequently (30 second refetch interval)
 *
 * @param userId - User ID to fetch tasks for
 * @param status - Optional task status filter (PENDING, IN_PROGRESS, COMPLETED)
 * @param initialTasks - Optional initial data from server component
 * @returns Query result with tasks array
 *
 * @example
 * const { data: tasks, isLoading } = useTasks(userId, 'PENDING', initialTasks)
 */
export const useTasks = (userId: string, status?: TaskStatus, initialTasks?: Task[]) =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS.BY_USER, userId, status],
    queryFn: async () => {
      const response = await getTasksForUser(userId, status);
      return response.success ? response.data : [];
    },
    initialData: initialTasks,
    staleTime: 0, // Always stale
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
  });

/**
 * Fetch task statistics for a user
 * Shows counts of tasks by status and priority
 *
 * @param userId - User ID to fetch stats for
 * @param initialStats - Optional initial data from server component
 * @returns Query result with task statistics
 *
 * @example
 * const { data: stats } = useTaskStats(userId, initialStats)
 * // stats.pendingTasks, stats.completedTasks, stats.overdueTasks, etc.
 */
export const useTaskStats = (userId: string, initialStats?: TaskStats) =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS.STATS, userId],
    queryFn: async () => {
      const response = await getTaskStats(userId);
      return response.success ? response.data : null;
    },
    initialData: initialStats,
    staleTime: 0, // Always stale
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

/**
 * Fetch pending tasks for a user
 * Convenience hook for common use case
 *
 * @param userId - User ID
 * @param initialTasks - Optional initial data
 * @returns Query result with pending tasks only
 *
 * @example
 * const { data: pendingTasks } = usePendingTasks(userId)
 */
export const usePendingTasks = (userId: string, initialTasks?: Task[]) =>
  useTasks(userId, 'PENDING', initialTasks);

/**
 * Fetch completed tasks for a user
 * Convenience hook for common use case
 *
 * @param userId - User ID
 * @param initialTasks - Optional initial data
 * @returns Query result with completed tasks only
 *
 * @example
 * const { data: completedTasks } = useCompletedTasks(userId)
 */
export const useCompletedTasks = (userId: string, initialTasks?: Task[]) =>
  useTasks(userId, 'COMPLETED', initialTasks);

/**
 * Fetch in-progress tasks for a user
 * Convenience hook for common use case
 *
 * @param userId - User ID
 * @param initialTasks - Optional initial data
 * @returns Query result with in-progress tasks only
 *
 * @example
 * const { data: inProgressTasks } = useInProgressTasks(userId)
 */
export const useInProgressTasks = (userId: string, initialTasks?: Task[]) =>
  useTasks(userId, 'IN_PROGRESS', initialTasks);
