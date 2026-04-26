"use server";

import { revalidatePath } from "next/cache";
import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";
import { UserType } from "@/types";

// Types for user operations
export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  name?: string; // Computed full name
  department_id?: string;
  branch_id?: string;
  role: UserType;
  // Profile fields
  position?: string;
  manNumber?: string;
  nrcNumber?: string;
  contact?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  department_id?: string;
  branch_id?: string | null;
  position?: string;
  manNumber?: string;
  nrcNumber?: string;
  contact?: string;
  // first_name/last_name are joined into name before sending
  first_name?: string;
  last_name?: string;
}

export async function createNewUser(
  data: CreateUserRequest,
): Promise<APIResponse> {
  // Use the dedicated admin user creation endpoint that doesn't create personal organizations
  const url = `/api/v1/organization/users`;

  try {
    // Compute full name if not provided
    const fullName = data.name || `${data.first_name} ${data.last_name}`.trim();

    // Create the user directly in the current organization
    const response = await authenticatedApiClient({
      url: url,
      data: {
        name: fullName,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        role: data.role || "requester",
        department_id: data.department_id,
        branch_id: data.branch_id,
        position: data.position,
        manNumber: data.manNumber,
        nrcNumber: data.nrcNumber,
        contact: data.contact,
      },
      method: "POST",
    });

    if (!response.data?.success) {
      return handleError(
        new Error(response.data?.message || "Failed to create user"),
        "POST",
        url,
      );
    }


    revalidatePath("/admin/users");

    return successResponse(response.data?.data, "User created successfully");
  } catch (error: Error | any) {
    return handleError(error, "POST", url);
  }
}

export async function getUsers(params?: {
  branchId?: string;
  departmentId?: string;
  roleId?: string;
  isActive?: boolean;
  isLdapUser?: boolean;
  search?: string;
  role?: string;
  page?: number;
  page_size?: number;
}): Promise<APIResponse> {
  const queryParams = new URLSearchParams();

  if (params?.departmentId)
    queryParams.append("department_id", params.departmentId);
  if (params?.isActive !== undefined)
    queryParams.append("active", String(params.isActive));
  if (params?.search) queryParams.append("search", params.search);
  if (params?.role) queryParams.append("role", params.role);
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.page_size)
    queryParams.append("page_size", String(params.page_size));

  const url = `/api/v1/organization/members${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({ url: url, method: "GET" });

    // Transform organization members data to match expected user format
    const members = response.data?.data || response.data || [];
    const transformedUsers = members.map((member: any) => {
      // Handle both JSON field names (userId) and database field names (user_id)
      const userId = member.userId || member.user_id || member.id;

      // Get user data from nested User object or member object itself
      const userData = member.user || member.User || member;
      const userName =
        userData?.name ||
        `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() ||
        "Unknown User";
      const nameParts = userName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      let preferences: Record<string, any> = {};
      if (userData?.preferences) {
        try {
          preferences =
            typeof userData.preferences === "string"
              ? JSON.parse(userData.preferences)
              : userData.preferences;
        } catch {}
      }
      const avatar = preferences?.avatar || userData?.avatar || "";

      return {
        id: userId,
        name: userName,
        first_name: firstName,
        last_name: lastName,
        email: userData?.email || "",
        role: member.role || member.roleName || "requester",
        role_id: member.roleId || member.role_id || "",
        role_name: member.roleName || member.role_name || member.role || "",
        department: member.department || "",
        department_id: member.departmentId || member.department_id || "",
        branch_id: member.branchId || member.branch_id || "",
        is_active: member.is_active ?? true,
        preferences,
        avatar,
        // Profile fields from the nested user object
        position: userData?.position || "",
        manNumber: userData?.manNumber || userData?.man_number || "",
        nrcNumber: userData?.nrcNumber || userData?.nrc_number || "",
        contact: userData?.contact || "",
        // Include original member data for reference
        member_id: member.id,
        title: member.title || "",
        joined_at: member.joinedAt || member.joined_at,
        created_at: member.createdAt || member.created_at,
        updated_at: member.updatedAt || member.updated_at,
      };
    });

    return successResponse(
      transformedUsers,
      "Organization members fetched successfully",
    );
  } catch (error) {
    return handleError(error, "GET", url);
  }
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<APIResponse> {
  // Use the org-scoped members endpoint — accessible to org admins (not just super_admin)
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.role) queryParams.append("role", params.role);
  // Map status → active boolean param
  if (params?.status === "active") queryParams.append("active", "true");
  else if (params?.status === "inactive" || params?.status === "suspended")
    queryParams.append("active", "false");
  queryParams.append("page", String(params?.page ?? 1));
  queryParams.append("page_size", String(params?.limit ?? 10));

  const url = `/api/v1/organization/members?${queryParams.toString()}`;

  try {
    const response = await authenticatedApiClient({ url, method: "GET" });
    const responseData = response.data?.data || response.data || {};
    const rawMembers: any[] = responseData.members || [];

    const users = rawMembers.map((m: any) => {
      let preferences: Record<string, any> = {};
      if (m.preferences) {
        try {
          preferences =
            typeof m.preferences === "string"
              ? JSON.parse(m.preferences)
              : m.preferences;
        } catch {}
      }
      const nameParts = (m.name || "").split(" ");
      return {
        id: m.user_id || m.id,
        name: m.name || "",
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        email: m.email || "",
        role: m.role || "requester",
        role_id: "",
        role_name: m.role || "",
        department: m.department || "",
        department_id: m.department_id || "",
        is_active: m.is_active ?? true,
        preferences,
        avatar: preferences?.avatar || "",
        position: m.position || "",
        manNumber: m.man_number || "",
        nrcNumber: m.nrc_number || "",
        contact: m.contact || "",
        last_login: m.last_login,
        created_at: m.created_at,
        updated_at: m.updated_at,
      };
    });

    const total = responseData.total || 0;
    const page = responseData.page || 1;
    const pageSize = responseData.page_size || 10;
    const totalPages = responseData.total_pages || 1;

    return successResponse(users, "Users retrieved successfully", {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    });
  } catch (error) {
    return handleError(error, "GET", url);
  }
}

export async function getHeadsOfDepartments(params?: {
  department_id?: string;
  role_id?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<APIResponse> {
  const queryParams = new URLSearchParams();

  if (params?.department_id)
    queryParams.append("department_id", params.department_id);
  if (params?.role_id) queryParams.append("role_id", params.role_id);
  if (params?.is_active !== undefined)
    queryParams.append("is_active", String(params.is_active));
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.page_size)
    queryParams.append("page_size", String(params.page_size));

  const url = `/api/v1/users/department-heads/list${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({ url: url, method: "GET" });
    return successResponse(response.data.data, "HODs fetched successfully");
  } catch (error) {
    return handleError(error, "GET", url);
  }
}

export async function getDepartmentHeads(params?: {
  departmentId?: string;
}): Promise<APIResponse> {
  const queryParams = new URLSearchParams();
  if (params?.departmentId)
    queryParams.append("department_id", params.departmentId);
  const url = `/api/v1/users/department-heads/list${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  try {
    const response = await authenticatedApiClient({ url: url, method: "GET" });
    return successResponse(response.data.data, "Users fetched successfully");
  } catch (error) {
    return handleError(error, "GET", url);
  }
}

export async function getUserById(id: string): Promise<APIResponse> {
  // For organization members, we'll get all members and filter by user ID
  // This is because the backend doesn't have a specific endpoint for single member by user ID
  try {
    const response = await getUsers();
    if (!response.success || !response.data) {
      return {
        success: false,
        message: "Failed to fetch organization members",
        data: null,
        status: 400,
      };
    }

    const members = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    const member = members.find((m: any) => m.user_id === id || m.id === id);

    if (!member) {
      return {
        success: false,
        message: "User not found in organization",
        data: null,
        status: 404,
      };
    }

    return successResponse(member, "User fetched successfully");
  } catch (error) {
    return handleError(error, "GET", `/api/v1/organization/members`);
  }
}

export async function updateUser(
  id: string,
  data: Partial<UpdateUserRequest>,
): Promise<APIResponse> {
  const url = `/api/v1/organization/users/${id}`;

  try {
    // Build the update payload, transforming field names to match the backend
    const payload: Record<string, any> = {};

    // Combine first_name + last_name into name if provided
    if (data.first_name !== undefined || data.last_name !== undefined) {
      payload.name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    }
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.role !== undefined) payload.role = data.role;
    if (data.department_id !== undefined)
      payload.department_id = data.department_id;
    if (data.branch_id !== undefined) payload.branch_id = data.branch_id;
    if (data.is_active !== undefined)
      payload.status = data.is_active ? "active" : "inactive";
    if (data.position !== undefined) payload.position = data.position;
    if (data.manNumber !== undefined) payload.manNumber = data.manNumber;
    if (data.nrcNumber !== undefined) payload.nrcNumber = data.nrcNumber;
    if (data.contact !== undefined) payload.contact = data.contact;

    const response = await authenticatedApiClient({
      url,
      method: "PUT",
      data: payload,
    });

    if (!response.data?.success) {
      return handleError(
        new Error(response.data?.message || "Failed to update user"),
        "PUT",
        url,
      );
    }

    revalidatePath("/admin/users");
    return successResponse(response.data?.data, "User updated successfully");
  } catch (error: Error | any) {
    return handleError(error, "PUT", url);
  }
}

export async function deleteUser(id: string): Promise<APIResponse> {
  const url = `/api/v1/users/${id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });
    revalidatePath("/dashboard/system-configs/users");
    return successResponse(response.data.data, "User deleted successfully");
  } catch (error) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(
  id: string,
  isActive: boolean,
): Promise<APIResponse> {
  try {
    // Fetch current user data first
    const userResponse = await getUserById(id);

    if (!userResponse.success || !userResponse.data) {
      return {
        success: false,
        message: "Failed to fetch user data",
        data: null,
        status: 400,
      };
    }

    const user = userResponse.data;

    // Update with complete user data plus the status change
    return updateUser(id, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department_id: user.department_id,
      is_active: isActive,
    });
  } catch (error) {
    return {
      success: false,
      message: "Failed to toggle user status",
      data: null,
      status: 500,
    };
  }
}

export async function deactivateUser(id: string): Promise<APIResponse> {
  const url = `/api/v1/users/${id}/deactivate`;
  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PATCH",
    });
    revalidatePath("/dashboard/system-configs/users");
    return successResponse(response.data.data);
  } catch (error) {
    return handleError(error, "PATCH", url);
  }
}

export async function activateUser(id: string): Promise<APIResponse> {
  const url = `/api/v1/users/${id}/activate`;
  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PATCH",
    });
    revalidatePath("/dashboard/system-configs/users");
    return successResponse(response.data.data);
  } catch (error) {
    return handleError(error, "PATCH", url);
  }
}

/**
 * Toggle user MFA
 */
export async function toggleUserMFA(
  _id: string,
  _enabled: boolean,
): Promise<APIResponse> {
  // MFA management for org users is not supported via this app.
  return {
    success: false,
    message: "MFA management is not supported for organization users.",
    data: null,
    status: 501,
  };
}

/**
 * Reset user password
 */
export async function resetUserPassword(
  id: string,
  password: string,
): Promise<APIResponse> {
  const url = `/api/v1/users/${id}/reset-password`;
  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        new_password: password,
      },
    });
    return successResponse(response.data, "Password reset successfully");
  } catch (error) {
    return handleError(error, "POST", url);
  }
}
/**
 * Convenience function to get all users (wrapper around getUsers)
 */
export async function getAllUsers(): Promise<APIResponse> {
  return getUsers();
}

/**
 * Convenience function to get users by role (wrapper around getUsers)
 */
export async function getUsersByRole(role: string): Promise<APIResponse> {
  return getUsers({ role });
}

/**
 * Convenience function to search users (wrapper around getUsers)
 */
export async function searchUsers(query: string): Promise<APIResponse> {
  return getUsers({ search: query });
}

/**
 * Get a single user by ID, scoped to the caller's organization.
 * Calls: GET /api/v1/organization/users/:id
 * Normalizes snake_case backend fields to camelCase expected by the User type.
 */
export async function getAdminUserById(id: string): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${id}`,
      method: "GET",
    });
    const raw = response.data.data ?? {};
    // Parse preferences JSONB (returned as string by Go map scan)
    let preferences: Record<string, any> = {};
    if (raw.preferences) {
      try {
        preferences =
          typeof raw.preferences === "string"
            ? JSON.parse(raw.preferences)
            : raw.preferences;
      } catch {}
    }
    // Normalize snake_case → camelCase for fields the component expects
    const user = {
      ...raw,
      preferences,
      avatar: preferences.avatar ?? "",
      manNumber: raw.manNumber ?? raw.man_number ?? "",
      nrcNumber: raw.nrcNumber ?? raw.nrc_number ?? "",
      is_active: raw.is_active ?? false,
      mfa_enabled: raw.mfa_enabled ?? false,
      department: raw.department ?? "",
      position: raw.position ?? "",
      contact: raw.contact ?? "",
    };
    return {
      success: true,
      message: "User fetched successfully",
      data: user,
      status: 200,
      statusText: "OK",
    };
  } catch (error) {
    return handleError(error, "GET", `/api/v1/organization/users/${id}`);
  }
}

/**
 * Admin: Update a user's status (active / suspended)
 */
export async function adminUpdateUserStatus(
  id: string,
  status: "active" | "suspended",
): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${id}/status`,
      method: "PUT",
      data: { status },
    });
    return successResponse(response.data.data, "User status updated");
  } catch (error) {
    return handleError(error, "PUT", `/api/v1/organization/users/${id}/status`);
  }
}

/**
 * Admin: Send password reset email to a user
 */
export async function adminResetUserPassword(id: string): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/organization/users/${id}/reset-password`,
      method: "POST",
    });
    return successResponse(response.data.data, "Password reset email sent");
  } catch (error) {
    return handleError(
      error,
      "POST",
      `/api/v1/organization/users/${id}/reset-password`,
    );
  }
}
