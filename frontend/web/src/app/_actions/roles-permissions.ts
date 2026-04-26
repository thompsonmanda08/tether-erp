"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface OrganizationRole {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  permissionsCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  id: string;
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

// ============================================================================
// ORGANIZATION ROLE MANAGEMENT
// ============================================================================

/**
 * Get all roles for the current organization
 * Calls: GET /api/v1/organization/roles
 */
export async function getRolesAction(): Promise<
  APIResponse<OrganizationRole[]>
> {
  const url = `/api/v1/organization/roles`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data || [],
      "Roles retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new organization role
 * Calls: POST /api/v1/organization/roles
 */
export async function createRoleAction(
  name: string,
  description?: string,
): Promise<APIResponse<OrganizationRole>> {
  const url = `/api/v1/organization/roles`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        name,
        description: description || "",
        permissions: [],
      },
    });

    return successResponse(response.data.data, "Role created successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update an existing organization role
 * Calls: PUT /api/v1/organization/roles/{id}
 */
export async function updateRoleAction(
  roleId: string,
  name: string,
  description?: string,
): Promise<APIResponse<OrganizationRole>> {
  const url = `/api/v1/organization/roles/${roleId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: {
        name,
        description: description || "",
      },
    });

    return successResponse(response.data.data, "Role updated successfully");
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete an organization role
 * Note: System default roles cannot be deleted
 * Calls: DELETE /api/v1/organization/roles/{id}
 */
export async function deleteRoleAction(roleId: string): Promise<APIResponse> {
  const url = `/api/v1/organization/roles/${roleId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Role deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

// ============================================================================
// ROLE PERMISSIONS MANAGEMENT
// ============================================================================

/**
 * Get all permissions assigned to a specific role
 * Calls: GET /api/v1/organization/roles/{id}/permissions
 */
export async function getRolePermissionsAction(
  roleId: string,
): Promise<APIResponse<string[]>> {
  const url = `/api/v1/organization/roles/${roleId}/permissions`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data || [],
      "Role permissions retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get all available permissions for the organization
 * Calls: GET /api/v1/organization/permissions
 */
export async function getAvailablePermissionsAction(): Promise<
  APIResponse<string[]>
> {
  const url = `/api/v1/organization/permissions`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data || [],
      "Permissions retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Assign a permission to a role
 * Calls: POST /api/v1/organization/roles/{roleId}/permissions/{permissionId}
 */
export async function assignPermissionAction(
  roleId: string,
  permissionId: string,
): Promise<APIResponse> {
  const url = `/api/v1/organization/roles/${roleId}/permissions/${permissionId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(null, "Permission assigned successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Remove a permission from a role
 * Calls: DELETE /api/v1/organization/roles/{roleId}/permissions/{permissionId}
 */
export async function removePermissionAction(
  roleId: string,
  permissionId: string,
): Promise<APIResponse> {
  const url = `/api/v1/organization/roles/${roleId}/permissions/${permissionId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Permission removed successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

// ============================================================================
// LEGACY FUNCTION ALIASES (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use getRolesAction instead
 */
export const fetchOrganizationRoles = getRolesAction;

/**
 * @deprecated Use createRoleAction instead
 */
export const createOrganizationRole = async (data: CreateRoleRequest) =>
  await createRoleAction(data.name, data.description);

/**
 * @deprecated Use updateRoleAction instead
 */
export const updateOrganizationRole = async (data: UpdateRoleRequest) =>
  await updateRoleAction(data.id, data.name || "", data.description);

/**
 * @deprecated Use deleteRoleAction instead
 */
export const deleteOrganizationRole = deleteRoleAction;

// ============================================================================
// ADDITIONAL FUNCTIONS FOR COMPATIBILITY
// ============================================================================

/**
 * Get all roles (alias for getRolesAction for compatibility)
 */
export const getAllRoles = getRolesAction;

/**
 * Create role (compatible with rbac.ts interface)
 */
export async function createRole(
  name: string,
  description: string,
  permissions?: string[],
): Promise<APIResponse<OrganizationRole>> {
  return createRoleAction(name, description);
}

/**
 * Update role (compatible with rbac.ts interface)
 */
export async function updateRole(
  roleId: string,
  name?: string,
  description?: string,
): Promise<APIResponse<OrganizationRole>> {
  if (!name) {
    throw new Error("Role name is required");
  }
  return updateRoleAction(roleId, name, description);
}

/**
 * Add permission to role (alias for assignPermissionAction)
 */
export const addRolePermission = assignPermissionAction;

/**
 * Remove permission from role (alias for removePermissionAction)
 */
export const removeRolePermission = removePermissionAction;

// ============================================================================
// MODULE-BASED PERMISSIONS (from permissions-actions.ts)
// ============================================================================

/**
 * Get role permissions for modules (different system from organization permissions)
 * This is for the module-based permission system
 */
export async function getModuleRolePermissions(
  roleId: string,
): Promise<APIResponse> {
  const url = `/api/v1/roles/${roleId}/permissions`;

  if (!roleId) {
    return {
      success: false,
      message: "Role ID is required",
      data: null,
      status: 400,
      statusText: "BAD REQUEST",
    };
  }

  try {
    const response = await authenticatedApiClient({ url });
    const permissions = response?.data?.data || [];

    return successResponse(
      permissions,
      "Role permissions fetched successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Bulk update multiple role permissions at once
 * Helper function for module-based permissions
 */
export async function bulkUpdateRolePermissions({
  roleId,
  permissions,
}: {
  roleId: string;
  permissions: Array<{
    moduleId: string;
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
    canAssign?: boolean;
    canConfigure?: boolean;
    customPermissions?: Record<string, any>;
    parentModuleId?: string | null;
  }>;
}): Promise<APIResponse> {
  if (!roleId || !permissions || permissions.length === 0) {
    return {
      success: false,
      message: "Role ID and permissions array are required",
      data: null,
      status: 400,
      statusText: "BAD REQUEST",
    };
  }

  const results: Array<{ moduleId: string; success: boolean; error?: string }> =
    [];

  try {
    // Process all permissions sequentially to avoid race conditions
    for (const perm of permissions) {
      const url = `/api/v1/roles/${roleId}/permissions`;

      try {
        await authenticatedApiClient({
          url,
          method: "POST",
          data: {
            module_id: perm.moduleId,
            parent_module_id: perm.parentModuleId || null,
            can_view: perm.canView || false,
            can_create: perm.canCreate || false,
            can_edit: perm.canEdit || false,
            can_delete: perm.canDelete || false,
            can_approve: perm.canApprove || false,
            can_export: perm.canExport || false,
            can_assign: perm.canAssign || false,
            can_configure: perm.canConfigure || false,
            custom_permissions: perm.customPermissions || {},
          },
        });

        results.push({
          moduleId: perm.moduleId,
          success: true,
        });
      } catch (error: any) {
        results.push({
          moduleId: perm.moduleId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (failureCount === 0) {
      return successResponse(
        { results, successCount, failureCount },
        `Successfully updated ${successCount} permissions`,
      );
    } else {
      return {
        success: false,
        message: `Updated ${successCount} permissions, ${failureCount} failed`,
        data: { results, successCount, failureCount },
        status: 207, // Multi-Status
        statusText: "PARTIAL_SUCCESS",
      };
    }
  } catch (error: any) {
    return handleError(
      error,
      "BULK_UPDATE",
      `/api/v1/roles/${roleId}/permissions`,
    );
  }
}

/**
 * Get the current authenticated user's own permissions
 * Calls: GET /api/v1/me/permissions — no specific permission required
 */
export async function getMyPermissions(): Promise<APIResponse<string[]>> {
  const url = `/api/v1/me/permissions`;

  try {
    const response = await authenticatedApiClient({ url, method: "GET" });
    return successResponse(
      response.data?.data || [],
      "Permissions retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

// For backward compatibility, alias the module permissions function
export const getRolePermissions = getModuleRolePermissions;

/**
 * @deprecated Use assignPermissionAction instead
 */
export const assignPermissionToRole = assignPermissionAction;

/**
 * @deprecated Use removePermissionAction instead
 */
export const removePermissionFromRole = removePermissionAction;

/**
 * @deprecated Use getAvailablePermissionsAction instead
 */
export const fetchAvailablePermissions = getAvailablePermissionsAction;
