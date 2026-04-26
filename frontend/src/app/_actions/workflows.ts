"use server";

import { APIResponse } from "@/types";
import authenticatedApiClient, {
  handleError,
  successResponse,
  badRequestResponse,
} from "./api-config";
import { revalidatePath } from "next/cache";

// Types for workflow operations
export interface WorkflowStage {
  stageNumber: number;
  stageName: string;
  description?: string;
  requiredRole?: string;
  requiredApprovals?: number;
  timeoutHours?: number;
  canReject?: boolean;
  canReassign?: boolean;
  // Aliases for backward compatibility with workflow-config types
  order?: number;
  name?: string;
  approverRole?: string;
  requiredRoleName?: string; // Resolved role name from backend
  canBeRejected?: boolean;
  canBeReassigned?: boolean;
}

export interface WorkflowFormData {
  name: string;
  description: string;
  entityType: string; // Changed from documentType to match backend
  documentType?: string; // Alias for entityType
  isActive?: boolean;
  isDefault?: boolean;
  stages: WorkflowStage[];
  conditions?: any;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  entityType: string;
  documentType?: string; // For backward compatibility
  version: number;
  isActive: boolean;
  isDefault: boolean;
  conditions?: any;
  stages: WorkflowStage[];
  totalStages: number;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WorkflowListFilter {
  entityType?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Get all workflows with optional filtering
 */
export async function getWorkflows(
  filter?: WorkflowListFilter,
): Promise<APIResponse<Workflow[]>> {
  const url = `/api/v1/workflows`;

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filter?.entityType) params.append("entityType", filter.entityType);
    if (filter?.isActive !== undefined)
      params.append("isActive", filter.isActive.toString());
    if (filter?.isDefault !== undefined)
      params.append("isDefault", filter.isDefault.toString());

    const queryString = params.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await authenticatedApiClient({
      url: fullUrl,
      method: "GET",
    });

    const workflows = response.data.data || response.data;
    return successResponse(workflows, "Workflows retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get a specific workflow by ID
 */
export async function getWorkflowById(
  workflowId: string,
): Promise<APIResponse<Workflow>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "GET",
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  formData: WorkflowFormData,
): Promise<APIResponse<Workflow>> {
  const url = `/api/v1/workflows`;

  try {
    // Use entityType (documentType is deprecated)
    const entityType = formData.entityType;

    // Validate required fields
    if (!formData.name || !entityType || !formData.stages?.length) {
      return badRequestResponse("Name, entity type, and stages are required");
    }

    // Transform data to match backend expectations
    const backendData = {
      name: formData.name,
      description: formData.description,
      entityType: entityType,
      stages: formData.stages.map((stage, index) => ({
        stageNumber: index + 1,
        stageName: stage.stageName,
        description: stage.description,
        requiredRole: stage.requiredRole,
        requiredApprovals: stage.requiredApprovals || 1,
        timeoutHours: stage.timeoutHours,
        canReject: stage.canReject,
        canReassign: stage.canReassign,
      })),
      conditions: formData.conditions,
      isDefault: formData.isDefault,
    };

    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: backendData,
    });
    revalidatePath("/admin/workflows", "page");
    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow created successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  workflowId: string,
  formData: Partial<WorkflowFormData>,
): Promise<APIResponse<Workflow>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}`;

  try {
    // Transform data to match backend expectations
    const backendData: any = {};

    if (formData.name) backendData.name = formData.name;
    if (formData.description) backendData.description = formData.description;
    // Set entityType if provided
    if (formData.entityType) backendData.entityType = formData.entityType;
    if (formData.stages) {
      backendData.stages = formData.stages.map((stage, index) => ({
        stageNumber: index + 1,
        stageName: stage.stageName,
        description: stage.description,
        requiredRole: stage.requiredRole,
        requiredApprovals: stage.requiredApprovals || 1,
        timeoutHours: stage.timeoutHours,
        canReject: stage.canReject,
        canReassign: stage.canReassign,
      }));
    }
    if (formData.conditions !== undefined)
      backendData.conditions = formData.conditions;
    if (formData.isDefault !== undefined)
      backendData.isDefault = formData.isDefault;

    const response = await authenticatedApiClient({
      url,
      method: "PUT",
      data: backendData,
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow updated successfully");
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
  workflowId: string,
): Promise<APIResponse<null>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}`;

  try {
    await authenticatedApiClient({
      url,
      method: "DELETE",
    });

    return successResponse(null, "Workflow deleted successfully");
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(
  workflowId: string,
  newName?: string,
): Promise<APIResponse<Workflow>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}/duplicate`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: newName ? { name: newName } : {},
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow duplicated successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(
  workflowId: string,
): Promise<APIResponse<Workflow>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}/activate`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow activated successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(
  workflowId: string,
): Promise<APIResponse<Workflow>> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}/deactivate`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow deactivated successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Set default workflow for an entity type
 */
export async function setDefaultWorkflow(
  workflowId: string,
  entityType: string,
): Promise<APIResponse<null>> {
  if (!workflowId || !entityType) {
    return badRequestResponse("Workflow ID and entity type are required");
  }

  const url = `/api/v1/workflows/${workflowId}/set-default`;

  try {
    await authenticatedApiClient({
      url,
      method: "POST",
      data: { entityType },
    });

    return successResponse(null, "Default workflow set successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get default workflow for an entity type
 */
export async function getDefaultWorkflow(
  entityType: string,
): Promise<APIResponse<Workflow>> {
  if (!entityType) {
    return badRequestResponse("Entity type is required");
  }

  const url = `/api/v1/workflows/default/${entityType}`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "GET",
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Default workflow retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Resolve workflow for an entity
 */
export async function resolveWorkflowForEntity(
  entityType: string,
  document?: any,
): Promise<APIResponse<Workflow>> {
  if (!entityType) {
    return badRequestResponse("Entity type is required");
  }

  const url = `/api/v1/workflows/resolve`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: {
        entityType,
        document: document || {},
      },
    });

    const workflow = response.data.data || response.data;
    return successResponse(workflow, "Workflow resolved successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Get workflow usage statistics
 */
export async function getWorkflowUsage(
  workflowId: string,
): Promise<
  APIResponse<{ workflowId: string; usageCount: number; canDelete: boolean }>
> {
  if (!workflowId) {
    return badRequestResponse("Workflow ID is required");
  }

  const url = `/api/v1/workflows/${workflowId}/usage`;

  try {
    const response = await authenticatedApiClient({
      url,
      method: "GET",
    });

    const usage = response.data.data || response.data;
    return successResponse(usage, "Workflow usage retrieved successfully");
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Validate workflow configuration
 */
export async function validateWorkflow(
  workflowData: WorkflowFormData,
): Promise<APIResponse<{ valid: boolean; message: string }>> {
  const url = `/api/v1/workflows/validate`;

  try {
    // Transform data to match backend expectations
    const backendData = {
      name: workflowData.name,
      description: workflowData.description,
      entityType: workflowData.entityType,
      stages: workflowData.stages.map((stage, index) => ({
        stageNumber: index + 1,
        stageName: stage.stageName,
        description: stage.description,
        requiredRole: stage.requiredRole,
        requiredApprovals: stage.requiredApprovals,
        timeoutHours: stage.timeoutHours,
        canReject: stage.canReject,
        canReassign: stage.canReassign,
      })),
      conditions: workflowData.conditions,
      isDefault: workflowData.isDefault,
    };

    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: backendData,
    });

    const validation = response.data.data || response.data;
    return successResponse(validation, "Workflow validation completed");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}
