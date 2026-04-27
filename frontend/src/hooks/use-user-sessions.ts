'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSessions, revokeSession } from '@/app/_actions/settings';
import { unwrapResult } from '@/lib/session-events';

const QUERY_KEY = 'user-sessions';

/**
 * Hook for fetching and managing the current user's sessions.
 * Calls GET /api/v1/auth/sessions and DELETE /api/v1/auth/sessions/:id
 */
export function useUserSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const result = await getUserSessions();
      unwrapResult(result);
      return result.data as any[];
    },
    staleTime: 60_000,
  });

  const terminate = useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await revokeSession(sessionId);
      unwrapResult(result);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return { ...query, terminate };
}
