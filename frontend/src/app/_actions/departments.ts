"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
  badRequestResponse,
} from "./api-config";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string;
  manager_name?: string;
  parent_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  manager_name?: string;
  parent_id?: string | null;
}

export interface UpdateDepartmentRequest {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  manager_name?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

// ============================================================================
// DEPARTMENT MANAGEMENT
// ============================================================================

/**
 * Get all departments for the current organization
 * Calls: GET /api/v1/organization/departments
 */
export async function getDepartments(
  active?: boolean
): Promise<APIResponse<Department[]>> {
  const params = new URLSearchParams();
  if (active !== undefined) {
    params.set("active", active.toString());
  }

  const url = `/api/v1/organization/departments?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    const departments = response.data.data || [];

    return successResponse(departments, "Departments retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get department by ID
 * Calls: GET /api/v1/organization/departments/{id}
 */
export async function getDepartmentById(
  id: string
): Promise<APIResponse<Department>> {
  if (!id) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(response.data.data ?? null, "Department retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new department
 * Calls: POST /api/v1/organization/departments
 */
export async function createDepartment(
  data: CreateDepartmentRequest
): Promise<APIResponse<Department>> {
  if (!data.name || !data.code) {
    return badRequestResponse("Department name and code are required");
  }

  const url = `/api/v1/organization/departments`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description || "",
        manager_name: data.manager_name || "",
        parent_id: data.parent_id || null,
      },
    });

    return successResponse(response.data.data ?? null, "Department created successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update an existing department
 * Calls: PUT /api/v1/organization/departments/{id}
 */
export async function updateDepartment(
  data: UpdateDepartmentRequest
): Promise<APIResponse<Department>> {
  if (!data.id) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${data.id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: {
        name: data.name,
        code: data.code?.toUpperCase(),
        description: data.description,
        manager_name: data.manager_name,
        parent_id: data.parent_id,
        is_active: data.is_active,
      },
    });

    return successResponse(response.data.data ?? null, "Department updated successfully");
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete a department (soft delete)
 * Calls: DELETE /api/v1/organization/departments/{id}
 */
export async function deleteDepartment(id: string): Promise<APIResponse> {
  if (!id) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${id}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Department deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Restore a deleted department
 * Calls: POST /api/v1/organization/departments/{id}/restore
 */
export async function restoreDepartment(
  id: string
): Promise<APIResponse<Department>> {
  if (!id) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${id}/restore`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    return successResponse(response.data.data ?? null, "Department restored successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get active departments only
 */
export async function getActiveDepartments(): Promise<
  APIResponse<Department[]>
> {
  return getDepartments(true);
}

/**
 * Get all departments (active and inactive)
 */
export async function getAllDepartments(): Promise<APIResponse<Department[]>> {
  return getDepartments();
}

// ============================================================================
// DEPARTMENT MODULES MANAGEMENT
// ============================================================================

/**
 * Get modules assigned to a department
 * Calls: GET /api/v1/organization/departments/{id}/modules
 */
export async function getDepartmentModules(
  departmentId: string
): Promise<APIResponse> {
  if (!departmentId) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${departmentId}/modules`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data || [],
      "Department modules retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Assign module to department
 * Calls: POST /api/v1/organization/departments/{id}/modules
 */
export async function assignModuleToDepartment(
  departmentId: string,
  moduleId: string
): Promise<APIResponse> {
  if (!departmentId || !moduleId) {
    return badRequestResponse("Department ID and Module ID are required");
  }

  const url = `/api/v1/organization/departments/${departmentId}/modules`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        module_id: moduleId,
      },
    });

    return successResponse(
      response.data,
      "Module assigned to department successfully"
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Remove module from department
 * Calls: DELETE /api/v1/organization/departments/{departmentId}/modules/{moduleId}
 */
export async function removeModuleFromDepartment(
  departmentId: string,
  moduleId: string
): Promise<APIResponse> {
  if (!departmentId || !moduleId) {
    return badRequestResponse("Department ID and Module ID are required");
  }

  const url = `/api/v1/organization/departments/${departmentId}/modules/${moduleId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Module removed from department successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}
