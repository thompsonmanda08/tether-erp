'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { ActivityLog, ActivityLogsData } from '@/types/activity';

export type { ActivityLog, ActivityLogsData };

export interface ActivityLogsFilters {
  searchTerm?: string;
  action?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch activity logs with optional filtering
 * @param filters - Optional filter parameters
 * @param onSuccess - Optional callback on success
 * @returns Query result with activity logs data
 */
export const useActivityLogs = (
  filters?: ActivityLogsFilters,
  onSuccess?: (data: ActivityLogsData) => void
) => {
  // Build query string from filters
  const queryParams = new URLSearchParams();
  if (filters?.searchTerm) queryParams.append('search', filters.searchTerm);
  if (filters?.action && filters.action !== 'ALL') queryParams.append('action', filters.action);
  if (filters?.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);

  const queryString = queryParams.toString();
  const url = `/api/activity-logs${queryString ? '?' + queryString : ''}`;

  return useQuery({
    queryKey: [QUERY_KEYS.LOGS.ALL, filters],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      const data = await response.json();
      if (onSuccess) onSuccess(data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
