"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  submitPaymentVoucherForApproval,
  markPaymentVoucherAsPaid,
  withdrawPaymentVoucher,
} from "@/app/_actions/payment-vouchers";
import {
  SubmitPaymentVoucherRequest,
  MarkPaymentVoucherPaidRequest,
} from "@/types/payment-voucher";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Submit payment voucher for approval mutation hook
 *
 * Submits a DRAFT payment voucher to the workflow engine for approval.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful submission
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const submitMutation = useSubmitPaymentVoucherForApproval(() => {
 *   router.push('/payment-vouchers')
 * })
 *
 * await submitMutation.mutateAsync({
 *   paymentVoucherId: 'pv-123',
 *   workflowId: 'workflow-1',
 *   submittingUserId: userId,
 *   submittedByName: 'John Doe',
 *   submittedByRole: 'FINANCE_OFFICER',
 *   comments: 'Please review urgently'
 * })
 * ```
 *
 * **Validates: Requirements 1.4, 10.6, 18.2**
 */
export const useSubmitPaymentVoucherForApproval = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitPaymentVoucherRequest) => {
      const result = await submitPaymentVoucherForApproval(data);
      if (!result.success) {
        throw new Error(result.message || "Failed to submit payment voucher");
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(
        result.message || "Payment voucher submitted for approval successfully",
      );

      // Invalidate payment voucher queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
      });

      // Invalidate specific payment voucher if we have the ID
      if (result.data?.id) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, result.data.id],
        });
      }

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate approval-related queries for approval chain and action tabs
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TASKS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_APPROVALS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_HISTORY],
      });

      // Invalidate generic query keys
      queryClient.invalidateQueries({
        queryKey: ["approvalTasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["approvals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit payment voucher");
    },
  });
};

/**
 * Withdraw payment voucher mutation hook
 *
 * Withdraws a PENDING payment voucher from the approval workflow and returns it to DRAFT status.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful withdrawal
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const withdrawMutation = useWithdrawPaymentVoucher(() => {
 *   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL] })
 * })
 *
 * await withdrawMutation.mutateAsync('pv-123')
 * ```
 *
 * **Validates: Requirements 2.4, 10.6, 18.3**
 *
 * **Note**: Backend endpoint needs to be implemented at POST /api/v1/payment-vouchers/:id/withdraw
 */
export const useWithdrawPaymentVoucher = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentVoucherId: string) => {
      return await withdrawPaymentVoucher(paymentVoucherId);
    },
    onSuccess: (result: any) => {
      toast.success(
        result?.message || "Payment voucher withdrawn successfully",
      );

      // Invalidate payment voucher queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
      });

      // Invalidate specific payment voucher if we have the ID
      if (result?.data?.id) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, result.data.id],
        });
      }

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate approval-related queries for approval chain and action tabs
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TASKS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_APPROVALS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_HISTORY],
      });

      // Invalidate generic query keys
      queryClient.invalidateQueries({
        queryKey: ["approvalTasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["approvals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to withdraw payment voucher");
    },
  });
};

/**
 * Mark payment voucher as paid mutation hook
 *
 * Marks an APPROVED payment voucher as PAID with payment details.
 * Automatically invalidates relevant queries and displays toast notifications.
 *
 * @param onSuccess - Optional callback function executed after successful marking
 * @returns Mutation object with mutate and mutateAsync methods
 *
 * @example
 * ```tsx
 * const markPaidMutation = useMarkPaymentVoucherAsPaid(() => {
 *   router.push('/payment-vouchers')
 * })
 *
 * await markPaidMutation.mutateAsync({
 *   paymentVoucherId: 'pv-123',
 *   paidAmount: 5000,
 *   paidAt: new Date(),
 *   paymentReference: 'TRANSFER-123',
 *   paidBy: userId,
 *   markedByName: 'Finance Officer',
 *   markedByRole: 'FINANCE_OFFICER'
 * })
 * ```
 *
 * **Validates: Requirements 10.6, 18.4**
 */
export const useMarkPaymentVoucherAsPaid = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MarkPaymentVoucherPaidRequest) => {
      const result = await markPaymentVoucherAsPaid(data);
      if (!result.success) {
        throw new Error(
          result.message || "Failed to mark payment voucher as paid",
        );
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(
        result.message || "Payment voucher marked as paid successfully",
      );

      // Invalidate payment voucher queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
      });

      // Invalidate specific payment voucher if we have the ID
      if (result.data?.id) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, result.data.id],
        });
      }

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      // Invalidate approval-related queries for approval chain and action tabs
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TASKS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_APPROVALS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WORKFLOW_HISTORY],
      });

      // Invalidate generic query keys
      queryClient.invalidateQueries({
        queryKey: ["approvalTasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["approvals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark payment voucher as paid");
    },
  });
};
