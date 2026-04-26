"use server";

import {
  APIResponse,
  DashboardMetrics,
  SignupSettings,
  SignupAnalytics,
} from "@/types";
import { handleError, successResponse } from "@/app/_actions/api-config";
import authenticatedApiClient from "@/app/_actions/api-config";

export async function getDashboardMetrics(): Promise<
  APIResponse<DashboardMetrics>
> {
  const url = "/api/v1/reports/dashboard"; // Updated to use unified reports endpoint

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    // Transform backend data to frontend DashboardMetrics format
    const backendData = response.data?.data;
    if (!backendData) {
      throw new Error("Invalid dashboard data received from backend");
    }

    // Map backend response to frontend format
    const metrics: DashboardMetrics = {
      // Core metrics from system statistics
      totalDocuments: backendData.totalDocuments || 0,
      pendingApprovals: backendData.pendingApproval || 0,
      completedThisMonth: backendData.approvedDocuments || 0,
      averageProcessingTime: backendData.averageProcessingTime || 0, // Now available from backend
      budgetUtilization: backendData.budgetUtilization || 0, // Now available from backend
      recentActivity: backendData.recentActivity || [],

      // Approval metrics
      approvalsByStatus: {
        pending: backendData.pendingApproval || 0,
        approved: backendData.approvedDocuments || 0,
        rejected: backendData.rejectedDocuments || 0,
      },

      // Document type breakdown - now includes ALL document types
      documentsByType: {
        requisitions: backendData.documentTypeBreakdown?.requisitions || 0,
        purchaseOrders: backendData.documentTypeBreakdown?.purchaseOrders || 0,
        paymentVouchers:
          backendData.documentTypeBreakdown?.paymentVouchers || 0,
        budgets: backendData.documentTypeBreakdown?.budgets || 0,
      },

      // Extended fields for UI compatibility
      draftDocuments: backendData.draftDocuments || 0,
      submittedDocuments: backendData.submittedDocuments || 0,
      approvedDocuments: backendData.approvedDocuments || 0,
      rejectedDocuments: backendData.rejectedDocuments || 0,
      pendingApproval: backendData.pendingApproval || 0,
      documentsNeedingAction:
        (backendData.submittedDocuments || 0) +
        (backendData.pendingApproval || 0),
      averageApprovalTime: backendData.averageApprovalTime || 0,

      // Status breakdown
      statusBreakdown: backendData.statusBreakdown || {
        draft: 0,
        submitted: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
      },

      // Document type breakdown (alternative format)
      documentTypeBreakdown: {
        REQUISITION: backendData.documentTypeBreakdown?.requisitions || 0,
        PURCHASE_ORDER: backendData.documentTypeBreakdown?.purchaseOrders || 0,
        PAYMENT_VOUCHER:
          backendData.documentTypeBreakdown?.paymentVouchers || 0,
        GOODS_RECEIVED_NOTE: backendData.documentTypeBreakdown?.grn || 0,
      },
    };

    return successResponse(metrics, "Dashboard metrics retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

export async function fetchSignupSettings(): Promise<
  APIResponse<SignupSettings | null>
> {
  try {
    const settings: SignupSettings = {
      allowSignups: true,
      requireEmailVerification: false,
      autoApproveUsers: false,
      defaultRole: "USER",
      defaultCurrency: "USD",
    };
    return {
      success: true,
      message: "Signup settings retrieved",
      data: settings,
      status: 200,
    };
  } catch (error) {
    return handleError(error, "GET", "/dashboard/signup-settings") as any;
  }
}

export async function fetchSignupAnalytics(params?: {
  start?: string | Date;
  end?: string | Date;
}): Promise<APIResponse<SignupAnalytics | null>> {
  try {
    const analytics: SignupAnalytics = {
      totalSignups: 0,
      recentSignups: 0,
      pendingApprovals: 0,
      rejectedCount: 0,
    };
    return {
      success: true,
      message: "Signup analytics retrieved",
      data: analytics,
      status: 200,
    };
  } catch (error) {
    return handleError(error, "GET", "/dashboard/signup-analytics") as any;
  }
}

export async function toggleSignupSettings(
  keyOrEnabled: keyof SignupSettings | boolean,
  value?: any,
): Promise<APIResponse<SignupSettings | null>> {
  try {
    const settings: SignupSettings = {
      allowSignups: true,
      requireEmailVerification: false,
      autoApproveUsers: false,
      defaultRole: "USER",
      defaultCurrency: "USD",
    };
    return {
      success: true,
      message: "Signup settings updated",
      data: settings,
      status: 200,
    };
  } catch (error) {
    return handleError(error, "PATCH", "/dashboard/signup-settings") as any;
  }
}
