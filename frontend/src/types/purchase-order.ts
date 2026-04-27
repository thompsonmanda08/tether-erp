/**
 * Purchase Order Types
 *
 * Type definitions for Purchase Order entities, requests, and responses.
 * Aligned with backend models and database schema.
 *
 * @module types/purchase-order
 */

import { Vendor } from "./core";
import { WorkflowDocument } from "./workflow";

// ============================================================================
// CORE PURCHASE ORDER TYPES
// ============================================================================

export interface LinkedPVSummary {
  id: string;
  documentNumber: string;
  status: string;
}

/**
 * Attachment metadata for purchase order supporting documents
 */
export interface PurchaseOrderAttachment {
  /** Unique file identifier */
  fileId: string;
  /** Original file name */
  fileName: string;
  /** URL to access the file */
  fileUrl: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type (e.g., "application/pdf", "image/png") */
  mimeType: string;
  /** ISO timestamp when file was uploaded */
  uploadedAt: string;
  /** True when this attachment was copied from the linked requisition */
  fromRequisition?: boolean;
  /** Attachment category tag (e.g., "bank_details", "location_contact", "quotation") */
  category?: string;
}

/**
 * Individual line item in a purchase order
 */
export interface POItem {
  /** Unique item identifier (optional for new items) */
  id?: string;
  /** Item description */
  description: string;
  /** Quantity ordered */
  quantity: number;
  /** Price per unit */
  unitPrice: number;
  /** Total amount for this line item (quantity × unitPrice) */
  amount: number;
  /** Item number from catalog (optional) */
  itemNumber?: string;
  /** Item code from catalog (optional) */
  itemCode?: string;
  /** Alias for amount field */
  totalPrice?: number;
  /** Unit of measurement (e.g., "pcs", "kg", "m") */
  unit?: string;
  /** Item category */
  category?: string;
  /** Additional notes or specifications */
  notes?: string;
}

/**
 * Purchase Order document
 *
 * Extends WorkflowDocument to support approval workflow functionality.
 * Represents a formal order to a vendor for goods or services.
 */
/**
 * Purchase Order document
 *
 * Extends WorkflowDocument to support approval workflow functionality.
 * Represents a formal order to a vendor for goods or services.
 */
export interface PurchaseOrder extends WorkflowDocument {
  // WorkflowDocument fields (inherited):
  // - id: string
  // - type: "purchase_order"
  // - documentNumber?: string
  // - status?: DocumentStatus
  // - currentStage?: number
  // - createdBy?: string
  // - createdByUser?: User
  // - createdAt?: Date
  // - updatedAt?: Date
  // - metadata?: Record<string, any>

  /** Type discriminator for WorkflowDocument */
  type: "purchase_order";

  // ── Core Fields ──
  /** Unique purchase order identifier */
  id: string;
  /** Organization that owns this PO */
  organizationId: string;
  /** Human-readable document number (e.g., "PO-2024-001") */
  documentNumber: string;
  /** Vendor identifier */
  vendorId: string;
  /** Vendor entity (populated from backend) */
  vendor?: Vendor;
  /** Vendor name for display */
  vendorName: string;
  /** Current status: DRAFT, PENDING, APPROVED, REJECTED, FULFILLED, COMPLETED, CANCELLED */
  status: PurchaseOrderStatus;
  /** Line items in this purchase order */
  items: POItem[];
  /** Total amount for all items */
  totalAmount: number;
  /** Currency code (e.g., "ZMW", "USD") */
  currency: string;
  /** Expected delivery date */
  deliveryDate: Date;
  /** Current approval stage number */
  approvalStage: number;
  /** History of approval actions */
  approvalHistory: any[];
  /** ID of the requisition that generated this PO */
  linkedRequisition: string;
  /** Procurement flow override: "" = inherit from org, "goods_first" or "payment_first" */
  procurementFlow?: "" | "goods_first" | "payment_first";
  /** Timestamp when PO was created */
  createdAt: Date;
  /** Timestamp when PO was last updated */
  updatedAt: Date;

  // ── Business Requirement Fields ──
  /** Detailed description of the purchase */
  description: string;
  /** Department name */
  department: string;
  /** Department identifier */
  departmentId: string;
  /** Required by date (alias for deliveryDate) */
  requiredByDate: Date;
  /** Priority level: LOW, MEDIUM, HIGH, URGENT */
  priority: string;
  /** Budget code for financial tracking */
  budgetCode: string;
  /** Cost center for accounting */
  costCenter: string;
  /** Project code for project tracking */
  projectCode: string;
  /** Source requisition ID (alias for linkedRequisition) */
  sourceRequisitionId: string;
  /** Subtotal before tax */
  subtotal: number;
  /** Tax amount */
  tax: number;
  /** Total including tax (alias for totalAmount) */
  total: number;
  /** User ID who created this PO */
  createdBy: string;
  /** Owner user ID (alias for createdBy) */
  ownerId: string;
  /** General ledger code */
  glCode: string;
  /** Short title for the PO */
  title: string;

  // ── UI Compatibility Fields ──
  /** Current workflow stage (for approval chain display) */
  currentStage?: number;
  /** Complete action history for audit log */
  actionHistory?: any[];
  /** Additional metadata (attachments, etc.) */
  metadata?: Record<string, any>;
  /** User entity who created this PO */
  createdByUser?: any;
  /** Approval chain for PDF generation */
  approvalChain?: any[];
  /** Requester ID for PV creation */
  requestedBy?: string;
  /** Requester name for PV creation */
  requestedByName?: string;
  /** Requester role for PV creation */
  requestedByRole?: string;
  /** Linked payment voucher summary (populated on list/detail responses) */
  linkedPV?: LinkedPVSummary;
  /** Estimated cost carried from the source requisition (when isEstimate=true) */
  estimatedCost?: number;
  /** True when PO was auto-generated by an accounting workflow */
  automationUsed?: boolean;
  /** Quotations collected for this PO (stored in metadata["quotations"]) */
  quotations?: import("./core").Quotation[];
  /** True when quotation gate was overridden at submission */
  quotationGateOverridden?: boolean;
  /** Justification text entered when bypassing the quotation gate */
  bypassJustification?: string;
}

/**
 * Type guard to check if a WorkflowDocument is a PurchaseOrder
 *
 * @param doc - The document to check
 * @returns true if the document is a PurchaseOrder, false otherwise
 *
 * @example
 * ```tsx
 * if (isPurchaseOrder(document)) {
 *   // TypeScript now knows document is a PurchaseOrder
 * }
 * ```
 */
export function isPurchaseOrder(doc: WorkflowDocument): doc is PurchaseOrder {
  return doc.type === "purchase_order";
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request payload for creating a new purchase order
 */
/**
 * Request payload for creating a new purchase order
 */
export interface CreatePurchaseOrderRequest {
  /** Vendor identifier (optional if vendorName provided) */
  vendorId?: string;
  /** Vendor name (optional if vendorId provided) */
  vendorName?: string;
  /** Line items for the purchase order */
  items: POItem[];
  /** Total amount for all items */
  totalAmount: number;
  /** Currency code */
  currency: string;
  /** Expected delivery date */
  deliveryDate: Date;
  /** Alias for deliveryDate */
  requiredByDate?: Date;
  /** ID of the requisition that generated this PO */
  linkedRequisition: string;

  // Business requirement fields
  /** Detailed description */
  description: string;
  /** Department name */
  department: string;
  /** Department identifier */
  departmentId: string;
  /** Priority level */
  priority: string;
  /** Budget code */
  budgetCode: string;
  /** Cost center */
  costCenter: string;
  /** Project code */
  projectCode: string;
  /** Short title */
  title: string;
  /** General ledger code */
  glCode: string;
  /** Subtotal before tax */
  subtotal: number;
  /** Tax amount */
  tax: number;
  /** User ID creating the PO */
  createdBy: string;
  /** Creator's name */
  createdByName?: string;
  /** Creator's role */
  createdByRole?: string;
  /** Alias for linkedRequisition */
  sourceRequisitionId?: string;
  /** Procurement flow override */
  procurementFlow?: "" | "goods_first" | "payment_first";
}

/**
 * Request payload for updating an existing purchase order
 */
export interface UpdatePurchaseOrderRequest {
  /** Purchase order ID to update */
  purchaseOrderId: string;
  /** Alias for purchaseOrderId */
  poId?: string;
  /** Updated vendor ID */
  vendorId?: string;
  /** Updated vendor name */
  vendorName?: string;
  /** Updated line items */
  items?: POItem[];
  /** Updated total amount */
  totalAmount?: number;
  /** Updated currency */
  currency?: string;
  /** Updated delivery date */
  deliveryDate?: Date;
  /** Alias for deliveryDate */
  requiredByDate?: Date;
  /** Updated description */
  description?: string;
  /** Updated title */
  title?: string;
  /** Updated priority */
  priority?: string;
  /** Updated budget code */
  budgetCode?: string;
  /** Updated cost center */
  costCenter?: string;
  /** Updated project code */
  projectCode?: string;
  /** Updated metadata (attachments, quotations, etc.) */
  metadata?: Record<string, any>;
  /** Override quotation gate */
  quotationGateOverridden?: boolean;
  /** Justification for bypassing quotation gate */
  bypassJustification?: string;
  /** Updated department name */
  department?: string;
  /** Updated department ID */
  departmentId?: string;
}

/**
 * Request payload for submitting a purchase order for approval
 */
export interface SubmitPurchaseOrderRequest {
  /** Purchase order ID to submit */
  purchaseOrderId: string;
  /** Alias for purchaseOrderId */
  poId?: string;
  /** Workflow ID to use for approval (REQUIRED) */
  workflowId: string;
  /** User ID submitting the PO */
  submittingUserId: string;
  /** Alias for submittingUserId */
  submittedBy?: string;
  /** Submitter's name */
  submittedByName: string;
  /** Submitter's role */
  submittedByRole: string;
  /** Optional submission comments */
  comments?: string;
}

/**
 * Request payload for approving a purchase order
 */
export interface ApprovePurchaseOrderRequest {
  /** Purchase order ID to approve */
  purchaseOrderId: string;
  /** Alias for purchaseOrderId */
  poId?: string;
  /** User ID approving the PO */
  approvingUserId: string;
  /** Approver's name */
  approvingUserName: string;
  /** Approver's role */
  approvingUserRole: string;
  /** Digital signature */
  signature: string;
  /** Optional approval comments */
  comments?: string;
  /** Stage number being approved */
  stageNumber?: number;
}

/**
 * Request payload for rejecting a purchase order
 */
export interface RejectPurchaseOrderRequest {
  /** Purchase order ID to reject */
  purchaseOrderId: string;
  /** Alias for purchaseOrderId */
  poId?: string;
  /** User ID rejecting the PO */
  rejectingUserId: string;
  /** Rejector's name */
  rejectingUserName: string;
  /** Rejector's role */
  rejectingUserRole: string;
  /** Rejection reason (REQUIRED) */
  remarks: string;
  /** Digital signature */
  signature: string;
  /** Optional rejection comments */
  comments?: string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Purchase order statistics for dashboard and reporting
 */
export interface PurchaseOrderStats {
  /** Total number of POs */
  total: number;
  /** Number of draft POs */
  draft: number;
  /** Number of pending POs */
  pending: number;
  /** Number of approved POs */
  approved: number;
  /** Number of fulfilled POs */
  fulfilled: number;
  /** Number of POs created this month */
  thisMonth: number;
  /** Total amount across all POs */
  totalAmount: number;
}

// ============================================================================
// DOCUMENT CHAIN TYPES
// ============================================================================

/**
 * Document chain showing the procurement flow
 * Requisition → PO → GRN → PV
 */
export interface PurchaseOrderChain {
  /** Source requisition ID */
  requisitionId?: string;
  /** Source requisition document number */
  requisitionDocumentNumber?: string;
  /** Source requisition status */
  requisitionStatus?: string;
  /** Purchase order ID */
  poId: string;
  /** Purchase order document number */
  poDocumentNumber: string;
  /** Purchase order status */
  poStatus: string;
  /** Goods receipt note ID (if goods received) */
  grnId?: string;
  /** GRN document number */
  grnDocumentNumber?: string;
  /** GRN status */
  grnStatus?: string;
  /** Payment voucher ID (if payment made) */
  pvId?: string;
  /** PV document number */
  pvDocumentNumber?: string;
  /** PV status */
  pvStatus?: string;
  /** Routing type: procurement (goods first) or accounting (payment first) */
  routingType?: "procurement" | "accounting";
}

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * Valid purchase order status values
 */
export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FULFILLED"
  | "COMPLETED"
  | "CANCELLED";
