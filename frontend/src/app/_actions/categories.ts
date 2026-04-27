"use server";

import { APIResponse } from "@/types";
import { handleError, successResponse } from "./api-config";
import authenticatedApiClient from "./api-config";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  budgetCodes?: string[] | null;
  active: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  budgetCodes?: string[];
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  budgetCodes?: string[];
  active?: boolean;
}

/**
 * Get all categories with pagination
 * Calls: GET /api/v1/categories?page=...&limit=...&active=...
 */
export async function getCategories(
  page: number = 1,
  limit: number = 50,
  activeOnly: boolean = true,
): Promise<APIResponse<{ data: Category[]; pagination?: any }>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (activeOnly) {
    params.set("active", "true");
  }

  const url = `/api/v1/categories?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    // The backend returns { success: true, data: Category[], pagination: PaginationMeta }
    return successResponse(
      {
        data: response.data?.data || [],
        pagination: response.data?.pagination,
      },
      "Categories retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get category by ID
 * Calls: GET /api/v1/categories/{id}
 */
export async function getCategoryById(
  categoryId: string,
): Promise<APIResponse<Category>> {
  const url = `/api/v1/categories/${categoryId}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Category retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new category
 * Calls: POST /api/v1/categories
 */
export async function createCategory(
  data: CreateCategoryRequest,
): Promise<APIResponse<Category>> {
  const url = `/api/v1/categories`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        name: data.name,
        description: data.description,
        budgetCodes: data.budgetCodes || [],
      },
    });

    return successResponse(
      response.data?.data,
      "Category created successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update category
 * Calls: PUT /api/v1/categories/{id}
 */
export async function updateCategory(
  categoryId: string,
  data: UpdateCategoryRequest,
): Promise<APIResponse<Category>> {
  const url = `/api/v1/categories/${categoryId}`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data,
    });

    return successResponse(
      response.data?.data,
      "Category updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete category (soft delete - sets active to false)
 * Calls: DELETE /api/v1/categories/{id}
 */
export async function deleteCategory(categoryId: string): Promise<APIResponse> {
  const url = `/api/v1/categories/${categoryId}`;

  try {
    await authenticatedApiClient({
      method: "DELETE",
      url,
    });

    return successResponse(null, "Category deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}
