/**
 * Custom Workflow Types
 * User-defined approval workflows for requisitions, budgets, and other entities
 */

import type { UserRole, DocumentStatus } from "./workflow";

/**
 * Supported entity types that can have custom workflows
 */
export type WorkflowEntityType =
  | "REQUISITION"
  | "BUDGET"
  | "PURCHASE_ORDER"
  | "GOODS_RECEIVED_NOTE"
  | "PAYMENT_VOUCHER"
  | "CUSTOM";

/**
 * Approver assignment type for a workflow stage
 */
export type ApproverAssignmentType = "ROLE" | "USER" | "ROLE_OR_USER";

/**
 * Next stage action configuration
 */
export interface StageTransition {
  // Destination
  nextStage: number | "FINAL"; // Stage number (1, 2, 3...) or 'FINAL' for completion

  // Optional entity status override
  setEntityStatus?: DocumentStatus;

  // Notifications
  notifyUsers: boolean;
  notifyRequester?: boolean;
}

/**
 * Workflow Stage Configuration
 * Defines a single approval stage within a custom workflow
 */
export interface WorkflowStage {
  id?: string; // Optional UUID, can use stageNumber as ID
  stageNumber: number; // 1, 2, 3, etc.
  stageName: string; // e.g., "Department Manager Review"
  description?: string;

  // ============================================================================
  // APPROVER ASSIGNMENT
  // ============================================================================

  // How to assign approver
  approverAssignmentType: ApproverAssignmentType;

  // If ROLE or ROLE_OR_USER
  requiredRole?: UserRole;

  // If USER or ROLE_OR_USER
  specificUserId?: string; // User ID for specific user assignment
  specificUserEmail?: string; // User email for reference/display
  specificUserName?: string; // User name for reference/display

  // ============================================================================
  // REQUIREMENTS & VALIDATION
  // ============================================================================

  // Digital signature requirement
  requiresSignature: boolean; // Default: true for all approvals

  // Comments configuration
  commentsType: "OPTIONAL" | "REQUIRED" | "DISABLED"; // How comments are handled

  // Required validations before approval
  requiredValidations?: string[]; // e.g., ["budgetAvailable", "complianceCheck"]

  // SLA (Service Level Agreement)
  slaHours?: number; // How many hours until escalation?
  escalationRole?: UserRole; // Who to escalate to if SLA breached?

  // ============================================================================
  // ACTIONS ON STAGE COMPLETION
  // ============================================================================

  onApproveActions?: {
    sendNotification: boolean;
    generateQRCode?: boolean;
    generatePaymentReference?: boolean;
    createAuditLog: boolean;
  };

  // ============================================================================
  // STATE TRANSITIONS (ADMIN-DEFINED, USER-TRIGGERED)
  // ============================================================================

  /**
   * Transition when user APPROVES at this stage
   * User action (click "Approve") triggers this transition
   */
  onApprove: StageTransition;

  /**
   * Transition when user REJECTS at this stage
   * User action (click "Reject") triggers this transition
   */
  onReject: {
    nextStage: number | "REJECTED" | "DRAFT"; // Where to send on rejection
    setEntityStatus?: DocumentStatus;
    notifyRequester: boolean;
    requiresRejectionReason: boolean; // Rejection reason mandatory?
  };

  /**
   * Transition when stage is REVERSED
   * Only if this stage allows reversals
   */
  onReverse?: {
    previousStage?: number; // Which stage to revert to
    resetApprovals: boolean; // Clear subsequent stage approvals?
    notifyAffectedUsers: boolean;
  };

  // ============================================================================
  // PERMISSIONS & CONTROL
  // ============================================================================

  canBeSkipped?: boolean; // Can this stage be skipped?
  canBeReassigned: boolean; // Can approver be reassigned?
  canBeRejected: boolean; // Can this stage be rejected?
  canBeReversed: boolean; // Can this stage be reversed?

  // ============================================================================
  // UI & ORDERING
  // ============================================================================

  displayOrder: number; // Visual order in UI
  color?: string; // Optional color for UI visualization
}

/**
 * Custom Workflow Definition
 * User-created workflow that can be applied to entities
 */
export interface CustomWorkflow {
  // ============================================================================
  // IDENTITY & METADATA
  // ============================================================================

  id: string; // UUID or unique identifier
  name: string; // e.g., "2-Stage Fast Track"
  description: string; // User-friendly description
  version: number; // Version number (1, 2, 3...) for backward compatibility

  // ============================================================================
  // SCOPE & APPLICABILITY
  // ============================================================================

  // Which entity types can use this workflow?
  applicableEntityTypes: WorkflowEntityType[];

  // Multi-tenancy support (future)
  organizationId?: string;

  // Can this workflow be used as template for cloning?
  isTemplate: boolean;

  // Can new entities use this workflow?
  isActive: boolean;

  // ============================================================================
  // WORKFLOW DEFINITION
  // ============================================================================

  // Array of approval stages in order
  stages: WorkflowStage[];

  // Total number of stages
  totalStages: number;

  // Advanced features (MVP may not support all)
  allowConcurrentApprovals?: boolean; // Future: parallel approvals
  allowMultipleReversals?: boolean; // Can stages be reversed multiple times?
  requireFinalSignoff?: boolean; // Must last approver sign off?

  // ============================================================================
  // AUDIT & TRACKING
  // ============================================================================

  createdBy: string; // User ID of workflow creator
  createdAt: Date;

  updatedBy?: string; // User ID of last updater
  updatedAt?: Date;

  // Usage statistics
  usageCount: number; // How many entities use this workflow?
  lastUsedAt?: Date; // When was it last used?

  // Lifecycle management
  deprecatedAt?: Date; // When was this workflow deprecated?
  deprecationReason?: string; // Why was it deprecated?
}

/**
 * Workflow Assignment
 * Binds an entity (requisition, budget, etc.) to a specific workflow
 */
export interface WorkflowAssignment {
  // ============================================================================
  // IDENTITY
  // ============================================================================

  id: string; // UUID of this assignment

  // ============================================================================
  // ENTITY REFERENCE (what entity is being approved)
  // ============================================================================

  entityId: string; // e.g., requisitionId, budgetId
  entityType: WorkflowEntityType; // What type of entity?

  // ============================================================================
  // WORKFLOW REFERENCE (which workflow to use)
  // ============================================================================

  workflowId: string; // Reference to CustomWorkflow.id
  workflowVersion: number; // Which version of workflow (immutable)

  // ============================================================================
  // CURRENT STATE
  // ============================================================================

  currentStageNumber: number; // Which stage we're currently on (0 = not started)
  stageStartedAt?: Date; // When did current stage start?

  // ============================================================================
  // EXECUTION HISTORY
  // ============================================================================

  stageHistory: StageExecution[]; // Complete record of each stage execution

  // ============================================================================
  // METADATA
  // ============================================================================

  assignedAt: Date; // When was this assignment created?
  assignedBy: string; // User ID who submitted the entity

  completedAt?: Date; // When did workflow complete?
  completedBy?: string; // Who completed final approval?
}

/**
 * Stage Execution
 * Record of what happened at a single workflow stage
 */
export interface StageExecution {
  // ============================================================================
  // STAGE INFORMATION
  // ============================================================================

  stageNumber: number;
  stageName: string;

  // ============================================================================
  // APPROVER ASSIGNMENT (who approved)
  // ============================================================================

  // Can be a single user or multiple (if reassigned)
  assignedTo: string; // Current approver user ID
  assignedRole?: UserRole; // Their role at time of assignment

  assignmentHistory?: StageAssignment[]; // Trail of reassignments

  // ============================================================================
  // EXECUTION STATUS
  // ============================================================================

  status: "PENDING" | "APPROVED" | "REJECTED" | "REVERSED" | "SKIPPED";

  // Timeline
  startedAt: Date; // When did this stage begin?
  completedAt?: Date; // When was it completed?
  completedBy?: string; // Which user completed it?

  // ============================================================================
  // APPROVAL DETAILS
  // ============================================================================

  comments?: string; // Approver's additional comments
  remarks?: string; // Rejection reason (for rejections)
  signature?: string; // Base64 encoded digital signature (PNG)

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validationsPerformed?: Record<string, boolean>; // Which validations were checked?
  validationErrors?: string[]; // Any validation failures?

  // ============================================================================
  // REVERSAL (if this stage was reversed)
  // ============================================================================

  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
  reversedToStage?: number; // Which stage was it reverted to?
}

/**
 * Task Assignment History
 * Track reassignments of a stage approval
 */
export interface StageAssignment {
  assignedTo: string; // User ID
  assignedAt: Date; // When assigned
  assignedBy: string; // User ID who did the reassignment
  reassignmentReason?: string; // Why was it reassigned? (optional)
  status: "ASSIGNED" | "REASSIGNED_TO_OTHER" | "COMPLETED";
  completedAt?: Date; // When did this user complete it? (null if reassigned)
}

/**
 * Workflow Default Configuration
 * Set which workflow is default for each entity type
 */
export interface WorkflowDefault {
  id: string;

  // Which entity type
  entityType: WorkflowEntityType;

  // Which workflow to use by default
  defaultWorkflowId: string;
  workflowVersion: number;

  // Can individual entities override this default?
  canEntityOverride: boolean;

  // When this default became effective
  effectiveDate: Date;
  deprecatedDate?: Date;

  // Audit trail
  createdBy: string;
  createdAt: Date;
}

/**
 * Workflow Statistics
 * Metrics about workflow usage and performance
 */
export interface WorkflowStats {
  workflowId: string;
  workflowName: string;

  // Usage
  totalEntitiesUsingWorkflow: number;
  activeEntities: number; // Currently in approval
  completedEntities: number; // Successfully approved

  // Performance
  averageApprovalTimeHours: number;
  averageTimePerStageHours: Record<number, number>; // Per-stage metrics

  // Health
  rejectionRate: number; // Percentage of rejections
  reversalRate: number; // Percentage of reversals

  // SLA
  slaBreachCount: number;
  slaComplianceRate: number; // Percentage on-time

  // Bottlenecks
  slowestStageNumber?: number;
  slowestStageName?: string;
  bottleneckApprovers?: Array<{
    userId: string;
    userName: string;
    averageHours: number;
    pendingCount: number;
  }>;
}

/**
 * Workflow Validation Error
 * Validation errors when creating or updating a workflow
 */
export interface WorkflowValidationError {
  field: string;
  stageNumber?: number;
  error: string;
  severity: "ERROR" | "WARNING";
}

/**
 * Create Workflow Request DTO
 */
export interface CreateWorkflowRequest {
  name: string;
  description: string;
  applicableEntityTypes: WorkflowEntityType[];
  isTemplate: boolean;
  stages: WorkflowStage[];
  createdBy: string;
}

/**
 * Update Workflow Request DTO
 * Creates new version, doesn't modify existing
 */
export interface UpdateWorkflowRequest {
  workflowId: string;
  name?: string;
  description?: string;
  applicableEntityTypes?: WorkflowEntityType[];
  stages?: WorkflowStage[];
  updatedBy: string;
}

/**
 * Assign Workflow to Entity Request DTO
 */
export interface AssignWorkflowRequest {
  entityId: string;
  entityType: WorkflowEntityType;
  workflowId: string; // Which workflow to use
  assignedBy: string; // User ID doing the assignment
}

/**
 * Approve Stage Request DTO
 * User action to approve at a stage
 */
export interface ApproveStageRequest {
  assignmentId: string; // WorkflowAssignment ID
  stageNumber: number;
  approvingUserId: string;
  comments?: string;
  signature: string; // Digital signature (required)
  validationResults?: Record<string, boolean>;
}

/**
 * Reject Stage Request DTO
 * User action to reject at a stage
 */
export interface RejectStageRequest {
  assignmentId: string;
  stageNumber: number;
  rejectingUserId: string;
  remarks: string; // Rejection reason (required)
  comments?: string;
  signature: string; // Digital signature (required)
}

/**
 * Reassign Stage Request DTO
 * Reassign an approval to a different user
 */
export interface ReassignStageRequest {
  assignmentId: string;
  stageNumber: number;
  newApproverId: string;
  reassignedBy: string; // User ID doing the reassignment
  reassignmentReason?: string; // Why reassign?
}

/**
 * Reverse Stage Request DTO
 * Reverse a stage that was already approved/rejected
 */
export interface ReverseStageRequest {
  assignmentId: string;
  stageNumber: number;
  reversingUserId: string;
  reversalReason: string; // Why reverse?
}
