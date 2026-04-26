import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getUserAnalytics,
  getOrganizationAnalytics,
  getUsageAnalytics,
  exportAnalyticsReport,
  type AnalyticsFilters,
} from "@/app/_actions/analytics";
import { queryKeys } from "@/lib/query-keys";

export function useAnalyticsOverview(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(filters),
    queryFn: async () => {
      const result = await getAnalyticsOverview(filters);
      if (!result.success) throw new Error(result.message);
      return (
        result.data || {
          total_users: 0,
          total_organizations: 0,
          growth_metrics: {
            user_growth_rate: 0,
            organization_growth_rate: 0,
          },
          key_metrics: {
            monthly_active_users: 0,
            average_session_duration: 0,
            feature_adoption_rate: 0,
            customer_satisfaction_score: 0,
          },
        }
      );
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useUserAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.users(filters),
    queryFn: async () => {
      const result = await getUserAnalytics(filters);
      if (!result.success) throw new Error(result.message);
      return (
        result.data || {
          total_users: 0,
          active_users: 0,
          new_users_this_period: 0,
          user_growth_trend: [],
          user_demographics: { by_role: [], by_status: [], by_organization_size: [] },
          engagement_metrics: {
            daily_active_users: 0,
            weekly_active_users: 0,
            monthly_active_users: 0,
            average_session_duration: 0,
            sessions_per_user: 0,
          },
        }
      );
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useOrganizationAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.organizations(filters),
    queryFn: async () => {
      const result = await getOrganizationAnalytics(filters);
      if (!result.success) throw new Error(result.message);
      return (
        result.data || {
          total_organizations: 0,
          active_organizations: 0,
          new_organizations_this_period: 0,
          organization_growth_trend: [],
          organization_distribution: { by_status: [], by_user_count: [] },
        }
      );
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useUsageAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.usage(filters),
    queryFn: async () => {
      const result = await getUsageAnalytics(filters);
      if (!result.success) throw new Error(result.message);
      return (
        result.data || {
          total_api_requests: 0,
          active_sessions: 0,
          feature_usage: [],
          usage_trends: [],
          performance_metrics: {
            average_response_time: 0,
            error_rate: 0,
            uptime_percentage: 100,
            peak_concurrent_users: 0,
          },
        }
      );
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useExportAnalyticsReport() {
  return useMutation({
    mutationFn: ({
      type,
      format,
      filters,
    }: {
      type: "overview" | "users" | "organizations" | "usage";
      format: "csv" | "pdf" | "excel";
      filters?: AnalyticsFilters;
    }) => exportAnalyticsReport(type, format, filters),
  });
}
