"use server";

import type { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
} from "./api-config";
import { updateAuthSession } from "@/lib/auth";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  tagline?: string;
  primaryColor?: string;
  active: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationRequest {
  id: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  tagline?: string;
}

export interface OrganizationMember {
  id: string;
  email: string;
  role: string;
  department?: string;
  title?: string;
  active: boolean;
  joinedAt: string;
}

export interface AddMemberRequest {
  email: string;
  role: string;
  department?: string;
  title?: string;
}

export interface OrganizationSettings {
  approvalThreshold: number;
  currency: string;
  fiscalYearStart: string;
  workflowEnabled: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  procurementFlow?: "goods_first" | "payment_first";
}

/**
 * Fetch all organizations for the current user
 * Calls: GET /api/v1/organizations
 */
export async function fetchUserOrganizations(): Promise<Organization[]> {
  const url = `/api/v1/organizations`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return response.data.data || [];
  } catch (error: any) {
    console.error("Failed to fetch organizations:", error);
    throw error;
  }
}

/**
 * Create a new organization
 * Calls: POST /api/v1/organizations
 */
export async function createOrganization(
  data: CreateOrganizationRequest,
): Promise<APIResponse<Organization>> {
  const url = `/api/v1/organizations`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });

    return successResponse(
      response.data.data,
      "Organization created successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get organization by ID
 * Calls: GET /api/v1/organizations/{id}
 */
export async function getOrganizationById(
  orgId: string,
): Promise<APIResponse<Organization>> {
  const url = `/api/v1/organizations/${orgId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data,
      "Organization retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update organization
 * Calls: PUT /api/v1/organizations/{id}
 */
export async function updateOrganization(
  data: UpdateOrganizationRequest,
): Promise<APIResponse<Organization>> {
  const url = `/api/v1/organizations/${data.id}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
        tagline: data.tagline,
      },
    });

    return successResponse(
      response.data.data,
      "Organization updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Switch to a different organization/workspace
 * Calls: POST /api/v1/organizations/{id}/switch
 */
export async function switchOrganization(orgId: string): Promise<string> {
  const url = `/api/v1/organizations/${orgId}/switch`;

  try {
    // 1. Verify current session before attempting switch
    const { verifySession } = await import("@/lib/auth");
    const { isAuthenticated, session } = await verifySession();
    if (!isAuthenticated) {
      throw new Error("No valid session found");
    }

    // 2. Backend switch (this updates user's current_organization_id)
    await authenticatedApiClient({
      url: url,
      method: "POST",
    });

    // 3. Update frontend session atomically
    await updateAuthSession({
      organization_id: orgId,
    });

    // 4. Verify the update was successful
    const { session: updatedSession } = await verifySession();
    if (updatedSession?.organization_id !== orgId) {
      console.warn(
        "Organization switch verification failed, but backend succeeded",
      );
      // Don't throw error as backend succeeded - frontend will sync on next request
    }

    return orgId;
  } catch (error: any) {
    console.error("Failed to switch organization:", error);
    throw error;
  }
}

/**
 * List organization members
 * Calls: GET /api/v1/organization/members
 */
export async function fetchOrganizationMembers(
  page: number = 1,
  limit: number = 20,
  role?: string,
): Promise<APIResponse<OrganizationMember[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());
  if (role) {
    params.set("role", role);
  }

  const url = `/api/v1/organization/members?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data || [],
      "Members retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Add organization member
 * Calls: POST /api/v1/organization/members
 */
export async function addOrganizationMember(
  data: AddMemberRequest,
): Promise<APIResponse<OrganizationMember>> {
  const url = `/api/v1/organization/members`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "POST",
      data: {
        email: data.email,
        role: data.role,
        department: data.department,
        title: data.title,
      },
    });

    return successResponse(response.data.data, "Member added successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Remove organization member
 * Calls: DELETE /api/v1/organization/members/{userId}
 */
export async function removeOrganizationMember(
  userId: string,
): Promise<APIResponse> {
  const url = `/api/v1/organization/members/${userId}`;

  try {
    await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Member removed successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Get organization settings
 * Calls: GET /api/v1/organization/settings
 */
export async function getOrganizationSettings(): Promise<
  APIResponse<OrganizationSettings>
> {
  const url = `/api/v1/organization/settings`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "GET",
    });

    return successResponse(
      response.data.data,
      "Settings retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update organization settings
 * Calls: PUT /api/v1/organization/settings
 */
export async function updateOrganizationSettings(
  data: OrganizationSettings,
): Promise<APIResponse<OrganizationSettings>> {
  const url = `/api/v1/organization/settings`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "PUT",
      data: {
        approvalThreshold: data.approvalThreshold,
        currency: data.currency,
        fiscalYearStart: data.fiscalYearStart,
        workflowEnabled: data.workflowEnabled,
        notifications: data.notifications,
        procurementFlow: data.procurementFlow,
      },
    });

    return successResponse(response.data.data, "Settings updated successfully");
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete organization (soft delete)
 * Calls: DELETE /api/v1/organizations/{id}
 */
export async function deleteOrganization(
  orgId: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/organizations/${orgId}`;

  try {
    const response = await authenticatedApiClient({
      url: url,
      method: "DELETE",
    });

    return successResponse(null, "Organization deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}
