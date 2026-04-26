import { z } from 'zod'

/**
 * Validation schemas for approval workflows
 * Uses Zod for runtime type checking and TypeScript safety
 */

// Approval form validation
export const approveTaskSchema = z.object({
  signature: z
    .string()
    .min(1, 'Signature is required'),
  comments: z
    .string()
    .optional()
    .default(''),
})

export type ApproveTaskFormData = z.infer<typeof approveTaskSchema>

// Rejection form validation
export const rejectTaskSchema = z.object({
  signature: z
    .string()
    .min(1, 'Signature is required'),
  remarks: z
    .string()
    .min(1, 'Rejection reason is required')
    .min(10, 'Please provide a detailed reason (at least 10 characters)')
    .max(500, 'Reason cannot exceed 500 characters'),
})

export type RejectTaskFormData = z.infer<typeof rejectTaskSchema>

// Reassignment form validation
export const reassignTaskSchema = z.object({
  newApproverId: z
    .string()
    .min(1, 'Please select an approver'),
  reason: z
    .string()
    .optional()
    .default(''),
})

export type ReassignTaskFormData = z.infer<typeof reassignTaskSchema>

// Combined validation for either action
export const approvalActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    signature: z.string().min(1, 'Signature is required'),
    comments: z.string().optional(),
  }),
  z.object({
    action: z.literal('reject'),
    signature: z.string().min(1, 'Signature is required'),
    remarks: z
      .string()
      .min(1, 'Rejection reason is required')
      .min(10, 'Please provide a detailed reason'),
  }),
  z.object({
    action: z.literal('reassign'),
    newApproverId: z.string().min(1, 'Please select an approver'),
    reason: z.string().optional(),
  }),
])

export type ApprovalActionData = z.infer<typeof approvalActionSchema>
