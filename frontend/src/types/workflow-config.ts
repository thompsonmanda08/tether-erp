/**
 * Workflow Configuration Types
 * Types for workflow management and configuration - aligned with backend
 */

import { UserRole } from './api';
import { User } from './user';

// ================== WORKFLOW TYPES ==================

export interface WorkflowStage {
  stageNumber: number;
  stageName: string;
  approverAssignmentType?: 'USER' | 'ROLE' | 'ROLE_OR_USER';
  requiredRole?: UserRole | string;  // Allow string for compatibility
  specificUserId?: string;
  specificUserEmail?: string;
  requiresSignature?: boolean;
  commentsType?: 'REQUIRED' | 'OPTIONAL' | 'NONE';
  canBeReassigned?: boolean;
  onApprove?: {
    nextStage?: number;
    action: 'NEXT_STAGE' | 'COMPLETE' | 'CUSTOM';
  };
  onReject?: {
    nextStage?: number;
    action: 'RETURN_TO_REQUESTER' | 'RETURN_TO_STAGE' | 'TERMINATE';
  };
  
  // Extended fields for UI compatibility (should be added to backend)
  description?: string;        // Stage description
  canBeRejected?: boolean;     // Whether stage can be rejected
  canBeReversed?: boolean;     // Whether stage can be reversed
  id?: string;                 // Stage ID
  name?: string;               // Alias for stageName
  approverRole?: UserRole | string;     // Alias for requiredRole
  requiredRoleName?: string;   // Resolved role name (populated by backend loadComputedFields)
  order?: number;              // Alias for stageNumber
  requiredApprovals?: number;  // Number of required approvals (default 1)
  canReject?: boolean;         // Alias for canBeRejected
  canReassign?: boolean;       // Alias for canBeReassigned
  timeoutHours?: number;       // Timeout in hours
}

export interface WorkflowConditions {
  amountRange?: { min?: number; max?: number };
  departments?: string[];
  priority?: string[];
  categories?: string[];
  customFields?: Record<string, unknown>;
  // Routing behavior
  routingType?: "procurement" | "accounting";
  autoApprove?: boolean;
  autoGeneratePO?: boolean;
  autoApprovePO?: boolean;
  autoApprovalMaxAmount?: number;
  autoApprovalCategories?: string[];
}

export interface WorkflowFormData {
  name: string;
  description: string;
  entityType: string;
  documentType?: string;       // Alias for entityType
  isActive: boolean;
  isDefault?: boolean;         // Is this the default workflow
  stages: WorkflowStage[];
  conditions?: WorkflowConditions;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  entityType: string;
  documentType?: string;       // Alias for entityType
  version: number;
  isActive: boolean;
  isDefault: boolean;
  status?: string;             // Workflow status (active, inactive, draft)
  stages: WorkflowStage[];
  totalStages: number;
  usageCount: number;
  conditions?: WorkflowConditions;
  applicableEntityTypes?: string[];
  organizationId?: string;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: string;

  // Extended fields for UI compatibility (should be added to backend)
  isTemplate?: boolean;        // Is this a template workflow
}

export interface WorkflowListFilter {
  entityType?: string;
  isActive?: boolean;
  search?: string;
}

// ================== WORKFLOW ASSIGNMENT TYPES ==================

export interface WorkflowAssignment {
  id: string;
  workflowId: string;
  entityId: string;
  entityType: string;
  currentStageNumber: number;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  stageHistory: StageExecution[];
  createdAt: Date;
  updatedAt: Date;
  
  // Extended fields for UI compatibility (should be added to backend)
  completedAt?: Date;          // When assignment was completed
  completedBy?: string;        // Who completed the assignment
  stageStartedAt?: Date;       // When current stage started
}

export interface StageExecution {
  stageNumber: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  assignmentHistory: StageAssignment[];
  startedAt: Date;
  completedAt?: Date;
  
  // Extended fields for UI compatibility (should be added to backend)
  assignedTo?: string;         // Current assignee
  completedBy?: string;        // Who completed the stage
  comments?: string;           // Stage comments
  signature?: string;          // Stage signature
  remarks?: string;            // Stage remarks
  stageName?: string;          // Human-readable stage name
}

export interface StageAssignment {
  assignedTo: string;
  assignedBy: string;
  assignedAt: Date;
  status: 'ASSIGNED' | 'APPROVED' | 'REJECTED' | 'REASSIGNED';
  comments?: string;
  signature?: string;
  completedAt?: Date;
  
  // Extended fields for UI compatibility (should be added to backend)
  reassignmentReason?: string; // Reason for reassignment
}

// ================== WORKFLOW OPERATIONS ==================

export interface ApproveStageRequest {
  workflowAssignmentId: string;
  stageNumber: number;
  comments?: string;
  signature: string;
}

export interface RejectStageRequest {
  workflowAssignmentId: string;
  stageNumber: number;
  reason: string;
  comments?: string;
  signature: string;
  rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
}

export interface ReassignStageRequest {
  workflowAssignmentId: string;
  stageNumber: number;
  newUserId: string;
  reason: string;
  
  // Extended fields for UI compatibility (should be added to backend)
  newApproverId?: string;      // Maps to newUserId
  reassignedBy?: string;       // Who performed the reassignment
  reassignmentReason?: string; // Maps to reason
}

// ================== WORKFLOW VALIDATION ==================

export interface WorkflowValidationError {
  field: string;
  message?: string;           // Made optional for backward compatibility
  severity: 'ERROR' | 'WARNING';
  
  // Extended fields for UI compatibility (should be added to backend)
  stageNumber?: number;        // Stage number where error occurred
  error?: string;              // Maps to message
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationError[];
}