"use server";

/**
 * Workflow Approval Actions - Single Source of Truth
 * Consolidated approval workflow actions using real backend APIs
 * Follows DRY principle - no wrapper functions
 */

import {
  ApprovalTask,
  ApprovalRecord,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
} from "@/types";
import { APIResponse } from "@/types";
import { handleError, successResponse, badRequestResponse } from "./api-config";
import authenticatedApiClient from "./api-config";

// ============================================================================
// APPROVAL TASK MANAGEMENT
// ============================================================================

/**
 * Get all approval tasks with pagination and filtering
 * Calls: GET /api/v1/approvals?page=...&limit=...&status=...&document_type=...&assigned_to_me=...
 */
export async function getApprovalTasks(
  filters?: {
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    documentType?: string;
    priority?: string;
    assignedToMe?: boolean;
    viewAll?: boolean;
  },
  page: number = 1,
  limit: number = 10
): Promise<APIResponse<ApprovalTask[]>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.documentType) {
    params.set("document_type", filters.documentType);
  }
  if (filters?.priority) {
    params.set("priority", filters.priority);
  }
  if (filters?.assignedToMe) {
    params.set("assigned_to_me", "true");
  }
  if (filters?.viewAll) {
    params.set("view_all", "true");
  }

  const url = `/api/v1/approvals?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Approval tasks retrieved successfully",
      response.data?.pagination // Pass through pagination metadata
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get single approval task with full details
 * Calls: GET /api/v1/approvals/{id}
 */
export async function getApprovalTaskDetail(
  taskId: string
): Promise<APIResponse<any>> {
  if (!taskId) {
    return badRequestResponse("Task ID is required");
  }

  const url = `/api/v1/approvals/${taskId}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Approval task retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get approval statistics for dashboard
 * Calls: GET /api/v1/approvals/stats
 */
export async function getApprovalStats(): Promise<
  APIResponse<{
    totalPending: number;
    highPriority: number;
    thisMonth: number;
    overdue: number;
  }>
> {
  const url = `/api/v1/approvals/stats`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || {
        totalPending: 0,
        highPriority: 0,
        thisMonth: 0,
        overdue: 0,
      },
      "Approval statistics retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get pending approval count for a user
 * Calls: GET /api/v1/users/{userId}/pending-approvals/count
 */
export async function getPendingApprovalCount(
  userId?: string
): Promise<APIResponse<{ count: number }>> {
  const url = userId
    ? `/api/v1/users/${userId}/pending-approvals/count`
    : `/api/v1/approvals/my-pending-count`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || { count: 0 },
      "Pending approval count retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

/**
 * Approve an approval task
 * Calls: POST /api/v1/approvals/{id}/approve
 */
export async function approveApprovalTask(
  taskId: string,
  data: ApproveTaskRequest
): Promise<APIResponse<any>> {
  if (!taskId) {
    return badRequestResponse("Task ID is required");
  }

  const url = `/api/v1/approvals/${taskId}/approve`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        comments: data.comments,
        signature: data.signature,
        stageNumber: data.stageNumber,
      },
    });

    return successResponse(response.data?.data, "Task approved successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Reject an approval task
 * Calls: POST /api/v1/approvals/{id}/reject
 */
export async function rejectApprovalTask(
  taskId: string,
  data: RejectTaskRequest
): Promise<APIResponse<any>> {
  if (!taskId) {
    return badRequestResponse("Task ID is required");
  }
  if (!data.remarks?.trim()) {
    return badRequestResponse("Rejection reason is required");
  }

  const url = `/api/v1/approvals/${taskId}/reject`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        reason: data.remarks,
        signature: data.signature,
        rejectionType: data.rejectionType || "reject",
      },
    });

    return successResponse(response.data?.data, "Task rejected successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Reassign an approval task
 * Calls: POST /api/v1/approvals/{id}/reassign
 */
export async function reassignApprovalTask(
  taskId: string,
  data: ReassignTaskRequest
): Promise<APIResponse<any>> {
  if (!taskId) {
    return badRequestResponse("Task ID is required");
  }
  if (!data.newApproverId) {
    return badRequestResponse("New approver ID is required");
  }
  if (!data.reason?.trim()) {
    return badRequestResponse("Reassignment reason is required");
  }

  const url = `/api/v1/approvals/${taskId}/reassign`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        newUserId: data.newApproverId, // Backend expects newUserId
        reason: data.reason,
      },
    });

    return successResponse(response.data?.data, "Task reassigned successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Claim a workflow task
 * Calls: POST /api/v1/approvals/tasks/{id}/claim
 */
export async function claimWorkflowTask(
  taskId: string
): Promise<APIResponse<any>> {
  if (!taskId) {
    return badRequestResponse("Task ID is required");
  }

  const url = `/api/v1/approvals/tasks/${taskId}/claim`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
    });

    return successResponse(response.data?.data, "Task claimed successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

// ============================================================================
// APPROVAL HISTORY & AUDIT
// ============================================================================

/**
 * Get approval history for a document
 * Calls: GET /api/v1/documents/{documentId}/approval-history
 */
export async function getApprovalHistory(
  documentId: string
): Promise<APIResponse<ApprovalRecord[]>> {
  if (!documentId) {
    return badRequestResponse("Document ID is required");
  }

  const url = `/api/v1/documents/${documentId}/approval-history`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Approval history retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get approval workflow status for a document
 * Calls: GET /api/v1/documents/{documentId}/approval-status
 */
export async function getApprovalWorkflowStatus(documentId: string): Promise<
  APIResponse<{
    currentStage: number;
    totalStages: number;
    status: string;
    nextApprover?: string;
    canApprove: boolean;
    canReject: boolean;
    stageProgress?: Array<{
      stageNumber: number;
      stageName: string;
      requiredRole: string;
      requiredRoleName?: string;
      status: string;
      isCurrentStage: boolean;
      approverId?: string;
      approverName?: string;
      approverRole?: string;
      completedAt?: string;
      comments?: string;
    }>;
  }>
> {
  if (!documentId) {
    return badRequestResponse("Document ID is required");
  }

  const url = `/api/v1/documents/${documentId}/approval-status`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Approval workflow status retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk approve multiple tasks
 * Calls: POST /api/v1/approvals/bulk/approve
 */
export async function bulkApproveApprovalTasks(
  taskIds: string[],
  comments?: string,
  signature?: string
): Promise<
  APIResponse<{
    successful: string[];
    failed: Array<{ taskId: string; error: string }>;
  }>
> {
  if (!taskIds?.length) {
    return badRequestResponse("Task IDs are required");
  }

  const url = `/api/v1/approvals/bulk/approve`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        taskIds,
        comments,
        signature,
      },
    });

    return successResponse(response.data?.data, "Bulk approval completed");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Bulk reject multiple tasks
 * Calls: POST /api/v1/approvals/bulk/reject
 */
export async function bulkRejectApprovalTasks(
  taskIds: string[],
  remarks: string,
  signature?: string
): Promise<
  APIResponse<{
    successful: string[];
    failed: Array<{ taskId: string; error: string }>;
  }>
> {
  if (!taskIds?.length) {
    return badRequestResponse("Task IDs are required");
  }
  if (!remarks?.trim()) {
    return badRequestResponse("Rejection reason is required");
  }

  const url = `/api/v1/approvals/bulk/reject`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        taskIds,
        remarks,
        signature,
      },
    });

    return successResponse(response.data?.data, "Bulk rejection completed");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

/**
 * Validate digital signature
 * Calls: POST /api/v1/approvals/validate-signature
 */
export async function validateSignature(
  signature: string,
  userId?: string
): Promise<APIResponse<{ valid: boolean; message: string }>> {
  if (!signature) {
    return badRequestResponse("Signature is required");
  }

  const url = `/api/v1/approvals/validate-signature`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: {
        signature,
        userId,
      },
    });

    return successResponse(
      response.data?.data,
      "Signature validation completed"
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

// ============================================================================
// APPROVER MANAGEMENT
// ============================================================================

/**
 * Get available approvers for a document type and stage
 * Calls: GET /api/v1/approvals/available-approvers?documentType=...&stage=...
 */
export async function getAvailableApprovers(
  documentType: string,
  stage?: number
): Promise<
  APIResponse<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      department?: string;
    }>
  >
> {
  if (!documentType) {
    return badRequestResponse("Document type is required");
  }

  const params = new URLSearchParams();
  params.set("documentType", documentType);
  if (stage) {
    params.set("stage", stage.toString());
  }

  const url = `/api/v1/approvals/available-approvers?${params.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Available approvers retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get approver workload statistics
 * Calls: GET /api/v1/approvals/approver-workload/{approverId}
 */
export async function getApproverWorkload(approverId: string): Promise<
  APIResponse<{
    pendingCount: number;
    averageResponseTime: number;
    completedThisMonth: number;
    overdueTasks: number;
  }>
> {
  if (!approverId) {
    return badRequestResponse("Approver ID is required");
  }

  const url = `/api/v1/approvals/approver-workload/${approverId}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Approver workload retrieved successfully"
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}
