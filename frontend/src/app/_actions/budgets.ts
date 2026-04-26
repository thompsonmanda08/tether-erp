"use server";

import { APIResponse } from "@/types";
import {
  Budget,
  BudgetStatus,
  CreateBudgetRequest,
  SubmitBudgetRequest,
  BudgetFilters,
} from "@/types/budget";
import authenticatedApiClient from "./api-config";
import { handleError, successResponse, badRequestResponse } from "./api-config";

/**
 * Create a new budget draft
 */
export async function createBudget(
  request: Omit<CreateBudgetRequest, "createdBy"> & { status?: BudgetStatus },
): Promise<APIResponse<Budget | null>> {
  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url: "/api/v1/budgets",
      data: request,
    });

    return successResponse(
      response.data?.data || null,
      response.data?.message || "Budget created successfully",
      response.data?.pagination,
    );
  } catch (error: any) {
    return handleError(error, "POST", "/api/v1/budgets");
  }
}

/**
 * Update an existing budget (items, metadata, etc.)
 */
export async function updateBudget(
  budgetId: string,
  updates: Partial<Budget>,
): Promise<APIResponse<Budget | null>> {
  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url: `/api/v1/budgets/${budgetId}`,
      data: updates,
    });

    return successResponse(
      response.data?.data || null,
      response.data?.message || "Budget updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", `/api/v1/budgets/${budgetId}`);
  }
}

/**
 * Get all budgets with optional filters
 */
export async function getBudgets(
  filters?: BudgetFilters,
  page: number = 1,
  limit: number = 10,
): Promise<APIResponse<Budget[] | null>> {
  try {
    const params: any = {
      page,
      limit,
    };

    // Add filter parameters if provided
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.fiscalYear) params.fiscalYear = filters.fiscalYear;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.searchTerm) params.search = filters.searchTerm;
      if (filters.userId) params.userId = filters.userId;
    }

    const response = await authenticatedApiClient({
      method: "GET",
      url: "/api/v1/budgets",
      params,
    });

    // Backend returns { success, data, message, pagination }
    // Extract the actual budgets array from response.data.data
    return successResponse(
      response.data?.data || [],
      response.data?.message || "Budgets retrieved successfully",
      response.data?.pagination,
    );
  } catch (error: any) {
    return handleError(error, "GET", "/api/v1/budgets");
  }
}

/**
 * Get budget by ID
 */
export async function getBudgetById(
  budgetId: string,
): Promise<APIResponse<Budget | null>> {
  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url: `/api/v1/budgets/${budgetId}`,
    });

    return successResponse(
      response.data?.data || null,
      response.data?.message || "Budget retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", `/api/v1/budgets/${budgetId}`);
  }
}

/**
 * Submit budget for approval
 */
export async function submitBudgetForApproval(
  request: SubmitBudgetRequest,
): Promise<APIResponse<Budget | null>> {
  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url: `/api/v1/budgets/${request.budgetId}/submit`,
      data: {
        workflowId: request.workflowId, // REQUIRED by backend
        submittingUserId: request.submittingUserId,
        comments: request.comments,
      },
    });

    return successResponse(
      response.data?.data || null,
      response.data?.message || "Budget submitted for approval",
    );
  } catch (error: any) {
    return handleError(
      error,
      "POST",
      `/api/v1/budgets/${request.budgetId}/submit`,
    );
  }
}

/**
 * Submit budget for approval (simplified version)
 */
export async function submitBudget(
  budgetId: string,
  workflowId: string,
  comments?: string,
): Promise<APIResponse<Budget | null>> {
  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url: `/api/v1/budgets/${budgetId}/submit`,
      data: {
        workflowId, // REQUIRED by backend
        comments,
      },
    });

    return successResponse(
      response.data?.data || null,
      response.data?.message || "Budget submitted for approval",
    );
  } catch (error: any) {
    return handleError(error, "POST", `/api/v1/budgets/${budgetId}/submit`);
  }
}

/**
 * Delete a budget (only draft budgets can be deleted)
 */
export async function deleteBudget(
  budgetId: string,
): Promise<APIResponse<null>> {
  try {
    const response = await authenticatedApiClient({
      method: "DELETE",
      url: `/api/v1/budgets/${budgetId}`,
    });

    return successResponse(
      null,
      response.data?.message || "Budget deleted successfully",
    );
  } catch (error: any) {
    return handleError(error, "DELETE", `/api/v1/budgets/${budgetId}`);
  }
}
