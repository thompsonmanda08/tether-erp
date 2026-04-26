"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
  is_system_role: boolean;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  is_system_permission: boolean;
}

export interface RoleFilters {
  search?: string;
  is_active?: boolean;
  is_system_role?: boolean;
  category?: string;
  has_users?: boolean;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description: string;
  permission_ids: string[];
  is_active: boolean;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: string;
}

export interface RoleStats {
  total_roles: number;
  active_roles: number;
  system_roles: number;
  custom_roles: number;
  total_permissions: number;
  roles_with_users: number;
  most_used_permissions: Array<{
    permission_id: string;
    permission_name: string;
    role_count: number;
  }>;
  role_distribution: Array<{
    role_id: string;
    role_name: string;
    user_count: number;
    percentage: number;
  }>;
}

export interface UserRoleAssignment {
  user_id: string;
  user_name: string;
  user_email: string;
  roles: Array<{
    role_id: string;
    role_name: string;
    assigned_at: string;
    assigned_by: string;
  }>;
}

/**
 * Get all roles with filtering
 */
export async function getRoles(
  filters?: RoleFilters,
): Promise<APIResponse<Role[]>> {
  const params = new URLSearchParams();

  if (filters?.search) params.append("search", filters.search);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.is_system_role !== undefined)
    params.append("is_system_role", filters.is_system_role.toString());
  if (filters?.category) params.append("category", filters.category);
  if (filters?.has_users !== undefined)
    params.append("has_users", filters.has_users.toString());

  const url = `/api/v1/admin/roles${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Roles retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get role by ID
 */
export async function getRole(
  roleId: string,
): Promise<APIResponse<Role | null>> {
  const url = `/api/v1/admin/roles/${roleId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Create a new role
 */
export async function createRole(
  data: CreateRoleRequest,
): Promise<APIResponse<Role>> {
  const url = "/api/v1/admin/roles";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: data,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role created successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update an existing role
 */
export async function updateRole(
  data: UpdateRoleRequest,
): Promise<APIResponse<Role>> {
  const url = `/api/v1/admin/roles/${data.id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: data,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Delete a role
 */
export async function deleteRole(roleId: string): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/roles/${roleId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role deleted successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get all permissions
 */
export async function getPermissions(): Promise<APIResponse<Permission[]>> {
  const url = "/api/v1/admin/permissions";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Permissions retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get permissions grouped by category
 */
export async function getPermissionsByCategory(): Promise<
  APIResponse<Record<string, Permission[]>>
> {
  const url = "/api/v1/admin/permissions/by-category";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Permissions by category retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get role statistics
 */
export async function getRoleStats(): Promise<APIResponse<RoleStats | null>> {
  const url = "/api/v1/admin/roles/stats";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role statistics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get users assigned to a role
 */
export async function getRoleUsers(
  roleId: string,
): Promise<APIResponse<UserRoleAssignment[]>> {
  const url = `/api/v1/admin/roles/${roleId}/users`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role users retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Assign role to users
 */
export async function assignRoleToUsers(
  roleId: string,
  userIds: string[],
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/roles/${roleId}/assign`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: { user_ids: userIds },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role assigned to users successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Remove role from users
 */
export async function removeRoleFromUsers(
  roleId: string,
  userIds: string[],
): Promise<APIResponse<void>> {
  const url = `/api/v1/admin/roles/${roleId}/remove`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: { user_ids: userIds },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role removed from users successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Clone a role
 */
export async function cloneRole(
  roleId: string,
  newName: string,
  newDisplayName: string,
): Promise<APIResponse<Role>> {
  const url = `/api/v1/admin/roles/${roleId}/clone`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        name: newName,
        display_name: newDisplayName,
      },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role cloned successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Export roles data
 */
export async function exportRoles(
  format: "csv" | "json" | "excel",
  filters?: RoleFilters,
): Promise<APIResponse<{ download_url: string; expires_at: string }>> {
  const params = new URLSearchParams();

  params.append("format", format);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.is_system_role !== undefined)
    params.append("is_system_role", filters.is_system_role.toString());

  const url = `/api/v1/admin/roles/export?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Roles export initiated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Bulk update roles
 */
export async function bulkUpdateRoles(
  roleIds: string[],
  updates: {
    is_active?: boolean;
    add_permissions?: string[];
    remove_permissions?: string[];
  },
): Promise<APIResponse<void>> {
  const url = "/api/v1/admin/roles/bulk-update";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        role_ids: roleIds,
        updates: updates,
      },
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Roles updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get role audit history
 */
export async function getRoleAuditHistory(
  roleId: string,
): Promise<APIResponse<any[]>> {
  const url = `/api/v1/admin/roles/${roleId}/audit`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Role audit history retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}
