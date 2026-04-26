"use server";

import {
  Requisition,
  CreateRequisitionRequest,
  UpdateRequisitionRequest,
  SubmitRequisitionRequest,
  RequisitionStats,
  RequisitionChain,
  AuditTrailEntry,
} from "@/types/requisition";
import { APIResponse, PurchaseOrder } from "@/types";
import {
  handleError,
  successResponse,
  badRequestResponse,
  NO_CACHE_HEADERS,
} from "./api-config";
import authenticatedApiClient from "./api-config";

/**
 * Create a new requisition
 * Calls: POST /api/v1/requisitions
 */
export async function createRequisition(
  data: CreateRequisitionRequest,
): Promise<APIResponse<Requisition>> {
  const url = `/api/v1/requisitions`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        title: data.title,
        description: data.description,
        department: data.department,
        departmentId: data.departmentId,
        priority: data.priority,
        items: data.items,
        totalAmount: data.totalAmount,
        currency: data.currency,
        categoryId: data.categoryId,
        preferredVendorId: data.preferredVendorId,
        isEstimate: data.isEstimate,
        requiredByDate: data.requiredByDate,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        projectCode: data.projectCode,
        requestedFor: data.requestedFor,
        otherCategoryText: data.otherCategoryText,
        metadata: {
          ...(data.attachments?.length
            ? { attachments: data.attachments }
            : {}),
        },
      },
    });

    return successResponse(
      response.data?.data,
      "Requisition created successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get all requisitions with pagination
 * Calls: GET /api/v1/requisitions?page=...&limit=...&status=...
 */
export async function getRequisitions(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    department?: string;
  },
): Promise<APIResponse<Requisition[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.department) {
    params.set("department", filters.department);
  }

  const url = `/api/v1/requisitions?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Requisitions retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get requisition by ID
 * Calls: GET /api/v1/requisitions/{id}
 */
export async function getRequisitionById(
  requisitionId: string,
): Promise<APIResponse<Requisition>> {
  const url = `/api/v1/requisitions/${requisitionId}`;

  try {
    // Use no-cache headers to ensure fresh data for PDF generation
    const response = await authenticatedApiClient({
      method: "GET",
      url,
      headers: NO_CACHE_HEADERS,
    });

    return successResponse(
      response.data?.data,
      "Requisition retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update requisition
 * Calls: PUT /api/v1/requisitions/{id}
 */
export async function updateRequisition(
  data: UpdateRequisitionRequest,
): Promise<APIResponse<Requisition>> {
  const url = `/api/v1/requisitions/${data.requisitionId}`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data: {
        title: data.title,
        description: data.description,
        requiredByDate: data.requiredByDate,
        priority: data.priority,
        items: data.items,
        totalAmount: data.totalAmount,
        currency: data.currency,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        projectCode: data.projectCode,
        metadata: {
          ...(data.attachments?.length
            ? { attachments: data.attachments }
            : {}),
          ...(data.quotations !== undefined
            ? { quotations: data.quotations }
            : {}),
        },
      },
    });

    return successResponse(
      response.data?.data,
      "Requisition updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Submit requisition for approval
 * Calls: POST /api/v1/requisitions/{id}/submit
 */
export async function submitRequisitionForApproval(
  data: SubmitRequisitionRequest,
): Promise<APIResponse<Requisition>> {
  const url = `/api/v1/requisitions/${data.requisitionId}/submit`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        workflowId: data.workflowId, // REQUIRED by backend
        comments: data.comments,
        submittedBy: data.submittedBy,
        submittedByName: data.submittedByName,
        submittedByRole: data.submittedByRole,
      },
    });

    return successResponse(
      response.data?.data,
      "Requisition submitted for approval",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get requisition statistics
 * Calls: GET /api/v1/requisitions/stats
 */
export async function getRequisitionStats(): Promise<
  APIResponse<RequisitionStats>
> {
  const url = `/api/v1/requisitions/stats`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Statistics retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Withdraw requisition (PENDING only, not claimed)
 * Calls: POST /api/v1/requisitions/{id}/withdraw
 */
export async function withdrawRequisition(
  requisitionId: string,
): Promise<APIResponse<Requisition>> {
  const url = `/api/v1/requisitions/${requisitionId}/withdraw`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
    });

    return successResponse(
      response.data?.data,
      response.data?.message || "Requisition withdrawn successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Delete requisition (DRAFT only)
 * Calls: DELETE /api/v1/requisitions/{id}
 */
export async function deleteRequisition(
  requisitionId: string,
): Promise<APIResponse> {
  const url = `/api/v1/requisitions/${requisitionId}`;

  try {
    await authenticatedApiClient({
      method: "DELETE",
      url,
    });

    return successResponse(null, "Requisition deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Get document chain for a requisition
 * Calls: GET /api/v1/requisitions/{id}/chain
 */
export async function getRequisitionChain(
  requisitionId: string,
): Promise<APIResponse<RequisitionChain>> {
  const url = `/api/v1/requisitions/${requisitionId}/chain`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Requisition chain retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get cross-chain audit trail for a requisition (admin/manager/finance only)
 * Calls: GET /api/v1/requisitions/{id}/audit-trail
 */
export async function getRequisitionAuditTrail(
  requisitionId: string,
): Promise<APIResponse<AuditTrailEntry[]>> {
  const url = `/api/v1/requisitions/${requisitionId}/audit-trail`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Audit trail retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}
