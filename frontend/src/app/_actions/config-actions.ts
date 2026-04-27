"use server";

import authenticatedApiClient, {
  badRequestResponse,
  fromBackend,
  handleError,
  successResponse,
} from "./api-config";
import { revalidatePath } from "next/cache";
import { APIResponse, Pagination } from "@/types";
import { Department } from "@/types/department";

// ============================================================================
// BRANCH MANAGEMENT
// ============================================================================

/**
 * Get all branches with optional filtering
 * Endpoint: GET /api/v1/branches
 * Status: ✅ Documented in API
 * Query Parameters: province_id, town_id, is_active, limit, offset
 */
export async function getBranches(params?: {
  provinceId?: string;
  townId?: string;
  isActive?: boolean;
  page?: number;
  page_size?: number;
}): Promise<APIResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append("page_size", String(params?.page_size || 10));
  queryParams.append("page", String(params?.page || 1));

  if (params?.provinceId) queryParams.append("province_id", params.provinceId);
  if (params?.townId) queryParams.append("town_id", params.townId);
  if (params?.isActive !== undefined)
    queryParams.append("is_active", String(params.isActive));

  const url = `/api/v1/branches${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });
    return fromBackend(response);
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}
/**
 * Get single branch by ID
 * Endpoint: GET /api/v1/branches/{id}
 * Status: ✅ Documented in API
 */
export async function getBranchById(id: string): Promise<APIResponse> {
  const url = `/api/v1/branches/${id}`;

  try {
    const response = await authenticatedApiClient({ url });
    return successResponse(response?.data, "Branch fetched successfully");
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create new branch
 * Endpoint: POST /api/v1/branches
 * Status: ✅ Documented in API
 *
 * NOTE: API expects town_id and province_id (UUIDs), not string names.
 * UI should use dropdowns populated from /api/v1/provinces/with-towns
 */
export async function createBranch({
  name,
  code,
  townId,
  provinceId,
  address,
  isActive = true,
}: {
  name: string;
  code: string;
  townId: string;
  provinceId: string;
  address?: string;
  isActive?: boolean;
}): Promise<APIResponse> {
  const url = `/api/v1/branches`;

  if (!name || !code || !townId || !provinceId) {
    return badRequestResponse(
      "Name, code, town ID, and province ID are required",
    );
  }

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: {
        name,
        code,
        town_id: townId,
        province_id: provinceId,
        address,
        is_active: isActive,
      },
    });
    revalidatePath("/dashboard/system-configs/locations");
    return successResponse(response?.data, "Branch created successfully");
  } catch (error: Error | any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update existing branch
 * Endpoint: PUT /api/v1/branches/{id}
 * Status: ✅ Documented in API
 */
export async function updateBranch({
  id,
  name,
  code,
  townId,
  provinceId,
  address,
  isActive,
}: {
  id: string;
  name: string;
  code: string;
  townId: string;
  provinceId: string;
  address?: string;
  isActive?: boolean;
}): Promise<APIResponse> {
  const url = `/api/v1/branches/${id}`;

  if (!id) {
    return badRequestResponse("Branch ID is required");
  }

  try {
    const response = await authenticatedApiClient({
      url,
      method: "PUT",
      data: {
        name,
        code,
        town_id: townId,
        province_id: provinceId,
        address,
        is_active: isActive,
        manager_id: null,
      },
    });
    revalidatePath("/dashboard/system-configs/locations");
    return successResponse(response?.data, "Branch updated successfully");
  } catch (error: Error | any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete branch
 * Endpoint: DELETE /api/v1/branches/{id}
 * Status: ✅ Documented in API
 */
export async function deleteBranch(id: string): Promise<APIResponse> {
  const url = `/api/v1/branches/${id}`;

  if (!id) {
    return badRequestResponse("Branch ID is required");
  }

  try {
    await authenticatedApiClient({ url, method: "DELETE" });
    revalidatePath("/dashboard/system-configs/locations");
    return successResponse(null, "Branch deleted successfully");
  } catch (error: Error | any) {
    return handleError(error, "DELETE", url);
  }
}

// ============================================================================
// LOCATION REFERENCE DATA
// ============================================================================

/**
 * Get all Zambian provinces
 * Endpoint: GET /api/v1/provinces
 */
export async function getProvinces(): Promise<APIResponse> {
  const url = `/api/v1/provinces`;
  try {
    const response = await authenticatedApiClient({ url });
    return fromBackend(response);
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get towns/districts, optionally filtered by province
 * Endpoint: GET /api/v1/towns?province_id=<uuid>
 */
export async function getTowns(provinceId?: string): Promise<APIResponse> {
  const url = provinceId
    ? `/api/v1/towns?province_id=${provinceId}`
    : `/api/v1/towns`;
  try {
    const response = await authenticatedApiClient({ url });
    return fromBackend(response);
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}

// ============================================================================
// DEPARTMENT MANAGEMENT
// ============================================================================

/**
 * Get all departments with optional filtering
 * Endpoint: GET /api/v1/organization/departments
 * Status: ✅ Documented in API
 * Query Parameters: parent_id, is_active, limit, offset
 */
export async function getDepartments(
  params?: Partial<Pagination> & {
    parent_id?: string;
    is_active?: boolean;
  },
): Promise<APIResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append("page_size", String(params?.page_size || 10));
  queryParams.append("page", String(params?.page || 1));

  if (params?.parent_id) queryParams.append("parent_id", params.parent_id);
  if (params?.is_active !== undefined)
    queryParams.append("is_active", String(params.is_active));

  const url = `/api/v1/organization/departments${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({ url });
    return successResponse(
      response?.data?.data,
      "Departments fetched successfully",
    );
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get single department by ID
 * Endpoint: GET /api/v1/organization/departments/{id}
 * Status: ✅ Documented in API
 */
export async function getDepartmentById(id: string): Promise<APIResponse> {
  const url = `/api/v1/organization/departments/${id}`;

  try {
    const response = await authenticatedApiClient({ url });
    return successResponse(response?.data, "Department fetched successfully");
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}
export async function getDepartmentRiskCategories(
  id: string,
): Promise<APIResponse> {
  const url = `/api/v1/organization/departments/${id}/risk-categories`;
  try {
    const response = await authenticatedApiClient({ url });
    return successResponse(response?.data.data);
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create new department
 * Endpoint: POST /api/v1/organization/departments
 * Status: ✅ Documented in API
 *
 * NOTE: Supports hierarchical departments via parent_id
 */
export async function createDepartment(data: Department): Promise<APIResponse> {
  const url = `/api/v1/organization/departments`;

  if (!data?.name) {
    return badRequestResponse("Name and code are required");
  }

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data,
    });
    revalidatePath("/dashboard/system-configs/departments");
    return successResponse(response?.data, "Department created successfully");
  } catch (error: Error | any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update existing department
 * Endpoint: PUT /api/v1/organization/departments/{id}
 * Status: ✅ Documented in API
 */
export async function updateDepartment(data: Department): Promise<APIResponse> {
  if (!data?.id) {
    return badRequestResponse("Department ID is required");
  }
  const url = `/api/v1/organization/departments/${data?.id}`;

  try {
    const response = await authenticatedApiClient({ url, method: "PUT", data });
    revalidatePath("/dashboard/system-configs/departments");
    return successResponse(response?.data, "Department updated successfully");
  } catch (error: Error | any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete department
 * Endpoint: DELETE /api/v1/organization/departments/{id}
 * Status: ✅ Documented in API
 */
export async function deleteDepartment(id: string): Promise<APIResponse> {
  const url = `/api/v1/organization/departments/${id}`;

  if (!id) {
    return badRequestResponse("Department ID is required");
  }

  try {
    await authenticatedApiClient({
      url,
      method: "DELETE",
    });
    revalidatePath("/dashboard/system-configs/departments");
    return successResponse(null, "Department deleted successfully");
  } catch (error: Error | any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Get modules assigned to a department
 * Endpoint: GET /api/v1/organization/departments/{id}/modules
 * Status: ✅ Documented in API
 */
export async function getDepartmentModules(
  departmentId: string,
): Promise<APIResponse> {
  const url = `/api/v1/organization/departments/${departmentId}/modules`;

  if (!departmentId) {
    return badRequestResponse("Department ID is required");
  }

  try {
    const response = await authenticatedApiClient({ url });
    return successResponse(
      response?.data,
      "Department modules fetched successfully",
    );
  } catch (error: Error | any) {
    return handleError(error, "GET", url);
  }
}
