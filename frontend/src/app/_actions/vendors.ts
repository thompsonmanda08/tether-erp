"use server";

import {
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorFilters,
} from "@/types/vendor";
import { APIResponse } from "@/types";
import {
  handleError,
  successResponse,
  NO_CACHE_HEADERS,
} from "./api-config";
import authenticatedApiClient from "./api-config";

/**
 * Get all vendors with pagination and optional filters
 * Calls: GET /api/v1/vendors
 */
export async function getVendors(
  page: number = 1,
  limit: number = 20,
  filters?: VendorFilters,
): Promise<APIResponse<Vendor[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters?.active !== undefined) {
    params.set("active", filters.active.toString());
  }
  if (filters?.country) {
    params.set("country", filters.country);
  }
  if (filters?.search) {
    params.set("search", filters.search);
  }

  const url = `/api/v1/vendors?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({ method: "GET", url });
    return successResponse(
      response.data?.data || [],
      "Vendors retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get a single vendor by ID
 * Calls: GET /api/v1/vendors/:id
 */
export async function getVendorById(
  id: string,
): Promise<APIResponse<Vendor>> {
  const url = `/api/v1/vendors/${id}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
      headers: NO_CACHE_HEADERS,
    });
    return successResponse(response.data?.data, "Vendor retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new vendor
 * Calls: POST /api/v1/vendors
 */
export async function createVendor(
  data: CreateVendorRequest,
): Promise<APIResponse<Vendor>> {
  const url = `/api/v1/vendors`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data,
    });
    return successResponse(response.data?.data, "Vendor created successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update an existing vendor
 * Calls: PUT /api/v1/vendors/:id
 */
export async function updateVendor(
  id: string,
  data: UpdateVendorRequest,
): Promise<APIResponse<Vendor>> {
  const url = `/api/v1/vendors/${id}`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data,
    });
    return successResponse(response.data?.data, "Vendor updated successfully");
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Deactivate a vendor (soft delete)
 * Calls: PUT /api/v1/vendors/:id with { active: false }
 */
export async function deactivateVendor(
  id: string,
): Promise<APIResponse<Vendor>> {
  return updateVendor(id, { active: false });
}

/**
 * Activate a vendor
 * Calls: PUT /api/v1/vendors/:id with { active: true }
 */
export async function activateVendor(
  id: string,
): Promise<APIResponse<Vendor>> {
  return updateVendor(id, { active: true });
}
