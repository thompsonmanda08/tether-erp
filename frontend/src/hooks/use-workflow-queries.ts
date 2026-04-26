"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  setDefaultWorkflow,
  getDefaultWorkflow,
  resolveWorkflowForEntity,
  getWorkflowUsage,
  validateWorkflow,
} from "@/app/_actions/workflows";
import type {
  Workflow,
  WorkflowFormData,
  WorkflowListFilter,
} from "@/app/_actions/workflows";

// Re-export types for convenience
export type { Workflow, WorkflowFormData, WorkflowListFilter };

// Legacy interface for backward compatibility
export interface WorkflowStage {
  id: string;
  order: number;
  name: string;
  description: string;
  approverRole: string;
  requiredApprovals: number;
  canReject: boolean;
  canReassign: boolean;
}

/**
 * Fetch all workflows
 * @param filter - Optional filter parameters
 * @returns Query result with workflows array
 */
export const useWorkflows = ({
  filter,
  initialData,
}: {
  filter?: WorkflowListFilter;
  initialData?: Workflow[];
}) =>
  useQuery({
    queryKey: [QUERY_KEYS.WORKFLOWS.ALL, filter],
    queryFn: async () => {
      const response = await getWorkflows(filter);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData,
  });

/**
 * Fetch a specific workflow by ID
 * @param workflowId - Workflow ID to fetch
 * @returns Query result with workflow details
 */
export const useWorkflowById = (workflowId: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.WORKFLOWS.DETAIL, workflowId],
    queryFn: async () => {
      const response = await getWorkflowById(workflowId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Get default workflow for entity type
 * @param entityType - Entity type
 * @returns Query result with default workflow
 */
export const useDefaultWorkflow = (entityType: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.WORKFLOWS.DEFAULT, entityType],
    queryFn: async () => {
      const response = await getDefaultWorkflow(entityType);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!entityType,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Get workflow usage statistics
 * @param workflowId - Workflow ID
 * @returns Query result with usage stats
 */
export const useWorkflowUsage = (workflowId: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.WORKFLOWS.USAGE, workflowId],
    queryFn: async () => {
      const response = await getWorkflowUsage(workflowId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!workflowId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

/**
 * Create a new workflow
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: WorkflowFormData) => {
      // Transform WorkflowFormData to match backend expectations
      const backendFormData = {
        ...formData,
        stages: formData.stages.map((stage) => ({
          stageNumber: stage.stageNumber || stage.order || 0,
          stageName: stage.stageName || stage.name || "",
          requiredRole: stage.requiredRole || stage.approverRole || "",
          requiredApprovals: stage.requiredApprovals || 1,
          canReject: stage.canReject ?? stage.canBeRejected ?? true,
          canReassign: stage.canReassign ?? stage.canBeReassigned ?? true,
          description: stage.description,
          timeoutHours: stage.timeoutHours,
        })),
      };

      const response = await createWorkflow(backendFormData as any);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOWS.DEFAULT],
      });
      toast.success("Workflow created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create workflow");
    },
  });
};

/**
 * Update an existing workflow
 * @param workflowId - Workflow ID to update
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useUpdateWorkflow = (workflowId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: Partial<WorkflowFormData>) => {
      // Transform WorkflowFormData to match backend expectations
      const backendFormData = {
        ...formData,
        stages: formData.stages?.map((stage) => ({
          stageNumber: stage.stageNumber || stage.order || 0,
          stageName: stage.stageName || stage.name || "",
          requiredRole: stage.requiredRole || stage.approverRole || "",
          requiredApprovals: stage.requiredApprovals || 1,
          canReject: stage.canReject ?? stage.canBeRejected ?? true,
          canReassign: stage.canReassign ?? stage.canBeReassigned ?? true,
          description: stage.description,
          timeoutHours: stage.timeoutHours,
        })),
      };

      const response = await updateWorkflow(workflowId, backendFormData as any);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.WORKFLOWS.DETAIL, workflowId], data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOWS.DEFAULT],
      });
      toast.success("Workflow updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update workflow");
    },
  });
};

/**
 * Delete a workflow
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await deleteWorkflow(workflowId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, workflowId) => {
      // Invalidate all workflow-related queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOWS.DEFAULT],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.USAGE] });

      // Remove the specific workflow from cache
      queryClient.removeQueries({
        queryKey: [QUERY_KEYS.WORKFLOWS.DETAIL, workflowId],
      });

      toast.success("Workflow deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete workflow");
    },
  });
};

/**
 * Duplicate a workflow
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useDuplicateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      newName,
    }: {
      workflowId: string;
      newName?: string;
    }) => {
      const response = await duplicateWorkflow(workflowId, newName);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      toast.success("Workflow duplicated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to duplicate workflow");
    },
  });
};

/**
 * Activate a workflow
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useActivateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await activateWorkflow(workflowId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      queryClient.setQueryData([QUERY_KEYS.WORKFLOWS.DETAIL, data?.id], data);
      toast.success("Workflow activated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to activate workflow");
    },
  });
};

/**
 * Deactivate a workflow
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useDeactivateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await deactivateWorkflow(workflowId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      queryClient.setQueryData([QUERY_KEYS.WORKFLOWS.DETAIL, data?.id], data);
      toast.success("Workflow deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to deactivate workflow");
    },
  });
};

/**
 * Set default workflow for entity type
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useSetDefaultWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      entityType,
    }: {
      workflowId: string;
      entityType: string;
    }) => {
      const response = await setDefaultWorkflow(workflowId, entityType);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOWS.DEFAULT, variables.entityType],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS.ALL] });
      toast.success("Default workflow set successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to set default workflow");
    },
  });
};

/**
 * Resolve workflow for entity
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useResolveWorkflow = () => {
  return useMutation({
    mutationFn: async ({
      entityType,
      document,
    }: {
      entityType: string;
      document?: any;
    }) => {
      const response = await resolveWorkflowForEntity(entityType, document);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to resolve workflow");
    },
  });
};

/**
 * Validate workflow configuration
 * @returns Mutation object with mutateAsync, isPending, error
 */
export const useValidateWorkflow = () => {
  return useMutation({
    mutationFn: async (workflowData: WorkflowFormData) => {
      // Transform WorkflowFormData to match backend expectations
      const backendFormData = {
        ...workflowData,
        stages: workflowData.stages.map((stage) => ({
          stageNumber: stage.stageNumber || stage.order || 0,
          stageName: stage.stageName || stage.name || "",
          requiredRole: stage.requiredRole || stage.approverRole || "",
          requiredApprovals: stage.requiredApprovals || 1,
          canReject: stage.canReject ?? stage.canBeRejected ?? true,
          canReassign: stage.canReassign ?? stage.canBeReassigned ?? true,
          description: stage.description,
          timeoutHours: stage.timeoutHours,
        })),
      };

      const response = await validateWorkflow(backendFormData as any);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.valid) {
        toast.success(data?.message);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to validate workflow");
    },
  });
};
