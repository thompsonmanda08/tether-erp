"use server";

import { revalidatePath } from "next/cache";
import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  roles: AdminRole[];
  permissions: string[];
  login_attempts: number;
  is_locked: boolean;
  locked_until?: string;
  two_factor_enabled: boolean;
  session_count: number;
  last_activity_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  assigned_at: string;
  assigned_by: string;
}

export interface AdminUserFilters {
  search?: string;
  is_active?: boolean;
  is_super_admin?: boolean;
  is_locked?: boolean;
  two_factor_enabled?: boolean;
  role_id?: string;
  last_login_days?: number;
  created_after?: string;
  created_before?: string;
}

export interface CreateAdminUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
  /** true = super admin for admin console; false = platform admin for frontend app (personal org created) */
  is_super_admin: boolean;
  send_welcome_email: boolean;
  require_password_change: boolean;
}

export interface UpdateAdminUserRequest {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_super_admin?: boolean;
  role_ids?: string[];
}

export interface AdminUserStats {
  total_admin_users: number;
  active_admin_users: number;
  super_admins: number;
  locked_accounts: number;
  two_factor_enabled: number;
  recent_logins: number;
  never_logged_in: number;
  role_distribution: Array<{
    role_id: string;
    role_name: string;
    user_count: number;
    percentage: number;
  }>;
  activity_stats: {
    daily_active: number;
    weekly_active: number;
    monthly_active: number;
  };
  security_stats: {
    failed_login_attempts: number;
    password_resets: number;
    account_lockouts: number;
  };
}

export interface AdminUserActivity {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AdminUserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
  expires_at: string;
}

/**
 * Get all admin users with filtering
 */
export async function getAdminUsers(
  filters?: AdminUserFilters,
): Promise<APIResponse<AdminUser[]>> {
  const params = new URLSearchParams();

  if (filters?.search) params.append("search", filters.search);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.is_super_admin !== undefined)
    params.append("is_super_admin", filters.is_super_admin.toString());
  if (filters?.is_locked !== undefined)
    params.append("is_locked", filters.is_locked.toString());
  if (filters?.two_factor_enabled !== undefined)
    params.append("two_factor_enabled", filters.two_factor_enabled.toString());
  if (filters?.role_id) params.append("role_id", filters.role_id);
  if (filters?.last_login_days)
    params.append("last_login_days", filters.last_login_days.toString());
  if (filters?.created_after)
    params.append("created_after", filters.created_after);
  if (filters?.created_before)
    params.append("created_before", filters.created_before);

  const url = `/api/v1/admin/admin-users${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin users retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get admin user by ID
 */
export async function getAdminUser(
  userId: string,
): Promise<APIResponse<AdminUser | null>> {
  const url = `/api/v1/admin/admin-users/${userId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Create a new admin user
 */
export async function createAdminUser(
  data: CreateAdminUserRequest,
): Promise<APIResponse<AdminUser>> {
  const url = "/api/v1/admin/admin-users";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: data,
    });

    revalidatePath("/admin/users");
    return successResponse(
      response?.data?.data || response?.data,
      "Admin user created successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update an existing admin user
 */
export async function updateAdminUser(
  data: UpdateAdminUserRequest,
): Promise<APIResponse<AdminUser>> {
  const url = `/api/v1/admin/admin-users/${data.id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: data,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Delete an admin user
 */
export async function deleteAdminUser(
  userId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user deleted successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Activate admin user
 */
export async function activateAdminUser(
  userId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/activate`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user activated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Deactivate admin user
 */
export async function deactivateAdminUser(
  userId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/deactivate`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user deactivated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Unlock admin user account
 */
export async function unlockAdminUser(
  userId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/unlock`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user unlocked successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Reset admin user password
 */
export async function resetAdminUserPassword(
  userId: string,
  sendEmail: boolean = true,
): Promise<APIResponse<{ temporary_password?: string }>> {
  const url = `/api/v1/admin/admin-users/${userId}/reset-password`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: { send_email: sendEmail },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user password reset successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Enable/disable two-factor authentication
 */
export async function toggleTwoFactor(
  userId: string,
  enabled: boolean,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/two-factor`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: { enabled },
    });

    return successResponse(
      response?.data?.data || response?.data,
      `Two-factor authentication ${enabled ? "enabled" : "disabled"} successfully`,
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get admin user statistics
 */
export async function getAdminUserStats(): Promise<
  APIResponse<AdminUserStats | null>
> {
  const url = "/api/v1/admin/admin-users/stats";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user statistics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get admin user activity history
 */
export async function getAdminUserActivity(
  userId: string,
  limit: number = 50,
): Promise<APIResponse<AdminUserActivity[]>> {
  const url = `/api/v1/admin/admin-users/${userId}/activity?limit=${limit}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user activity retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get admin user sessions
 */
export async function getAdminUserSessions(
  userId: string,
): Promise<APIResponse<AdminUserSession[]>> {
  const url = `/api/v1/admin/admin-users/${userId}/sessions`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user sessions retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Terminate admin user session
 */
export async function terminateAdminUserSession(
  userId: string,
  sessionId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/sessions/${sessionId}/terminate`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user session terminated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Terminate all admin user sessions
 */
export async function terminateAllAdminUserSessions(
  userId: string,
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/admin-users/${userId}/sessions/terminate-all`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "All admin user sessions terminated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Export admin users data
 */
export async function exportAdminUsers(
  format: "csv" | "json" | "excel",
  filters?: AdminUserFilters,
): Promise<APIResponse<{ users: any[]; total_count: number; exported_at: string }>> {
  const params = new URLSearchParams();

  params.append("format", format);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.is_super_admin !== undefined)
    params.append("is_super_admin", filters.is_super_admin.toString());

  const url = `/api/v1/admin/admin-users/export?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin users export initiated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Bulk update admin users
 */
export async function bulkUpdateAdminUsers(
  userIds: string[],
  updates: {
    is_active?: boolean;
    add_roles?: string[];
    remove_roles?: string[];
    unlock?: boolean;
    reset_password?: boolean;
  },
): Promise<APIResponse<void>> {
  const url = "/api/v1/admin/admin-users/bulk-update";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        user_ids: userIds,
        updates: updates,
      },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin users updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get available admin roles
 */
export async function getAdminRoles(): Promise<APIResponse<AdminRole[]>> {
  const url = "/api/v1/admin/roles?admin_only=true";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin roles retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Impersonate admin user (for super admins only)
 */
export async function impersonateAdminUser(
  userId: string,
): Promise<APIResponse<{ impersonation_token: string }>> {
  const url = `/api/v1/admin/admin-users/${userId}/impersonate`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Admin user impersonation started successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Promote an admin user to super_admin role
 */
export async function promoteToSuperAdmin(
  userId: string,
): Promise<APIResponse<{ id: string }>> {
  const url = `/api/v1/admin/admin-users/${userId}/promote`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User promoted to super_admin successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Demote a super_admin user back to admin role
 */
export async function demoteFromSuperAdmin(
  userId: string,
): Promise<APIResponse<{ id: string }>> {
  const url = `/api/v1/admin/admin-users/${userId}/demote`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "User demoted from super_admin successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}
