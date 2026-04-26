/**
 * Workflow Types
 * Document types, statuses, and approval workflows
 * Aligned with backend implementations
 */

import { 
  DocumentStatus, 
  ApprovalStatus, 
  ApprovalRecord, 
  ApprovalTask,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
  UserRole,
  User,
  SearchFilters,
  PaginatedResponse
} from './core';
import { StageExecution } from './workflow-config';
import { Requisition, RequisitionItem } from './requisition';

// ================== WORKFLOW DOCUMENT TYPES ==================

export type WorkflowDocumentType =
  | "requisition"
  | "budget" 
  | "purchase_order"
  | "payment_voucher"
  | "goods_received_note"
  | "GOODS_RECEIVED_NOTE"  // Legacy compatibility
  | "REQUISITION"          // Legacy compatibility
  | "BUDGET"               // Legacy compatibility
  | "PURCHASE_ORDER"       // Legacy compatibility
  | "PAYMENT_VOUCHER"      // Legacy compatibility
  | "grn"                  // Alias for goods_received_note
  | "GRN"                  // Uppercase alias
  | "po"                   // Alias for purchase_order
  | "PO"                   // Uppercase alias
  | "pv"                   // Alias for payment_voucher
  | "PV";                  // Uppercase alias

// Re-export common types for backward compatibility
export type { 
  DocumentStatus,
  ApprovalStatus,
  ApprovalRecord,
  ApprovalTask,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
  UserRole
} from './core';

// ================== WORKFLOW PERMISSIONS ==================

export type WorkflowPermission =
  | "view_draft"
  | "edit_draft"
  | "submit_document"
  | "approve_document"
  | "reject_document"
  | "reassign_approver"
  | "view_attachments"
  | "add_attachments"
  | "view_comments"
  | "add_comments"
  | "view_audit_log"
  | "manage_approvers"
  | "manage_workflows";

// Alias for backward compatibility
export type Permission = WorkflowPermission;

// ================== WORKFLOW DOCUMENT BASE ==================

export interface WorkflowDocument {
  id: string;
  type?: WorkflowDocumentType;
  documentNumber?: string;
  status?: DocumentStatus;
  currentStage?: number;
  createdBy?: string;
  createdByUser?: User;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

// ================== WORKFLOW CONFIGURATION ==================

// ================== WORKFLOW CONFIGURATION ==================

export interface DocumentApprovalConfig {
  documentType: WorkflowDocumentType;
  approvalStages: ApprovalStageConfig[];
  requiredValidations: string[];
  allowParallelApproval: boolean;
  autoAdvanceOnApproval: boolean;
}

export interface ApprovalStageConfig {
  stageNumber: number;
  stageName: string;
  description: string;
  requiredRole: UserRole;
  alternativeRoles: UserRole[];
  isRequired: boolean;
  canBeSkipped: boolean;
  canBeRejected: boolean;
  canBeReversed: boolean;
  requiredValidations: string[];
  onApprove: {
    nextStage: number | "FINAL";
    actions: string[];
  };
  onReject: {
    returnTo: number | "DRAFT" | "REJECTED";
    actions: string[];
  };
  specificUserId?: string;
  specificUserEmail?: string;
  timeoutHours?: number;
  escalationUserId?: string;
}

export interface ApprovalState {
  documentId: string;
  documentType: WorkflowDocumentType;
  currentStageNumber: number;
  status: ApprovalStatus;
  stageHistory: StageExecution[];
  canApprove: boolean;
  canReject: boolean;
  canReassign: boolean;
  nextApprover?: User;
  previousApprover?: User;
}

export interface WorkflowStep {
  id?: string;
  workflowType: WorkflowDocumentType;
  stepOrder: number;
  roleName: UserRole;
  description: string;
  isRequired: boolean;
  permissions?: WorkflowPermission[];
  
  // UI compatibility fields
  name?: string;               // Stage name
  stageName?: string;          // Alias for name
  order?: number;              // Alias for stepOrder
  approverRole?: string;       // Alias for roleName
  requiredApprovals?: number;  // Number of required approvals
  canReject?: boolean;         // Can this stage reject
  canReassign?: boolean;       // Can this stage reassign
}

export interface Approver {
  id: string;
  documentId?: string;
  stepOrder?: number;
  userId?: string;
  user?: User;
  role: UserRole;
  assignedAt?: Date;
  canReassign?: boolean;
  status?: ApprovalStatus;
  
  // Extended fields for UI compatibility (should be added to backend)
  name?: string;               // Approver name
  email?: string;              // Approver email
  department?: string;         // Approver department
}

// ================== WORKFLOW HISTORY ==================

export type ApprovalAction =
  | "approved"
  | "rejected"
  | "commented"
  | "reassigned"
  | "reversed";

export interface ApprovalLogEntry {
  id: string;
  documentId: string;
  approver: User;
  approverId: string;
  action: ApprovalAction;
  timestamp: Date;
  comments?: string;
  remarks?: string;
  signature?: string;
  ipAddress?: string;
}

// ================== ATTACHMENTS ==================

export interface Attachment {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: User;
  uploadedById: string;
  uploadedAt: Date;
  storagePath: string;
  visibleToRoles: UserRole[];
}

// ================== RESPONSE WRAPPERS ==================

// Re-export from core to avoid duplication
export type { PaginatedResponse } from './core';

// ================== SEARCH AND FILTERS ==================

// Re-export from core to avoid duplication  
export type { SearchFilters } from './core';

// ================== RE-EXPORTS FOR BACKWARD COMPATIBILITY ==================

// Re-export Requisition types for backward compatibility
export type { Requisition, RequisitionItem } from './requisition';
export type RequisitionForm = Requisition; // Alias for backward compatibility
