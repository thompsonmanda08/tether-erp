"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, { handleError, successResponse, badRequestResponse } from "./api-config";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UserDepartmentInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  joined_at: string;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
}

export interface DepartmentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  joined_at: string;
  department_id?: string | null;
}

// ============================================================================
// USER-DEPARTMENT ASSIGNMENT
// ============================================================================

/**
 * Assign a user to a department
 * Calls: POST /api/v1/users/{userId}/department/{departmentId}
 */
export async function assignUserToDepartment(
  userId: string,
  departmentId: string
): Promise<APIResponse> {
  if (!userId || !departmentId) {
    return badRequestResponse("User ID and Department ID are required");
  }

  const url = `/api/v1/users/${userId}/department/${departmentId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST"
    });

    return successResponse(response.data, "User assigned to department successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get the department assigned to a user
 * Calls: GET /api/v1/users/{userId}/department
 */
export async function getUserDepartment(userId: string): Promise<APIResponse> {
  if (!userId) {
    return badRequestResponse("User ID is required");
  }

  const url = `/api/v1/users/${userId}/department`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET"
    });

    return successResponse(response.data.data, "User department retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Remove a user from their current department
 * Calls: DELETE /api/v1/users/{userId}/department
 */
export async function removeUserFromDepartment(userId: string): Promise<APIResponse> {
  if (!userId) {
    return badRequestResponse("User ID is required");
  }

  const url = `/api/v1/users/${userId}/department`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "DELETE"
    });

    return successResponse(response.data, "User removed from department successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Get all users in a specific department
 * Calls: GET /api/v1/organization/departments/{departmentId}/users
 */
export async function getDepartmentUsers(departmentId: string): Promise<APIResponse<DepartmentUser[]>> {
  if (!departmentId) {
    return badRequestResponse("Department ID is required");
  }

  const url = `/api/v1/organization/departments/${departmentId}/users`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET"
    });

    return successResponse(response.data.data || [], "Department users retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

// ============================================================================
// USER MANAGEMENT WITH DEPARTMENT INFO
// ============================================================================

/**
 * Get all users in the organization with their department information
 * Calls: GET /api/v1/organization/users (enhanced with department info)
 */
export async function getOrganizationUsersWithDepartments(
  page: number = 1,
  pageSize: number = 20
): Promise<APIResponse<UserDepartmentInfo[]>> {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('page_size', pageSize.toString());

  const url = `/api/v1/organization/users?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET"
    });

    return successResponse(response.data.data || [], "Users with department info retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new user and assign them to a department
 * Enhanced user creation with department assignment
 */
export async function createUserWithDepartment(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
  departmentId?: string;
}): Promise<APIResponse> {
  if (!data.email || !data.name || !data.password) {
    return badRequestResponse("Email, name, and password are required");
  }

  const url = `/api/v1/organization/users`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role || "requester",
        department_id: data.departmentId || null,
      }
    });

    return successResponse(response.data.data, "User created successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update user's department assignment
 * This is a convenience function that combines remove + assign
 */
export async function updateUserDepartment(
  userId: string,
  newDepartmentId: string | null
): Promise<APIResponse> {
  if (!userId) {
    return badRequestResponse("User ID is required");
  }

  try {
    // If newDepartmentId is null, just remove from current department
    if (!newDepartmentId) {
      return await removeUserFromDepartment(userId);
    }

    // Otherwise, assign to new department (this will replace any existing assignment)
    return await assignUserToDepartment(userId, newDepartmentId);
  } catch (error: any) {
    return handleError(error, "UPDATE", `/api/v1/users/${userId}/department`);
  }
}

// ============================================================================
// DEPARTMENT STATISTICS
// ============================================================================

/**
 * Get department statistics (user count, etc.)
 */
export async function getDepartmentStats(departmentId: string): Promise<APIResponse> {
  if (!departmentId) {
    return badRequestResponse("Department ID is required");
  }

  try {
    const usersResponse = await getDepartmentUsers(departmentId);
    
    if (!usersResponse.success) {
      return usersResponse;
    }

    const users = usersResponse.data || [];
    const stats = {
      total_users: users.length,
      active_users: users.filter((u: DepartmentUser) => u.active).length,
      roles_distribution: users.reduce((acc: Record<string, number>, user: DepartmentUser) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
    };

    return successResponse(stats, "Department statistics retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", `/api/v1/organization/departments/${departmentId}/stats`);
  }
}