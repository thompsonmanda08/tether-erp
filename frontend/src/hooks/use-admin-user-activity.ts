'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUserActivity,
  getAdminUserSessions,
  getAdminUserSecurityEvents,
  getAdminUserLoginHistory,
  getAdminUserWorkStats,
  adminTerminateUserSession,
  adminTerminateAllSessions,
} from '@/app/_actions/activity';
import type { UserActivityFilters } from '@/types/activity';
import { unwrapResult } from '@/lib/session-events';

/**
 * Hook for fetching a specific user's activity log (admin view).
 */
export function useAdminUserActivity(userId: string, filters?: UserActivityFilters) {
  return useQuery({
    queryKey: ['admin-user-activity', userId, filters],
    queryFn: async () => {
      const result = await getAdminUserActivity(userId, filters);
      unwrapResult(result);
      return result.data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching a specific user's work statistics (admin view).
 */
export function useAdminUserWorkStats(userId: string) {
  return useQuery({
    queryKey: ['admin-user-work-stats', userId],
    queryFn: async () => {
      const result = await getAdminUserWorkStats(userId);
      unwrapResult(result);
      return result.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/**
 * Hook for fetching a specific user's sessions (admin view).
 */
export function useAdminUserSessions(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-user-sessions', userId],
    queryFn: async () => {
      const result = await getAdminUserSessions(userId);
      unwrapResult(result);
      return result.data as any[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const terminate = useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await adminTerminateUserSession(userId, sessionId);
      unwrapResult(result);
      return result.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-sessions', userId] });
      if (data?.shouldLogout) {
        window.location.href = '/login';
      }
    },
  });

  const terminateAll = useMutation({
    mutationFn: async () => {
      const result = await adminTerminateAllSessions(userId);
      unwrapResult(result);
      return result.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-sessions', userId] });
      if (data?.shouldLogout) {
        window.location.href = '/login';
      }
    },
  });

  return { ...query, terminate, terminateAll };
}

/**
 * Hook for fetching a specific user's security events (admin view).
 */
export function useAdminUserSecurityEvents(
  userId: string,
  filters?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['admin-user-security-events', userId, filters],
    queryFn: async () => {
      const result = await getAdminUserSecurityEvents(userId, filters);
      unwrapResult(result);
      return result.data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching a specific user's login history (admin view).
 */
export function useAdminUserLoginHistory(
  userId: string,
  filters?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['admin-user-login-history', userId, filters],
    queryFn: async () => {
      const result = await getAdminUserLoginHistory(userId, filters);
      unwrapResult(result);
      return result.data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
