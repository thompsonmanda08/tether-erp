/**
 * Form Validation Types
 * Types for form schemas and validation - aligned with backend request types
 */

import { z } from 'zod';

// ================== APPROVAL FORM SCHEMAS ==================

export const approveTaskSchema = z.object({
  comments: z.string().min(1, "Comments are required for approval"),
  signature: z.string().min(1, "Digital signature is required"),
  stageNumber: z.number().optional(),
});

export type ApproveTaskFormData = z.infer<typeof approveTaskSchema>;

export const rejectTaskSchema = z.object({
  remarks: z.string().min(1, "Rejection reason is required"),
  comments: z.string().optional(),
  signature: z.string().min(1, "Digital signature is required"),
  returnTo: z.string().optional(),
});

export type RejectTaskFormData = z.infer<typeof rejectTaskSchema>;

export const reassignTaskSchema = z.object({
  newApproverId: z.string().min(1, "New approver must be selected"),
  reason: z.string().min(1, "Reassignment reason is required"),
});

export type ReassignTaskFormData = z.infer<typeof reassignTaskSchema>;

export const approvalActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    data: approveTaskSchema,
  }),
  z.object({
    action: z.literal("reject"),
    data: rejectTaskSchema,
  }),
  z.object({
    action: z.literal("reassign"),
    data: reassignTaskSchema,
  }),
]);

export type ApprovalActionData = z.infer<typeof approvalActionSchema>;

// ================== BULK OPERATION SCHEMAS ==================

export const bulkApproveSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task must be selected"),
  signature: z.string().min(1, "Digital signature is required"),
  comments: z.string().optional(),
});

export type BulkApproveFormData = z.infer<typeof bulkApproveSchema>;

export const bulkRejectSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task must be selected"),
  signature: z.string().min(1, "Digital signature is required"),
  reason: z.string().min(1, "Rejection reason is required"),
});

export type BulkRejectFormData = z.infer<typeof bulkRejectSchema>;

export const bulkReassignSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task must be selected"),
  newUserId: z.string().min(1, "New approver must be selected"),
  reason: z.string().min(1, "Reassignment reason is required"),
});

export type BulkReassignFormData = z.infer<typeof bulkReassignSchema>;

// ================== USER FORM TYPES ==================

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: string;
  active?: boolean;
  currentOrganizationId?: string;
  preferences?: Record<string, any>;
}

// ================== ROLE FORM TYPES ==================

export interface CreateRoleRequest {
  name: string;
  description: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}