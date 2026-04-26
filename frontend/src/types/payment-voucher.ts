/**
 * Payment Voucher Types
 * Aligned with backend models and database schema
 */

// Import shared types from core
import type { PaymentMethod, ActionHistoryEntry, ApprovalRecord, Vendor } from "./core";
import type { WorkflowDocument } from "./workflow";

// ============================================================================
// CORE PAYMENT VOUCHER TYPES
// ============================================================================

export interface PaymentItem {
  description: string;
  amount: number;
  glCode: string;
  taxAmount?: number;
}

/**
 * Payment Voucher document
 *
 * Extends WorkflowDocument to support approval workflow functionality.
 * Represents a payment request to a vendor for goods or services received.
 */
export interface PaymentVoucher extends WorkflowDocument {
  // WorkflowDocument fields (inherited):
  // - id: string
  // - type: "payment_voucher"
  // - documentNumber?: string
  // - status?: DocumentStatus
  // - currentStage?: number
  // - createdBy?: string
  // - createdByUser?: User
  // - createdAt?: Date
  // - updatedAt?: Date
  // - metadata?: Record<string, any>

  /** Type discriminator for WorkflowDocument */
  type: "payment_voucher";

  // ── Core Fields ──
  /** Unique payment voucher identifier */
  id: string;
  /** Organization that owns this PV */
  organizationId: string;
  /** Human-readable document number (e.g., "PV-2024-001") */
  documentNumber: string;
  /** Vendor identifier */
  vendorId: string;
  /** Vendor entity (populated from backend) */
  vendor?: Vendor;
  /** Vendor name for display */
  vendorName: string;
  /** Vendor invoice number */
  invoiceNumber: string;
  /** Current status: DRAFT, IN_REVIEW, PENDING, APPROVED, REJECTED, PAID, COMPLETED, CANCELLED */
  status: PaymentVoucherStatus;
  /** Payment amount */
  amount: number;
  /** Currency code (e.g., "ZMW", "USD") */
  currency: string;
  /** Payment method: bank_transfer, check, cash, wire_transfer */
  paymentMethod: string;
  /** General ledger code */
  glCode: string;
  /** Detailed description of the payment */
  description: string;
  /** Current approval stage number */
  approvalStage: number;
  /** History of approval actions */
  approvalHistory: ApprovalRecord[];
  /** Complete action history for audit trail */
  actionHistory: ActionHistoryEntry[];
  /** ID of the purchase order that generated this PV */
  linkedPO: string;
  /** Goods-first flow: GRN document number that was approved before this PV */
  linkedGRN?: string;
  /** Procurement flow type: "goods_first" or "payment_first" */
  procurementFlow: "goods_first" | "payment_first";
  /** Timestamp when PV was created */
  createdAt: Date;
  /** Timestamp when PV was last updated */
  updatedAt: Date;

  // ── Business Requirement Fields ──
  /** Bank account details for payment */
  bankDetails: any;
  /** Date when payment was requested */
  requestedDate: Date;
  /** Total amount (alias for amount) */
  totalAmount: number;
  /** Line items for the payment */
  items: PaymentItem[];
  /** Budget code for financial tracking */
  budgetCode: string;
  /** Cost center for accounting */
  costCenter: string;
  /** Project code for project tracking */
  projectCode: string;
  /** Tax amount */
  taxAmount: number;
  /** Withholding tax amount */
  withholdingTaxAmount: number;
  /** Amount actually paid */
  paidAmount: number;
  /** Date when payment was made */
  paidDate: Date;
  /** Payment due date */
  paymentDueDate: Date;
  /** Name of user who requested payment */
  requestedByName: string;
  /** Short title for the PV */
  title: string;
  /** Department name */
  department: string;
  /** Department identifier */
  departmentId: string;
  /** Priority level: LOW, MEDIUM, HIGH, URGENT */
  priority: string;
  /** Timestamp when PV was submitted for approval */
  submittedAt: Date;
  /** Timestamp when PV was approved */
  approvedAt: Date;
  /** User ID who created this PV */
  createdBy: string;
  /** Owner user ID (alias for createdBy) */
  ownerId: string;

  // ── Workflow Fields ──
  /** Current workflow stage (for approval chain display) */
  currentStage?: number;
  /** Current approval stage (alias for currentStage) */
  currentApprovalStage?: number;
  /** Total number of approval stages */
  totalApprovalStages?: number;
  /** Approval chain for workflow display */
  approvalChain?: ApprovalRecord[];
  /** User entity who created this PV */
  createdByUser?: any;
}

/**
 * Type guard to check if a WorkflowDocument is a PaymentVoucher
 *
 * @param doc - The document to check
 * @returns true if the document is a PaymentVoucher, false otherwise
 *
 * @example
 * ```tsx
 * if (isPaymentVoucher(document)) {
 *   // TypeScript now knows document is a PaymentVoucher
 * }
 * ```
 */
export function isPaymentVoucher(doc: WorkflowDocument): doc is PaymentVoucher {
  return doc.type === "payment_voucher";
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CreatePaymentVoucherRequest {
  vendorId: string;
  vendorName?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  glCode: string;
  description: string;
  linkedPO: string;
  /** Goods-first flow: GRN document number approved before this PV */
  linkedGRNDocumentNumber?: string;

  // Business requirement fields
  title: string;
  department: string;
  departmentId: string;
  priority: string;
  items: PaymentItem[];
  budgetCode: string;
  costCenter: string;
  projectCode: string;
  taxAmount: number;
  withholdingTaxAmount: number;
  paymentDueDate: Date;
  bankDetails: any;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  sourcePurchaseOrderId?: string;
  sourceRequisitionId?: string;
}

export interface UpdatePaymentVoucherRequest {
  paymentVoucherId: string;
  pvId?: string; // Alias for paymentVoucherId
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  glCode?: string;
  description?: string;
  title?: string;
  priority?: string;
  items?: PaymentItem[];
  budgetCode?: string;
  costCenter?: string;
  projectCode?: string;
  taxAmount?: number;
  withholdingTaxAmount?: number;
  paymentDueDate?: Date;
  bankDetails?: any;
  updatedBy?: string;
}

export interface SubmitPaymentVoucherRequest {
  paymentVoucherId: string;
  pvId?: string; // Alias for paymentVoucherId
  workflowId: string; // REQUIRED - Workflow to use for approval
  submittingUserId: string;
  submittedBy?: string; // Alias for submittingUserId
  submittedByName: string;
  submittedByRole: string;
  comments?: string;
}

export interface ApprovePaymentVoucherRequest {
  paymentVoucherId: string;
  pvId?: string; // Alias for paymentVoucherId
  approvingUserId: string;
  approvingUserName: string;
  approvingUserRole: string;
  signature: string;
  comments?: string;
}

export interface RejectPaymentVoucherRequest {
  paymentVoucherId: string;
  pvId?: string; // Alias for paymentVoucherId
  rejectingUserId: string;
  rejectingUserName: string;
  rejectingUserRole: string;
  remarks: string;
  signature: string;
  comments?: string;
}

export interface MarkPaymentVoucherPaidRequest {
  paymentVoucherId: string;
  pvId?: string; // Alias for paymentVoucherId
  paidBy: string;
  markedBy?: string; // Alias for paidBy
  markedByName?: string;
  markedByRole?: string;
  paidAt: Date;
  paidDate?: Date; // Alias for paidAt
  paidAmount: number;
  paymentReference?: string;
  referenceNumber?: string; // Alias for paymentReference
  comments?: string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface PaymentVoucherStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  paid: number;
  thisMonth: number;
  totalAmount: number;
}

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * Valid payment voucher status values
 */
export type PaymentVoucherStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED";

// Re-export PaymentMethod from core
export type { PaymentMethod } from "./core";
