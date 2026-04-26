'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserActivity } from '@/app/_actions/activity';
import type { UserActivityFilters } from '@/types/activity';
import { unwrapResult } from '@/lib/session-events';

const QUERY_KEY = 'user-activity-logs';

/**
 * Hook for fetching the current user's own activity log.
 * Calls GET /api/v1/auth/activity
 */
export function useUserActivityLogs(filters?: UserActivityFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      const result = await getUserActivity(filters);
      unwrapResult(result);
      return result.data;
    },
    staleTime: 30_000,
  });
}
