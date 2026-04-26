"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getPaymentVouchers,
  getPaymentVoucherById,
  getPaymentVoucherChain,
  createPaymentVoucher,
  updatePaymentVoucher,
  deletePaymentVoucher,
  getPaymentVoucherStats,
} from "@/app/_actions/payment-vouchers";
import {
  PaymentVoucher,
  PaymentVoucherStats,
  CreatePaymentVoucherRequest,
  UpdatePaymentVoucherRequest,
} from "@/types/payment-voucher";
import { toast } from "sonner";

// Re-export mutation hooks from mutations file
export {
  useSubmitPaymentVoucherForApproval,
  useWithdrawPaymentVoucher,
  useMarkPaymentVoucherAsPaid,
} from "./use-payment-voucher-mutations";

export const usePaymentVouchers = (initialPVs?: PaymentVoucher[]) =>
  useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
    queryFn: async () => {
      const response = await getPaymentVouchers();
      return response.success ? response.data : [];
    },
    initialData: initialPVs,
    staleTime: 5 * 60 * 1000,
  });

export const usePaymentVoucherById = (
  pvId: string,
  initialData?: PaymentVoucher,
) =>
  useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, pvId],
    queryFn: async () => {
      const response = await getPaymentVoucherById(pvId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000,
  });

export const usePaymentVoucherStats = (initialStats?: PaymentVoucherStats) =>
  useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
    queryFn: async () => {
      const response = await getPaymentVoucherStats();
      return response.success ? response.data : null;
    },
    initialData: initialStats,
    staleTime: 10 * 60 * 1000,
  });

export const useSavePaymentVoucher = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data:
        | CreatePaymentVoucherRequest
        | (UpdatePaymentVoucherRequest & { pvId?: string }),
    ) => {
      const response =
        "pvId" in data && data.pvId
          ? await updatePaymentVoucher(data as UpdatePaymentVoucherRequest)
          : await createPaymentVoucher(data as CreatePaymentVoucherRequest);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      const isUpdate = (response.data as PaymentVoucher & { pvId?: string })
        ?.pvId;
      toast.success(
        isUpdate
          ? "Payment voucher updated successfully"
          : "Payment voucher created successfully",
      );

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save payment voucher");
    },
  });
};

export const useDeletePaymentVoucher = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pvId: string) => {
      const response = await deletePaymentVoucher(pvId);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Payment voucher deleted successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.STATS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS_PENDING],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete payment voucher");
    },
  });
};

/**
 * Fetch the document chain for a payment voucher
 * Integrates with GET /api/document-chain/:documentId endpoint
 * with documentType=payment_voucher query parameter
 *
 * Returns the complete procurement flow chain:
 * - Goods-first flow: Requisition → PO → GRN → PV
 * - Payment-first flow: Requisition → PO → PV
 *
 * @param pvId - Payment Voucher ID to fetch chain for
 * @param initialData - Optional initial data from server component
 * @returns Query result with document chain data
 *
 * @example
 * const { data: chain } = usePaymentVoucherChain(pvId)
 *
 * **Validates: Requirements 8.1, 8.7, 17.3, 17.4**
 */
export const usePaymentVoucherChain = (pvId: string, initialData?: any) =>
  useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, pvId, "chain"],
    queryFn: async () => {
      const response = await getPaymentVoucherChain(pvId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    enabled: !!pvId,
    staleTime: 30 * 1000, // 30 seconds
  });
