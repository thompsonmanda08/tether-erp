"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";

export interface Organization {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
  status: "active" | "suspended" | "pending";
  user_count: number;
  trial_status?: "trial" | "subscribed" | "expired";
  trial_end_date?: string;
  days_remaining?: number;
  settings?: {
    max_users?: number;
    features_enabled?: string[];
    custom_branding?: boolean;
    api_access?: boolean;
  };
  contact_info?: {
    admin_name?: string;
    admin_email?: string;
    phone?: string;
    address?: string;
  };
}

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "pending";
  joined_at: string;
  last_login?: string;
  is_admin: boolean;
}

export interface OrganizationActivity {
  id: string;
  organization_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface OrganizationFilters {
  search?: string;
  status?: "active" | "suspended" | "pending" | "all";
  trial_status?: "trial" | "subscribed" | "expired";
  page?: number;
  limit?: number;
  sort_by?: "name" | "created_at" | "user_count" | "trial_end_date";
  sort_order?: "asc" | "desc";
}

export interface CreateOrganizationRequest {
  name: string;
  domain: string;
  description?: string;
  admin_user_id: string;
  trial_days?: number;
  max_users?: number;
}

export interface UpdateOrganizationRequest {
  name?: string;
  domain?: string;
  settings?: {
    max_users?: number;
    features_enabled?: string[];
    custom_branding?: boolean;
    api_access?: boolean;
  };
  contact_info?: {
    admin_name?: string;
    admin_email?: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Get all organizations with filters and pagination
 */
export async function getAllOrganizations(
  filters?: OrganizationFilters,
): Promise<
  APIResponse<{
    organizations: Organization[];
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
  if (filters?.trial_status)
    params.append("trial_status", filters.trial_status);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.sort_by) params.append("sort_by", filters.sort_by);
  if (filters?.sort_order) params.append("sort_order", filters.sort_order);

  const url = `/api/v1/admin/organizations${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organizations retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get organization by ID with detailed information
 */
export async function getOrganizationById(
  organizationId: string,
): Promise<APIResponse<Organization | null>> {
  const url = `/api/v1/admin/organizations/${organizationId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Create new organization (Admin only)
 */
export async function createOrganization(
  request: CreateOrganizationRequest,
): Promise<APIResponse<Organization | null>> {
  const url = "/api/v1/admin/organizations";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: request,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization created successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update organization information (Admin only)
 */
export async function updateOrganization(
  organizationId: string,
  request: UpdateOrganizationRequest,
): Promise<APIResponse<Organization | null>> {
  const url = `/api/v1/admin/organizations/${organizationId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: request,
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization updated successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Update organization status (Admin only)
 */
export async function updateOrganizationStatus(
  organizationId: string,
  status: "active" | "suspended" | "pending",
  reason?: string,
): Promise<APIResponse<Organization | null>> {
  const url = `/api/v1/admin/organizations/${organizationId}/status`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: { status, reason },
    });

    return successResponse(
      response?.data?.data || response?.data,
      `Organization ${status} successfully`,
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get organization users
 */
export async function getOrganizationUsers(
  organizationId: string,
  page: number = 1,
  limit: number = 50,
): Promise<
  APIResponse<{
    users: OrganizationUser[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  const url = `/api/v1/admin/organizations/${organizationId}/users?page=${page}&limit=${limit}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization users retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get organization activity logs
 */
export async function getOrganizationActivity(
  organizationId: string,
  page: number = 1,
  limit: number = 50,
): Promise<
  APIResponse<{
    activities: OrganizationActivity[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  const url = `/api/v1/admin/organizations/${organizationId}/activity?page=${page}&limit=${limit}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization activity retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Delete organization (Admin only)
 */
export async function deleteOrganization(
  organizationId: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/admin/organizations/${organizationId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Organization deleted successfully");
  } catch (error: Error | any) {
    return handleError(error);
  }
}

/**
 * Get organization statistics for dashboard
 */
export async function getOrganizationStatistics(): Promise<
  APIResponse<{
    total_organizations: number;
    active_organizations: number;
    suspended_organizations: number;
    trial_organizations: number;
    organizations_created_this_month: number;
    total_users_across_organizations: number;
    trials_expiring_soon: number;
    top_organizations_by_users: Array<{
      organization_id: string;
      organization_name: string;
      user_count: number;
    }>;
  }>
> {
  const url = "/api/v1/admin/organizations/statistics";

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response?.data?.data || response?.data,
      "Organization statistics retrieved successfully",
    );
  } catch (error: Error | any) {
    return handleError(error);
  }
}

