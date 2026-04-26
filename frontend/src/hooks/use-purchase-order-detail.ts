import { useDocumentDetail } from "./use-document-detail";
import {
  usePurchaseOrderById,
  usePurchaseOrderChain,
} from "./use-purchase-order-queries";
import {
  useSubmitPurchaseOrderForApproval,
  useWithdrawPurchaseOrder,
} from "./use-purchase-order-mutations";
import { useApprovalPanelData } from "./use-approval-history";
import {
  exportPurchaseOrderPDF,
  getPurchaseOrderPDFBlob,
} from "@/lib/pdf/pdf-export";
import { PurchaseOrder, PurchaseOrderAttachment } from "@/types/purchase-order";

/**
 * Props for the usePurchaseOrderDetail hook
 */
interface UsePurchaseOrderDetailProps {
  /** Purchase Order ID */
  poId: string;
  /** Current user ID */
  userId: string;
  /** Current user role */
  userRole: string;
  /** Optional initial PO data from server-side rendering */
  initialPurchaseOrder?: PurchaseOrder;
}

/**
 * Custom hook for managing purchase order detail page state and interactions
 *
 * Leverages the useDocumentDetail base hook with PO-specific configuration.
 * Handles all data fetching, mutations, UI state, and permission logic for the PO detail page.
 *
 * @param props - Hook configuration options
 * @param props.poId - Purchase Order ID to fetch and manage
 * @param props.userId - Current user ID for permission checks
 * @param props.userRole - Current user role for permission checks
 * @param props.initialPurchaseOrder - Optional initial PO data from server
 *
 * @returns Object containing:
 * - `document`: The purchase order data
 * - `isLoading`: Loading state for initial data fetch
 * - `chain`: Document chain data (requisition → PO → GRN → PV)
 * - `approvalData`: Approval workflow data (chain, history, status)
 * - `permissions`: Permission flags (canEdit, canSubmit, canWithdraw)
 * - `handleSubmitForApproval`: Function to submit PO for approval
 * - `handleWithdraw`: Function to withdraw PO from approval
 * - `handlePreviewPDF`: Function to preview PO as PDF
 * - `handleExportPDF`: Function to export PO as PDF
 * - And other UI state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   document: purchaseOrder,
 *   isLoading,
 *   permissions,
 *   handleSubmitForApproval,
 *   handleWithdraw
 * } = usePurchaseOrderDetail({
 *   poId: 'po-123',
 *   userId: 'user-456',
 *   userRole: 'PROCUREMENT_OFFICER'
 * });
 *
 * if (isLoading) return <Loading />;
 * if (!purchaseOrder) return <NotFound />;
 *
 * return (
 *   <div>
 *     {permissions.canSubmit && (
 *       <button onClick={() => handleSubmitForApproval('workflow-1')}>
 *         Submit
 *       </button>
 *     )}
 *   </div>
 * );
 * ```
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6, 8.1, 8.2, 8.3**
 */
export function usePurchaseOrderDetail({
  poId,
  userId,
  userRole,
  initialPurchaseOrder,
}: UsePurchaseOrderDetailProps) {
  return useDocumentDetail<PurchaseOrder, PurchaseOrderAttachment>({
    documentId: poId,
    userId,
    userRole,
    initialDocument: initialPurchaseOrder,
    documentType: "purchase-order",

    // Query hooks
    useDocumentQuery: usePurchaseOrderById,
    useChainQuery: usePurchaseOrderChain,
    useApprovalDataQuery: useApprovalPanelData,

    // Mutation hooks
    useSubmitMutation: (id: string, onSuccess: () => void) => {
      const mutation = useSubmitPurchaseOrderForApproval(onSuccess);
      return {
        mutateAsync: async (data: any) => {
          return mutation.mutateAsync({
            purchaseOrderId: id,
            workflowId: data.workflowId,
            submittingUserId: userId,
            submittedByName: data.submittedByName || "User",
            submittedByRole: userRole,
            comments: data.comments,
          });
        },
        isPending: mutation.isPending,
      };
    },
    useWithdrawMutation: (onSuccess: () => void) => {
      const mutation = useWithdrawPurchaseOrder(onSuccess);
      return {
        mutateAsync: async (id: string) => mutation.mutateAsync(id),
        isPending: mutation.isPending,
      };
    },

    // PDF export
    exportPDF: exportPurchaseOrderPDF,
    getPDFBlob: getPurchaseOrderPDFBlob,

    // Permissions logic
    // Requirements 7.1, 7.2: Submit button visible only for creator in DRAFT status
    // Requirement 7.3: Approval controls visible only for approvers
    // Requirements 7.5, 7.6: Edit and withdraw based on status and creator
    getPermissions: (po, userId, _userRole) => {
      const isCreator = po.createdBy === userId;
      const poStatus = po.status?.toUpperCase();
      const canEdit =
        isCreator && (poStatus === "DRAFT" || poStatus === "REJECTED");
      const canSubmit = poStatus === "DRAFT" && isCreator;
      const canWithdraw = poStatus === "PENDING" && isCreator;

      return {
        isCreator,
        canEdit,
        canSubmit,
        canWithdraw,
      };
    },

    // No auto-routing for POs
    getAutoRouteAfterSubmit: () => null,
  });
}
