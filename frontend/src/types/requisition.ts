/**
 * Requisition Types
 * Aligned with backend models and database schema
 */

import type { Vendor } from "./core";

// ============================================================================
// CORE REQUISITION TYPES
// ============================================================================

export interface RequisitionAttachment {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface RequisitionItem {
  id?: string;
  description: string;
  itemDescription?: string; // Alias for description
  quantity: number;
  unitPrice: number;
  amount: number;
  estimatedCost?: number; // Alias for amount
  unit?: string;
  category?: string;
  notes?: string;
  itemNumber?: number; // For UI compatibility
  totalPrice?: number; // Alias for amount
}

export interface LinkedPOSummary {
  id: string;
  documentNumber: string;
  status: string;
}

export interface Requisition {
  // Core fields
  id: string;
  organizationId: string;
  documentNumber: string;
  requesterId: string;
  requester?: any;
  requesterName: string;
  title: string;
  description: string;
  department: string;
  departmentId: string;
  status: RequisitionStatus; // draft, pending, approved, rejected, completed, cancelled
  priority: RequisitionPriority; // low, medium, high, urgent
  items: RequisitionItem[];
  totalAmount: number;
  currency: string;
  approvalStage: number;
  approvalHistory: any[];
  categoryId?: string;
  category?: any;
  categoryName: string;
  preferredVendorId?: string;
  preferredVendor?: Vendor;
  preferredVendorName: string;

  automationUsed?: boolean;
  autoCreatedPO?: boolean;
  isEstimate: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Business requirement fields
  budgetCode: string;
  sourceOfFunds?: string; // Source of funding for the requisition
  requestedByName: string; // Same as requesterName
  requestedByRole: string;
  requestedBy: string; // Same as requesterId
  totalApprovalStages: number;
  requestedDate: Date;
  requiredByDate: Date;
  costCenter: string;
  projectCode: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  requestedFor?: string; // Who the requisition is for
  otherCategoryText?: string; // Custom category name when "OTHER" is selected

  // UI compatibility fields
  currentStage?: number;
  currentApprovalStage?: number;
  actionHistory?: any[];
  metadata?: Record<string, any>;
  type?: string;
  createdByUser?: any;
  approvalChain?: any[]; // For PDF generation
  vendorId?: string; // For PO creation
  vendorName?: string; // For PO creation
  attachments?: RequisitionAttachment[]; // Supporting documents
  linkedPO?: LinkedPOSummary; // Populated on list responses
  /** Quotations collected for this REQ (stored in metadata["quotations"]) */
  quotations?: import("./core").Quotation[];
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CreateRequisitionRequest {
  title: string;
  description: string;
  department: string;
  departmentId: string;
  priority: string;
  items: RequisitionItem[];
  totalAmount: number;
  currency: string;
  categoryId?: string;
  preferredVendorId?: string;
  isEstimate: boolean;

  // Business requirement fields
  requiredByDate: Date;
  budgetCode: string;
  sourceOfFunds?: string; // Source of funding for the requisition
  costCenter: string;
  projectCode: string;
  requestedFor?: string; // Who the requisition is for
  otherCategoryText?: string; // Custom category name when "OTHER" is selected
  attachments?: RequisitionAttachment[]; // Supporting documents
}

export interface UpdateRequisitionRequest {
  requisitionId: string;
  id?: string; // Alias for requisitionId
  title?: string;
  description?: string;
  department?: string;
  departmentId?: string;
  priority?: string;
  items?: RequisitionItem[];
  totalAmount?: number;
  currency?: string;
  categoryId?: string;
  preferredVendorId?: string;
  isEstimate?: boolean;
  requiredByDate?: Date;
  budgetCode?: string;
  sourceOfFunds?: string; // Source of funding for the requisition
  costCenter?: string;
  projectCode?: string;
  requestedFor?: string; // Who the requisition is for
  otherCategoryText?: string; // Custom category name when "OTHER" is selected
  attachments?: RequisitionAttachment[]; // Supporting documents
  quotations?: import("./core").Quotation[]; // Vendor quotations
}

export interface SubmitRequisitionRequest {
  requisitionId: string;
  workflowId: string; // REQUIRED - Workflow to use for approval
  submittedBy: string;
  submittedByName: string;
  submittedByRole: string;
  comments?: string;
}

export interface ApproveRequisitionRequest {
  requisitionId: string;
  approvingUserId: string;
  approvingUserName: string;
  approvingUserRole: string;
  signature: string;
  comments?: string;
  stageNumber?: number;
}

export interface RejectRequisitionRequest {
  requisitionId: string;
  rejectingUserId: string;
  rejectingUserName: string;
  rejectingUserRole: string;
  remarks: string;
  signature: string;
  comments?: string;
  returnTo?: "original_submitter" | "previous_stage";
}

// ============================================================================
// ROUTING / SUBMIT RESPONSE TYPES
// ============================================================================

export interface SubmitRoutingResponse {
  requisition: Requisition;
  routing: {
    path: "procurement" | "accounting";
    autoApproved: boolean;
  };
  workflow?: {
    assignmentId: string;
    workflowId: string;
    currentStage: number;
    status: string;
  };
  autoCreatedPO?: {
    id: string;
    status: string;
  };
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface RequisitionStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
  totalAmount: number;
}

// ============================================================================
// TYPE ALIASES
// ============================================================================

export type RequisitionStatus =
  | "DRAFT"
  | "PENDING"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";
export type RequisitionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// ============================================================================
// DOCUMENT CHAIN TYPES
// ============================================================================

export interface RequisitionChain {
  requisitionId: string;
  requisitionStatus: string;
  poId?: string;
  poDocumentNumber?: string;
  poStatus?: string;
  grnId?: string;
  grnDocumentNumber?: string;
  grnStatus?: string;
  pvId?: string;
  pvDocumentNumber?: string;
  pvStatus?: string;
  routingType?: "procurement" | "accounting";
}

export interface AuditTrailEntry {
  id: string;
  documentId: string;
  documentType: string;
  documentLabel?: string;
  userId: string;
  action: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}
