/**
 * Document Detail Hooks
 *
 * Reusable hooks for managing document detail pages across all document types.
 * Each hook encapsulates common logic for:
 * - State management (loading, dialogs, attachments)
 * - PDF export and preview
 * - Document submission and withdrawal
 * - Permissions and access control
 * - Approval workflows
 */

export { useDocumentDetail } from "./use-document-detail";
export type { DocumentDetailConfig } from "./use-document-detail";

export { useRequisitionDetail } from "./use-requisition-detail";
export { usePurchaseOrderDetail } from "./use-purchase-order-detail";
export { usePaymentVoucherDetail } from "./use-payment-voucher-detail";
export { useGRNDetail } from "./use-grn-detail";
export { useBudgetDetail } from "./use-budget-detail";
