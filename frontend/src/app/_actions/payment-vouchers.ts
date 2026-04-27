"use server";

import {
  PaymentVoucher,
  CreatePaymentVoucherRequest,
  UpdatePaymentVoucherRequest,
  SubmitPaymentVoucherRequest,
  MarkPaymentVoucherPaidRequest,
  PaymentVoucherStats,
} from "@/types/payment-voucher";
import { PurchaseOrder } from "@/types/purchase-order";
import { APIResponse } from "@/types";
import {
  handleError,
  successResponse,
  badRequestResponse,
  NO_CACHE_HEADERS,
} from "./api-config";
import authenticatedApiClient from "./api-config";

/**
 * Create Payment Voucher from approved Purchase Order
 * Automatically triggered when PO is approved
 * Calls: POST /api/v1/payment-vouchers/from-po
 *
 * Note: The workflowId is stored but not used during creation.
 * It will be used when the PV is submitted for approval.
 */
export async function createPaymentVoucherFromPurchaseOrder(
  po: PurchaseOrder,
  workflowId?: string,
  vendorIdOverride?: string,
  vendorNameOverride?: string,
  linkedGRNDocumentNumber?: string,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/from-po`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        purchaseOrderId: po.id,
        purchaseOrderDocumentNumber: po.documentNumber,
        title: `Payment for ${po.documentNumber}`,
        description: po.description,
        vendorId: vendorIdOverride ?? po.vendorId,
        vendorName:
          vendorIdOverride !== undefined ? vendorNameOverride : po.vendorName,
        department: po.department,
        departmentId: po.departmentId,
        requestedBy: po.requestedBy,
        requestedByName: po.requestedByName,
        requestedByRole: po.requestedByRole,
        items: po.items,
        totalAmount: po.totalAmount,
        currency: po.currency,
        budgetCode: po.budgetCode,
        costCenter: po.costCenter,
        projectCode: po.projectCode,
        sourceRequisitionId: po.sourceRequisitionId,
        workflowId, // Store for later use when submitting
        linkedGRNDocumentNumber, // goods_first flow: approved GRN that must precede payment
      },
    });

    return successResponse(
      response.data?.data,
      "Payment voucher created from purchase order successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Create Payment Voucher manually
 * Calls: POST /api/v1/payment-vouchers
 */
export async function createPaymentVoucher(
  data: CreatePaymentVoucherRequest,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers`;

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
        paymentDueDate: data.paymentDueDate,
        priority: data.priority,
        paymentMethod: data.paymentMethod,
        bankDetails: data.bankDetails,
        items: data.items,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        projectCode: data.projectCode,
        taxAmount: data.taxAmount,
        withholdingTaxAmount: data.withholdingTaxAmount,
        sourcePurchaseOrderId: data.sourcePurchaseOrderId,
        sourceRequisitionId: data.sourceRequisitionId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByRole: data.createdByRole,
      },
    });

    return successResponse(
      response.data?.data,
      "Payment voucher created successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get all payment vouchers with pagination
 * Calls: GET /api/v1/payment-vouchers?page=...&limit=...&status=...
 */
export async function getPaymentVouchers(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    department?: string;
  },
): Promise<APIResponse<PaymentVoucher[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.department) {
    params.set("department", filters.department);
  }

  const url = `/api/v1/payment-vouchers?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Payment vouchers retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get payment voucher by ID
 * Calls: GET /api/v1/payment-vouchers/{id}
 */
export async function getPaymentVoucherById(
  pvId: string,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/${pvId}`;

  try {
    // Use no-cache headers to ensure fresh data for PDF generation
    const response = await authenticatedApiClient({
      method: "GET",
      url,
      headers: NO_CACHE_HEADERS,
    });

    return successResponse(
      response.data?.data,
      "Payment voucher retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update Payment Voucher (DRAFT only)
 * Calls: PUT /api/v1/payment-vouchers/{id}
 */
export async function updatePaymentVoucher(
  data: UpdatePaymentVoucherRequest,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/${data.pvId}`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data: {
        pvId: data.pvId,
        title: data.title,
        description: data.description,
        vendorName: data.vendorName,
        paymentDueDate: data.paymentDueDate,
        priority: data.priority,
        paymentMethod: data.paymentMethod,
        bankDetails: data.bankDetails,
        items: data.items,
        updatedBy: data.updatedBy,
      },
    });

    return successResponse(
      response.data?.data,
      "Payment voucher updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Submit Payment Voucher for Approval
 * Calls: POST /api/v1/payment-vouchers/{id}/submit
 */
export async function submitPaymentVoucherForApproval(
  data: SubmitPaymentVoucherRequest,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/${data.pvId}/submit`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        workflowId: data.workflowId, // REQUIRED by backend
        pvId: data.pvId,
        submittedBy: data.submittedBy,
        submittedByName: data.submittedByName,
        submittedByRole: data.submittedByRole,
        comments: data.comments,
      },
    });

    return successResponse(
      response.data?.data,
      "Payment voucher submitted for approval successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Mark Payment Voucher as Paid
 * Calls: POST /api/v1/payment-vouchers/{id}/mark-paid
 */
export async function markPaymentVoucherAsPaid(
  data: MarkPaymentVoucherPaidRequest,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/${data.pvId}/mark-paid`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        pvId: data.pvId,
        paidAmount: data.paidAmount,
        paidDate: data.paidDate,
        referenceNumber: data.referenceNumber,
        comments: data.comments,
        markedBy: data.markedBy,
        markedByName: data.markedByName,
        markedByRole: data.markedByRole,
      },
    });

    return successResponse(
      response.data?.data,
      "Payment voucher marked as paid successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Delete Payment Voucher (DRAFT only)
 * Calls: DELETE /api/v1/payment-vouchers/{id}
 */
export async function deletePaymentVoucher(pvId: string): Promise<APIResponse> {
  const url = `/api/v1/payment-vouchers/${pvId}`;

  try {
    const response = await authenticatedApiClient({
      method: "DELETE",
      url,
    });

    return successResponse(
      response.data?.data,
      "Payment voucher deleted successfully",
    );
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Withdraw Payment Voucher (reverts SUBMITTED back to DRAFT)
 * Calls: POST /api/v1/payment-vouchers/{id}/withdraw
 */
export async function withdrawPaymentVoucher(
  pvId: string,
): Promise<APIResponse<PaymentVoucher>> {
  const url = `/api/v1/payment-vouchers/${pvId}/withdraw`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
    });

    return successResponse(
      response.data?.data,
      "Payment voucher withdrawn successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get Payment Voucher Statistics
 * Calls: GET /api/v1/payment-vouchers/stats
 */
export async function getPaymentVoucherStats(): Promise<
  APIResponse<PaymentVoucherStats>
> {
  const url = `/api/v1/payment-vouchers/stats`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Payment voucher statistics retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get document chain for a payment voucher
 * Calls: GET /api/document-chain/:documentId?documentType=payment_voucher
 *
 * Returns the complete procurement flow chain:
 * - Goods-first flow: Requisition → PO → GRN → PV
 * - Payment-first flow: Requisition → PO → PV
 */
export async function getPaymentVoucherChain(
  pvId: string,
): Promise<APIResponse<any>> {
  const url = `/api/document-chain/${pvId}?documentType=payment_voucher`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Payment voucher chain retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}
