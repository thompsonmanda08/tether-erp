import { useDocumentDetail } from "./use-document-detail";
import {
  usePaymentVoucherById,
  usePaymentVoucherChain,
} from "./use-payment-voucher-queries";
import {
  useSubmitPaymentVoucherForApproval,
  useWithdrawPaymentVoucher,
} from "./use-payment-voucher-mutations";
import { useApprovalPanelData } from "./use-approval-history";
import {
  exportPaymentVoucherPDF,
  getPaymentVoucherPDFBlob,
} from "@/lib/pdf/pdf-export";
import { PaymentVoucher } from "@/types/payment-voucher";

interface UsePaymentVoucherDetailProps {
  pvId: string;
  userId: string;
  userRole: string;
  initialPaymentVoucher?: PaymentVoucher;
}

/**
 * Custom hook for managing payment voucher detail page state and actions
 *
 * Centralizes all data fetching, mutations, and state management for PV details.
 * Integrates with approval workflow, document chain, and PDF export functionality.
 *
 * @param props - Configuration object with pvId, userId, userRole, and optional initial data
 * @returns Object containing document data, UI state, handlers, and permissions
 *
 * @example
 * ```tsx
 * const {
 *   document: pv,
 *   chain,
 *   approvalData,
 *   permissions,
 *   handleSubmitForApproval,
 *   handleWithdraw,
 * } = usePaymentVoucherDetail({ pvId, userId, userRole })
 * ```
 *
 * **Validates: Requirements 4.1-4.10, 10.1-10.6, 16.1-16.8**
 */
export function usePaymentVoucherDetail({
  pvId,
  userId,
  userRole,
  initialPaymentVoucher,
}: UsePaymentVoucherDetailProps) {
  return useDocumentDetail<PaymentVoucher>({
    documentId: pvId,
    userId,
    userRole,
    initialDocument: initialPaymentVoucher,
    documentType: "payment-voucher", // Use hyphen for document type

    // Query hooks
    useDocumentQuery: usePaymentVoucherById,
    useChainQuery: usePaymentVoucherChain,
    useApprovalDataQuery: useApprovalPanelData,

    // Mutation hooks
    useSubmitMutation: (id: string, onSuccess: () => void) => {
      const mutation = useSubmitPaymentVoucherForApproval(onSuccess);
      return {
        mutateAsync: async (data: any) => {
          return mutation.mutateAsync({
            paymentVoucherId: id,
            pvId: id,
            workflowId: data.workflowId,
            submittingUserId: userId,
            submittedBy: userId,
            submittedByName: data.submittedByName || "User",
            submittedByRole: userRole,
            comments: data.comments,
          });
        },
        isPending: mutation.isPending,
      };
    },
    useWithdrawMutation: (onSuccess: () => void) => {
      const mutation = useWithdrawPaymentVoucher(onSuccess);
      return {
        mutateAsync: async (id: string) => {
          return mutation.mutateAsync(id);
        },
        isPending: mutation.isPending,
      };
    },

    // PDF export
    exportPDF: exportPaymentVoucherPDF,
    getPDFBlob: getPaymentVoucherPDFBlob,

    // Permissions logic
    getPermissions: (pv, userId, _userRole) => {
      const isCreator = pv.createdBy === userId;
      const pvStatus = pv.status?.toUpperCase();

      // Can edit if creator and status is DRAFT or REJECTED
      const canEdit =
        isCreator && (pvStatus === "DRAFT" || pvStatus === "REJECTED");

      // Can submit if status is DRAFT and user is creator
      const canSubmit = pvStatus === "DRAFT" && isCreator;

      // Can withdraw if status is PENDING and user is creator
      const canWithdraw = pvStatus === "PENDING" && isCreator;

      return {
        isCreator,
        canEdit,
        canSubmit,
        canWithdraw,
      };
    },

    // No auto-routing for PVs - stay on detail page after submission
    getAutoRouteAfterSubmit: () => null,
  });
}
