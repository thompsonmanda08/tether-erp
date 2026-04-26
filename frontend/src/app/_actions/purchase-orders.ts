"use server";

import { cache } from "react";
import {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SubmitPurchaseOrderRequest,
  PurchaseOrderStats,
} from "@/types/purchase-order";
import { Requisition } from "@/types/requisition";
import { APIResponse } from "@/types";
import {
  handleError,
  successResponse,
  badRequestResponse,
  NO_CACHE_HEADERS,
} from "./api-config";
import authenticatedApiClient from "./api-config";

/**
 * Create a Purchase Order from an approved Requisition
 * Calls: POST /api/v1/purchase-orders/from-requisition
 *
 * Note: The workflowId is stored but not used during creation.
 * It will be used when the PO is submitted for approval.
 */
export async function createPurchaseOrderFromRequisition(
  requisition: Requisition,
  workflowId?: string,
  vendorIdOverride?: string,
  vendorNameOverride?: string,
  procurementFlow?: "" | "goods_first" | "payment_first",
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders/from-requisition`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        requisitionId: requisition.id,
        requisitionDocumentNumber: requisition.documentNumber,
        // Auto-generate title if not provided
        title:
          requisition.title ||
          `Purchase Order from ${requisition.documentNumber}`,
        description: requisition.description,
        vendorId: vendorIdOverride ?? requisition.vendorId,
        vendorName: vendorNameOverride ?? requisition.vendorName,
        // Ensure department and budget code are passed from requisition
        department: requisition.department,
        departmentId: requisition.departmentId,
        requiredByDate: requisition.requiredByDate,
        priority: requisition.priority,
        items: requisition.items,
        totalAmount: requisition.totalAmount,
        currency: requisition.currency,
        budgetCode: requisition.budgetCode,
        costCenter: requisition.costCenter,
        projectCode: requisition.projectCode,
        requestedBy: requisition.requestedBy,
        requestedByName: requisition.requestedByName,
        requestedByRole: requisition.requestedByRole,
        workflowId, // Store for later use when submitting
        procurementFlow: procurementFlow ?? "", // "" = inherit from org default
      },
    });

    return successResponse(
      response.data?.data,
      "Purchase Order created from requisition successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Create a new purchase order manually
 * Calls: POST /api/v1/purchase-orders
 */
export async function createPurchaseOrder(
  data: CreatePurchaseOrderRequest,
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        title: data.title,
        description: data.description,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        department: data.department,
        departmentId: data.departmentId,
        requiredByDate: data.requiredByDate,
        priority: data.priority,
        items: data.items,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        projectCode: data.projectCode,
        sourceRequisitionId: data.sourceRequisitionId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByRole: data.createdByRole,
      },
    });

    return successResponse(
      response.data?.data,
      "Purchase Order created successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get all purchase orders with pagination
 * Calls: GET /api/v1/purchase-orders?page=...&limit=...&status=...
 */
export async function getPurchaseOrders(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    department?: string;
  },
): Promise<APIResponse<PurchaseOrder[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.department) {
    params.set("department", filters.department);
  }

  const url = `/api/v1/purchase-orders?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Purchase orders retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get purchase order by ID
 * Calls: GET /api/v1/purchase-orders/{id}
 */
export async function getPurchaseOrderById(
  poId: string,
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders/${poId}`;

  try {
    // Use no-cache headers to ensure fresh data for PDF generation
    const response = await authenticatedApiClient({
      method: "GET",
      url,
      headers: NO_CACHE_HEADERS,
    });

    return successResponse(
      response.data?.data,
      "Purchase order retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update purchase order (DRAFT only)
 * Calls: PUT /api/v1/purchase-orders/{id}
 */
export async function updatePurchaseOrder(
  data: UpdatePurchaseOrderRequest,
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders/${data.poId}`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data: {
        title: data.title,
        description: data.description,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        requiredByDate: data.requiredByDate,
        deliveryDate: data.deliveryDate,
        priority: data.priority,
        items: data.items,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        projectCode: data.projectCode,
        department: data.department,
        departmentId: data.departmentId,
        metadata: data.metadata,
        quotationGateOverridden: data.quotationGateOverridden,
        bypassJustification: data.bypassJustification,
      },
    });

    return successResponse(
      response.data?.data,
      "Purchase order updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Submit purchase order for approval
 * Calls: POST /api/v1/purchase-orders/{id}/submit
 */
export async function submitPurchaseOrderForApproval(
  data: SubmitPurchaseOrderRequest,
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders/${data.poId}/submit`;

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
      "Purchase order submitted for approval",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get purchase order statistics
 * Calls: GET /api/v1/purchase-orders/stats
 */
export async function getPurchaseOrderStats(): Promise<
  APIResponse<PurchaseOrderStats>
> {
  const url = `/api/v1/purchase-orders/stats`;

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
 * Delete purchase order (DRAFT only)
 * Calls: DELETE /api/v1/purchase-orders/{id}
 */
export async function deletePurchaseOrder(poId: string): Promise<APIResponse> {
  const url = `/api/v1/purchase-orders/${poId}`;

  try {
    await authenticatedApiClient({
      method: "DELETE",
      url,
    });

    return successResponse(null, "Purchase order deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Withdraw purchase order (PENDING only, not claimed)
 * Calls: POST /api/v1/purchase-orders/{id}/withdraw
 */
export async function withdrawPurchaseOrder(
  poId: string,
): Promise<APIResponse<PurchaseOrder>> {
  const url = `/api/v1/purchase-orders/${poId}/withdraw`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
    });

    return successResponse(
      response.data?.data,
      response.data?.message || "Purchase order withdrawn successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get document chain for a purchase order (Req → PO → GRN → PV)
 * Calls: GET /api/document-chain/:documentId?documentType=purchase_order
 */
export async function getPurchaseOrderChain(
  poId: string,
): Promise<APIResponse<any>> {
  const url = `/api/document-chain/${poId}?documentType=purchase_order`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Purchase order chain retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}
