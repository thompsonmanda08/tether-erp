"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient from "./api-config";
import type { UserActivityFilters } from "@/types/activity";
import { deleteSession, verifySession } from "@/lib/auth";

// ================== USER-FACING ENDPOINTS ==================

/**
 * Get current user's own activity log
 */
export async function getUserActivity(
  filters?: UserActivityFilters,
): Promise<APIResponse> {
  try {
    const params: Record<string, string> = {};
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.actionType) params.action_type = filters.actionType;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;

    const response = await authenticatedApiClient({
      url: "/api/v1/auth/activity",
      method: "GET",
      params,
    });

    return {
      success: true,
      message: "Activity retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve activity",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

// ================== ADMIN ENDPOINTS ==================

/**
 * Admin: Get a specific user's activity log
 */
export async function getAdminUserActivity(
  userId: string,
  filters?: UserActivityFilters,
): Promise<APIResponse> {
  try {
    const params: Record<string, string> = {};
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.actionType) params.action_type = filters.actionType;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;

    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/activity`,
      method: "GET",
      params,
    });

    return {
      success: true,
      message: "Activity retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve user activity",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Get a specific user's sessions
 */
export async function getAdminUserSessions(
  userId: string,
): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/sessions`,
      method: "GET",
    });

    return {
      success: true,
      message: "Sessions retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve sessions",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Terminate a specific user session
 */
export async function adminTerminateUserSession(
  userId: string,
  sessionId: string,
): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/sessions/${sessionId}`,
      method: "DELETE",
    });

    // If the admin is terminating their own session, clear the Next.js session cookie
    const { session } = await verifySession();
    const currentUserId = session?.user?.id || session?.user_id;
    let shouldLogout = false;
    if (currentUserId && currentUserId === userId) {
      try {
        await deleteSession();
      } catch {
        /* non-fatal */
      }
      shouldLogout = true;
    }

    return {
      success: true,
      message: "Session terminated successfully",
      data: { ...response.data.data, shouldLogout },
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to terminate session",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Terminate all sessions for a user
 */
export async function adminTerminateAllSessions(
  userId: string,
): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/sessions`,
      method: "DELETE",
    });

    // If the admin is terminating their own sessions, clear the Next.js session cookie
    const { session } = await verifySession();
    const currentUserId = session?.user?.id || session?.user_id;
    let shouldLogout = false;
    if (currentUserId && currentUserId === userId) {
      try {
        await deleteSession();
      } catch {
        /* non-fatal */
      }
      shouldLogout = true;
    }

    return {
      success: true,
      message: "All sessions terminated successfully",
      data: { ...response.data.data, shouldLogout },
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to terminate sessions",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Get security events for a user
 */
export async function getAdminUserSecurityEvents(
  userId: string,
  filters?: { page?: number; limit?: number },
): Promise<APIResponse> {
  try {
    const params: Record<string, string> = {};
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);

    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/security-events`,
      method: "GET",
      params,
    });

    return {
      success: true,
      message: "Security events retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve security events",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Get login history for a user
 */
export async function getAdminUserLoginHistory(
  userId: string,
  filters?: { page?: number; limit?: number },
): Promise<APIResponse> {
  try {
    const params: Record<string, string> = {};
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);

    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/login-history`,
      method: "GET",
      params,
    });

    return {
      success: true,
      message: "Login history retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve login history",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Get work statistics for a specific user
 */
export async function getAdminUserWorkStats(
  userId: string,
): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/work-stats`,
      method: "GET",
    });

    return {
      success: true,
      message: "User statistics retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve user statistics",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Export user activity log via authenticated request.
 * Returns a Blob URL that the caller can trigger as a file download.
 */
export async function exportUserActivity(
  userId: string,
  format: "csv" | "json" = "csv",
  filters?: UserActivityFilters,
): Promise<APIResponse> {
  try {
    const params: Record<string, string> = { format };
    if (filters?.actionType) params.action_type = filters.actionType;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;

    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/activity/export`,
      method: "GET",
      params,
      responseType: "blob",
    });

    const contentType = format === "json" ? "application/json" : "text/csv";
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    const filename = `activity-${userId}-${new Date().toISOString().slice(0, 10)}.${format}`;

    return {
      success: true,
      message: "Export ready",
      data: { blobUrl, filename },
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to export activity",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Admin: Impersonate a user within the caller's organization.
 * Only org admins may impersonate; the action is audit-logged on the backend.
 */
export async function impersonateUser(userId: string): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${userId}/impersonate`,
      method: "POST",
    });

    return {
      success: true,
      message: "Impersonation token generated successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to impersonate user",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}
