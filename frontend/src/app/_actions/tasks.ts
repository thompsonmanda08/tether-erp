"use server";

import { APIResponse } from "@/types";
import {
  Task,
  TaskType,
  TaskStatus,
  TaskStats,
} from "@/types/tasks";
import authenticatedApiClient from "./api-config";
import { successResponse, handleError } from "./api-config";

/**
 * Get all tasks (approval tasks) for a user with optional filters
 * Calls: GET /api/v1/approvals/
 */
export async function getTasksForUser(
  _userId: string,
  status?: TaskStatus,
): Promise<APIResponse<Task[]>> {
  const params: Record<string, string> = {};
  if (status) params.status = status;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url: "/api/v1/approvals/",
      params,
    });

    const items: Task[] = (response.data?.data?.items || response.data?.data || []).map(
      (item: any): Task => ({
        id: item.id,
        taskType: (() => {
          const docType = (item.documentType || "").toLowerCase();
          if (docType === "purchase_order" || docType === "po") return "PURCHASE_ORDER_APPROVAL";
          if (docType === "payment_voucher" || docType === "pv") return "PAYMENT_VOUCHER_APPROVAL";
          if (docType === "goods_received_note" || docType === "grn") return "GOODS_RECEIVED_NOTE_CONFIRMATION";
          if (docType === "budget") return "BUDGET_APPROVAL";
          return "REQUISITION_APPROVAL";
        })() as TaskType,
        title: item.title || item.documentNumber || item.id,
        description: item.description || "",
        assignedTo: item.assignedTo || _userId,
        assignedRole: item.assignedRole || "",
        status: (item.status?.toUpperCase() || "PENDING") as TaskStatus,
        priority: item.priority?.toUpperCase() || "MEDIUM",
        documentType: item.documentType || "",
        documentId: item.documentId || item.entityId || "",
        documentNumber: item.documentNumber || "",
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        completedBy: item.completedBy,
        metadata: {
          currentApprovalStage: item.currentStage || item.metadata?.currentApprovalStage,
          totalApprovalStages: item.totalStages || item.metadata?.totalApprovalStages,
          approvalStageName: item.stageName || item.metadata?.approvalStageName,
        },
      }),
    );

    return {
      success: true,
      message: "Tasks retrieved successfully",
      data: items,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve tasks",
      data: undefined,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Get task statistics for a user
 * Calls: GET /api/v1/approvals/stats
 */
export async function getTaskStats(
  _userId: string,
): Promise<APIResponse<TaskStats>> {
  const url = `/api/v1/approvals/stats`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || {
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        highPriorityTasks: 0,
        byType: {},
        byPriority: {},
      },
      "Task statistics retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get task by ID
 * Calls: GET /api/v1/approvals/{id}
 */
export async function getTaskById(taskId: string): Promise<APIResponse<Task>> {
  const url = `/api/v1/approvals/${taskId}`;

  try {
    const response = await authenticatedApiClient({ method: "GET", url });

    const item = response.data?.data;
    if (!item) {
      return {
        success: false,
        message: "Task not found",
        data: undefined,
        status: 404,
        statusText: "NOT_FOUND",
      };
    }

    const task: Task = {
      id: item.id,
      taskType: (() => {
        const docType = (item.documentType || "").toLowerCase();
        if (docType === "purchase_order" || docType === "po") return "PURCHASE_ORDER_APPROVAL";
        if (docType === "payment_voucher" || docType === "pv") return "PAYMENT_VOUCHER_APPROVAL";
        if (docType === "goods_received_note" || docType === "grn") return "GOODS_RECEIVED_NOTE_CONFIRMATION";
        if (docType === "budget") return "BUDGET_APPROVAL";
        return "REQUISITION_APPROVAL";
      })() as TaskType,
      title: item.title || item.documentNumber || item.id,
      description: item.description || "",
      assignedTo: item.assignedTo || "",
      assignedRole: item.assignedRole || "",
      status: (item.status?.toUpperCase() || "PENDING") as TaskStatus,
      priority: item.priority?.toUpperCase() || "MEDIUM",
      documentType: item.documentType || "",
      documentId: item.documentId || item.entityId || "",
      documentNumber: item.documentNumber || "",
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
      completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      completedBy: item.completedBy,
      metadata: {
        currentApprovalStage: item.currentStage || item.metadata?.currentApprovalStage,
        totalApprovalStages: item.totalStages || item.metadata?.totalApprovalStages,
        approvalStageName: item.stageName || item.metadata?.approvalStageName,
      },
    };

    return {
      success: true,
      message: "Task retrieved successfully",
      data: task,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Complete a task (approve via workflow)
 * Calls: POST /api/v1/approvals/{id}/approve
 */
export async function completeTask(
  taskId: string,
  _userId: string,
): Promise<APIResponse<Task>> {
  const url = `/api/v1/approvals/${taskId}/approve`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: { remarks: "Completed" },
    });

    return {
      success: true,
      message: "Task completed successfully",
      data: response.data?.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Start a task (claim via workflow)
 * Calls: POST /api/v1/approvals/tasks/{id}/claim
 */
export async function startTask(
  taskId: string,
  _userId: string,
): Promise<APIResponse<Task>> {
  const url = `/api/v1/approvals/tasks/${taskId}/claim`;

  try {
    const response = await authenticatedApiClient({ method: "POST", url });

    return {
      success: true,
      message: "Task started successfully",
      data: response.data?.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}
