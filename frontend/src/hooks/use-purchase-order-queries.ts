"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrderForApproval,
  deletePurchaseOrder,
  getPurchaseOrderStats,
  getPurchaseOrderChain,
} from "@/app/_actions/purchase-orders";
import {
  PurchaseOrder,
  PurchaseOrderStats,
  PurchaseOrderChain,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SubmitPurchaseOrderRequest,
} from "@/types/purchase-order";
import { toast } from "sonner";

/**
 * Fetch all purchase orders
 * Standard data - 5 minute refresh interval
 *
 * @param initialPOs - Optional initial data from server component
 * @returns Query result with purchase orders array
 *
 * @example
 * const { data: purchaseOrders } = usePurchaseOrders(initialPOs)
 */
export const usePurchaseOrders = (initialPOs?: PurchaseOrder[]) =>
  useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
    queryFn: async () => {
      const response = await getPurchaseOrders();
      return response.success ? response.data : [];
    },
    initialData: initialPOs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a specific purchase order by ID
 * Includes approval history and action history
 *
 * @param poId - Purchase Order ID to fetch
 * @param initialData - Optional initial data from server component
 * @returns Query result with single purchase order including approval data
 *
 * @example
 * const { data: purchaseOrder } = usePurchaseOrderById(poId)
 */
export const usePurchaseOrderById = (
  poId: string,
  initialData?: PurchaseOrder,
) =>
  useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, poId],
    queryFn: async () => {
      const response = await getPurchaseOrderById(poId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!poId,
  });

/**
 * Fetch purchase order statistics
 *
 * @param initialStats - Optional initial data from server component
 * @returns Query result with purchase order statistics
 *
 * @example
 * const { data: stats } = usePurchaseOrderStats()
 */
export const usePurchaseOrderStats = (initialStats?: PurchaseOrderStats) =>
  useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
    queryFn: async () => {
      const response = await getPurchaseOrderStats();
      return response.success ? response.data : null;
    },
    initialData: initialStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Create or update purchase order mutation
 * Handles both create (no ID) and update (with ID) operations
 * Only DRAFT purchase orders can be updated
 *
 * @param onSuccess - Callback after successful mutation
 * @returns Mutation object with mutate and mutateAsync
 *
 * @example
 * const saveMutation = useSavePurchaseOrder(() => {
 *   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL] })
 * })
 *
 * // Create
 * await saveMutation.mutateAsync({
 *   title: 'IT Equipment',
 *   vendorName: 'Tech Supplier',
 *   items: [...],
 *   createdBy: userId
 * })
 *
 * // Update
 * await saveMutation.mutateAsync({
 *   poId: 'po-1',
 *   title: 'IT Equipment Updated',
 *   items: [...]
 * })
 */
export const useSavePurchaseOrder = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data:
        | CreatePurchaseOrderRequest
        | (UpdatePurchaseOrderRequest & { poId?: string }),
    ) => {
      const response =
        "poId" in data && data.poId
          ? await updatePurchaseOrder(data as UpdatePurchaseOrderRequest)
          : await createPurchaseOrder(data as CreatePurchaseOrderRequest);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      const isUpdate = (response.data as PurchaseOrder & { poId?: string })
        ?.poId;
      toast.success(
        isUpdate
          ? "Purchase order updated successfully"
          : "Purchase order created successfully",
      );

      // Invalidate purchase order queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save purchase order");
    },
  });
};

/**
 * Submit purchase order for approval mutation
 *
 * @deprecated Use useSubmitPurchaseOrderForApproval from use-purchase-order-mutations.ts instead
 * This hook is kept for backward compatibility but will be removed in a future version.
 *
 * @param poId - Purchase Order ID to submit
 * @param onSuccess - Callback after successful submission
 * @returns Mutation object
 *
 * @example
 * const submitMutation = useSubmitPurchaseOrderForApproval(poId)
 * await submitMutation.mutateAsync({
 *   submittedBy: userId,
 *   submittedByName: 'John Doe',
 *   submittedByRole: 'REQUESTER',
 *   comments: 'Please review'
 * })
 */
export const useSubmitPurchaseOrderForApproval = (
  poId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SubmitPurchaseOrderRequest, "poId">) => {
      const response = await submitPurchaseOrderForApproval({
        poId,
        ...data,
      });

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Purchase order submitted for approval");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, poId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit purchase order");
    },
  });
};

/**
 * Delete purchase order mutation
 * Only DRAFT purchase orders can be deleted
 *
 * @param onSuccess - Callback after successful deletion
 * @returns Mutation object
 *
 * @example
 * const deleteMutation = useDeletePurchaseOrder()
 * await deleteMutation.mutateAsync(poId)
 */
export const useDeletePurchaseOrder = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poId: string) => {
      const response = await deletePurchaseOrder(poId);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.STATS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS_PENDING],
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.METRICS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.DASHBOARD.ACTIVITIES],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete purchase order");
    },
  });
};

/**
 * Fetch the document chain for a purchase order (Req → PO → GRN → PV)
 * Integrates with GET /api/document-chain/:documentId endpoint
 * with documentType=purchase_order query parameter
 *
 * @param poId - Purchase Order ID to fetch chain for
 * @param initialData - Optional initial data from server component
 * @returns Query result with document chain data
 *
 * @example
 * const { data: chain } = usePurchaseOrderChain(poId)
 *
 * **Validates: Requirements 8.1, 14.6**
 */
export const usePurchaseOrderChain = (
  poId: string,
  initialData?: PurchaseOrderChain,
) =>
  useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, poId, "chain"],
    queryFn: async () => {
      const response = await getPurchaseOrderChain(poId);
      if (!response.success) throw new Error(response.message);
      return response.data as PurchaseOrderChain;
    },
    initialData,
    enabled: !!poId,
    staleTime: 30 * 1000, // 30 seconds
  });
