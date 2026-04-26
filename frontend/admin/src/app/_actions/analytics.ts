"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface AnalyticsOverview {
  total_users: number;
  total_organizations: number;
  total_revenue: number;
  active_subscriptions: number;
  growth_metrics: {
    user_growth_rate: number;
    organization_growth_rate: number;
    revenue_growth_rate: number;
    churn_rate: number;
  };
  key_metrics: {
    monthly_active_users: number;
    average_session_duration: number;
    feature_adoption_rate: number;
    customer_satisfaction_score: number;
  };
}

export interface UserAnalytics {
  total_users: number;
  active_users: number;
  new_users_this_period: number;
  user_growth_trend: Array<{
    date: string;
    total_users: number;
    new_users: number;
    active_users: number;
  }>;
  user_demographics: {
    by_role: Array<{ role: string; count: number; percentage: number }>;
    by_status: Array<{ status: string; count: number; percentage: number }>;
    by_organization_size: Array<{
      size_range: string;
      count: number;
      percentage: number;
    }>;
  };
  engagement_metrics: {
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    average_session_duration: number;
    sessions_per_user: number;
  };
}

export interface OrganizationAnalytics {
  total_organizations: number;
  active_organizations: number;
  new_organizations_this_period: number;
  organization_growth_trend: Array<{
    date: string;
    total_organizations: number;
    new_organizations: number;
    active_organizations: number;
  }>;
  organization_distribution: {
    by_status: Array<{ status: string; count: number; percentage: number }>;
    by_user_count: Array<{ range: string; count: number; percentage: number }>;
  };
  trial_metrics: {
    trial_organizations: number;
    trial_conversion_rate: number;
    average_trial_duration: number;
    trials_expiring_soon: number;
  };
}

export interface RevenueAnalytics {
  total_revenue: number;
  monthly_recurring_revenue: number;
  annual_recurring_revenue: number;
  revenue_growth_rate: number;
  revenue_trend: Array<{
    date: string;
    revenue: number;
    mrr: number;
    new_revenue: number;
    churn_revenue: number;
  }>;
  revenue_by_tier: Array<{
    tier: string;
    revenue: number;
    percentage: number;
    subscriber_count: number;
  }>;
  financial_metrics: {
    average_revenue_per_user: number;
    customer_lifetime_value: number;
    churn_rate: number;
    net_revenue_retention: number;
  };
}

export interface UsageAnalytics {
  total_api_requests: number;
  active_sessions: number;
  feature_usage: Array<{
    feature_name: string;
    usage_count: number;
    unique_users: number;
    adoption_rate: number;
  }>;
  usage_trends: Array<{
    date: string;
    api_requests: number;
    active_sessions: number;
    unique_users: number;
  }>;
  performance_metrics: {
    average_response_time: number;
    error_rate: number;
    uptime_percentage: number;
    peak_concurrent_users: number;
  };
}

export interface AnalyticsFilters {
  date_range: "7d" | "30d" | "90d" | "1y" | "custom";
  start_date?: string;
  end_date?: string;
  organization_id?: string;
  user_role?: string;
  status?: string;
}

/**
 * Get analytics overview with key metrics
 */
export async function getAnalyticsOverview(
  filters?: AnalyticsFilters,
): Promise<APIResponse<AnalyticsOverview | null>> {
  const params = new URLSearchParams();

  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.organization_id)
    params.append("organization_id", filters.organization_id);

  const url = `/api/v1/admin/analytics/overview${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Analytics overview retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user analytics data
 */
export async function getUserAnalytics(
  filters?: AnalyticsFilters,
): Promise<APIResponse<UserAnalytics | null>> {
  const params = new URLSearchParams();

  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.organization_id)
    params.append("organization_id", filters.organization_id);
  if (filters?.user_role) params.append("user_role", filters.user_role);

  const url = `/api/v1/admin/analytics/users${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User analytics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get organization analytics data
 */
export async function getOrganizationAnalytics(
  filters?: AnalyticsFilters,
): Promise<APIResponse<OrganizationAnalytics | null>> {
  const params = new URLSearchParams();

  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.status) params.append("status", filters.status);

  const url = `/api/v1/admin/analytics/organizations${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization analytics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get revenue analytics data
 */
export async function getRevenueAnalytics(
  filters?: AnalyticsFilters,
): Promise<APIResponse<RevenueAnalytics | null>> {
  const params = new URLSearchParams();

  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);

  const url = `/api/v1/admin/analytics/revenue${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Revenue analytics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get usage analytics data
 */
export async function getUsageAnalytics(
  filters?: AnalyticsFilters,
): Promise<APIResponse<UsageAnalytics | null>> {
  const params = new URLSearchParams();

  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.organization_id)
    params.append("organization_id", filters.organization_id);

  const url = `/api/v1/admin/analytics/usage${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Usage analytics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Export analytics report
 */
export async function exportAnalyticsReport(
  type: "overview" | "users" | "organizations" | "revenue" | "usage",
  format: "csv" | "pdf" | "excel",
  filters?: AnalyticsFilters,
): Promise<APIResponse<{ download_url: string; expires_at: string }>> {
  const params = new URLSearchParams();

  params.append("type", type);
  params.append("format", format);
  if (filters?.date_range) params.append("date_range", filters.date_range);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.organization_id)
    params.append("organization_id", filters.organization_id);

  const url = `/api/v1/admin/analytics/export?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Analytics report export initiated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get custom analytics query
 */
export async function getCustomAnalytics(query: {
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, any>;
  date_range?: string;
  start_date?: string;
  end_date?: string;
}): Promise<APIResponse<any>> {
  const url = "/api/v1/admin/analytics/custom";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: query,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Custom analytics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get analytics dashboard configuration
 */
export async function getAnalyticsDashboardConfig(): Promise<APIResponse<any>> {
  const url = "/api/v1/admin/analytics/dashboard/config";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Dashboard configuration retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update analytics dashboard configuration
 */
export async function updateAnalyticsDashboardConfig(
  config: any,
): Promise<APIResponse<any>> {
  const url = "/api/v1/admin/analytics/dashboard/config";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: config,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Dashboard configuration updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}
