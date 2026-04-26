"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "active" | "suspended" | "pending" | "inactive";
  email_verified: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_count: number;
  organizations: UserOrganization[];
  profile?: {
    avatar_url?: string;
    department?: string;
    job_title?: string;
    phone?: string;
  };
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_domain: string;
  role: string;
  status: "active" | "suspended" | "pending";
  joined_at: string;
  permissions: string[];
  is_primary: boolean;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  organization_id?: string;
  organization_name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  status?: "active" | "suspended" | "pending" | "inactive";
  phone?: string;
  profile?: {
    department?: string;
    job_title?: string;
    phone?: string;
  };
}

export interface UserFilters {
  search?: string;
  status?: "active" | "suspended" | "pending" | "inactive" | "all";
  role?: string;
  organization_id?: string;
  email_verified?: boolean;
  page?: number;
  limit?: number;
  sort_by?: "name" | "email" | "created_at" | "last_login";
  sort_order?: "asc" | "desc";
}

/**
 * Get all platform users with filters and pagination
 */
export async function getAllUsers(filters?: UserFilters): Promise<
  APIResponse<{
    users: PlatformUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>
> {
  const params = new URLSearchParams();

  if (filters?.search) params.append("search", filters.search);
  if (filters?.status && filters.status !== "all")
    params.append("status", filters.status);
  if (filters?.role) params.append("role", filters.role);
  if (filters?.organization_id)
    params.append("organization_id", filters.organization_id);
  if (filters?.email_verified !== undefined)
    params.append("email_verified", filters.email_verified.toString());
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.sort_by) params.append("sort_by", filters.sort_by);
  if (filters?.sort_order) params.append("sort_order", filters.sort_order);

  const url = `/api/v1/admin/users${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Users retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user by ID with detailed information
 */
export async function getUserById(
  userId: string,
): Promise<APIResponse<PlatformUser | null>> {
  const url = `/api/v1/admin/users/${userId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update user information (Admin only)
 */
export async function updateUser(
  userId: string,
  request: UpdateUserRequest,
): Promise<APIResponse<PlatformUser | null>> {
  const url = `/api/v1/admin/users/${userId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: request,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Suspend/Unsuspend user (Admin only)
 */
export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended" | "inactive",
  reason?: string,
): Promise<APIResponse<PlatformUser | null>> {
  const url = `/api/v1/admin/users/${userId}/status`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: { status, reason },
    });

    return successResponse(
      response?.data?.data || response?.data,
      `User ${status} successfully`,
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user activity logs
 */
export async function getUserActivity(
  userId: string,
  page: number = 1,
  limit: number = 50,
): Promise<
  APIResponse<{
    activities: UserActivity[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  const url = `/api/v1/admin/users/${userId}/activity?page=${page}&limit=${limit}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User activity retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user active sessions
 */
export async function getUserSessions(
  userId: string,
): Promise<APIResponse<UserSession[]>> {
  const url = `/api/v1/admin/users/${userId}/sessions`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User sessions retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Terminate user session (Admin only)
 */
export async function terminateUserSession(
  userId: string,
  sessionId: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/admin/users/${userId}/sessions/${sessionId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Session terminated successfully");
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Terminate all user sessions (Admin only)
 */
export async function terminateAllUserSessions(
  userId: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/admin/users/${userId}/sessions`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "All sessions terminated successfully");
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Reset user password (Admin only)
 */
export async function resetUserPassword(
  userId: string,
  sendEmail: boolean = true,
): Promise<APIResponse<{ temporary_password?: string }>> {
  const url = `/api/v1/admin/users/${userId}/reset-password`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: { send_email: sendEmail },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Password reset successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Impersonate user (Super Admin only)
 */
export async function impersonateUser(userId: string): Promise<
  APIResponse<{
    impersonation_token: string;
    expires_at: string;
  }>
> {
  const url = `/api/v1/admin/users/${userId}/impersonate`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Impersonation token generated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user organization memberships
 */
export async function getUserOrganizations(
  userId: string,
): Promise<APIResponse<UserOrganization[]>> {
  const url = `/api/v1/admin/users/${userId}/organizations`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User organizations retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update user organization role/status
 */
export async function updateUserOrganizationRole(
  userId: string,
  organizationId: string,
  role: string,
  status?: "active" | "suspended",
): Promise<APIResponse<UserOrganization | null>> {
  const url = `/api/v1/admin/users/${userId}/organizations/${organizationId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: { role, status },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User organization role updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(
  userId: string,
  organizationId: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/admin/users/${userId}/organizations/${organizationId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "User removed from organization successfully");
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get user statistics for dashboard
 */
export async function getUserStatistics(): Promise<
  APIResponse<{
    total_users: number;
    active_users: number;
    suspended_users: number;
    pending_users: number;
    users_created_this_month: number;
    users_logged_in_today: number;
    top_organizations_by_users: Array<{
      organization_id: string;
      organization_name: string;
      user_count: number;
    }>;
  }>
> {
  const url = "/api/v1/admin/users/statistics";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User statistics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}
