"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface AdminDashboardMetrics {
  total_organizations: number;
  active_organizations: number;
  trial_organizations: number;
  expired_trials: number;
  total_users: number;
  active_users: number;
  recent_activities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
}

/**
 * Get admin dashboard metrics
 */
export async function getAdminDashboardMetrics(): Promise<
  APIResponse<AdminDashboardMetrics>
> {
  const url = "/api/v1/admin/dashboard";

  try {
    const response = await authenticatedApiClient({ url, method: "GET" });
    return successResponse(
      response?.data?.data || response?.data,
      "Dashboard metrics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}
