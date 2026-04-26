"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getPendingOperations,
  updateOperationStatus,
  removeOperation,
  getQueueStats,
} from "@/lib/offline-queue";
import { useNetwork } from "./use-network";
import { toast } from "sonner";

/**
 * Hook to process offline queue when connection is restored
 * Retries failed operations and syncs data with server
 *
 * Usage:
 * // Add to your root layout or providers
 * useOfflineQueueProcessor();
 */
export function useOfflineQueueProcessor() {
  const { online } = useNetwork();
  const queryClient = useQueryClient();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!online || processingRef.current) return;

    const processQueue = async () => {
      processingRef.current = true;

      try {
        const operations = await getPendingOperations();

        if (operations.length === 0) {
          processingRef.current = false;
          return;
        }

        let successCount = 0;
        let failureCount = 0;

        // Process each operation
        for (const operation of operations) {
          try {
            await updateOperationStatus(operation.id, "processing");

            // Execute operation against real API based on type and entity
            let result;
            switch (operation.entity) {
              case "user":
                result = await executeUserOperation(operation);
                break;
              case "organization":
                result = await executeOrganizationOperation(operation);
                break;
              case "requisition":
                result = await executeRequisitionOperation(operation);
                break;
              case "purchase-order":
                result = await executePurchaseOrderOperation(operation);
                break;
              case "payment-voucher":
                result = await executePaymentVoucherOperation(operation);
                break;
              case "grn":
                result = await executeGRNOperation(operation);
                break;
              case "budget":
                result = await executeBudgetOperation(operation);
                break;
              case "vendor":
                result = await executeVendorOperation(operation);
                break;
              default:
                throw new Error(`Unsupported entity type: ${operation.entity}`);
            }

            await updateOperationStatus(operation.id, "completed", {
              synced: true,
              result,
            });

            await removeOperation(operation.id);
            successCount++;
          } catch (error) {
            failureCount++;
            await updateOperationStatus(
              operation.id,
              operation.retries < 3 ? "pending" : "failed",
              undefined,
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        }

        // Invalidate all module caches to refresh data
        queryClient.invalidateQueries({
          queryKey: queryKeys.requisitions.all(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.purchaseOrders.all(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentVouchers.all(),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });

        // Show results
        const stats = await getQueueStats();
        if (failureCount === 0) {
          toast.dismiss();
          toast.success(`Synced ${successCount} changes successfully`);
        } else {
          toast.dismiss();
          toast.error(
            `Synced ${successCount} changes. ${failureCount} failed. Retrying soon...`,
          );
        }
      } catch (error) {
        toast.error(
          "Failed to sync offline changes. Will retry automatically.",
        );
      } finally {
        processingRef.current = false;

        // Retry processing in case new operations were added
        setTimeout(() => {
          processQueue();
        }, 5000);
      }
    };

    // Start processing when connection is restored
    processQueue();
  }, [online, queryClient]);
}

/**
 * Hook to show offline indicator in UI
 *
 * Usage:
 * const isOffline = useOfflineStatus();
 * return isOffline && <div>You are offline. Changes will sync when connected.</div>
 */
export function useOfflineStatus(): boolean {
  const { online } = useNetwork();
  return !online;
}

/**
 * Hook to get queue statistics
 *
 * Usage:
 * const stats = useQueueStats();
 * return <div>Pending syncs: {stats.pending}</div>
 */
export function useQueueStats() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
  });

  useEffect(() => {
    const checkStats = async () => {
      const currentStats = await getQueueStats();
      setStats(currentStats);
    };

    checkStats();
    const interval = setInterval(checkStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// ============================================================================
// OPERATION EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute user operations against the API
 */
async function executeUserOperation(operation: any) {
  const { createNewUser, updateUser, deactivateUser } =
    await import("@/app/_actions/user-actions");

  switch (operation.type) {
    case "CREATE":
      return await createNewUser(operation.data);
    case "UPDATE":
      return await updateUser(operation.data.id, operation.data);
    case "DELETE":
      return await deactivateUser(operation.data.userId);
    default:
      throw new Error(`Unsupported user operation: ${operation.type}`);
  }
}

/**
 * Execute organization operations against the API
 */
async function executeOrganizationOperation(operation: any) {
  const { createOrganization, updateOrganization } =
    await import("@/app/_actions/organizations");

  switch (operation.type) {
    case "CREATE":
      return await createOrganization(operation.data);
    case "UPDATE":
      return await updateOrganization(operation.data);
    default:
      throw new Error(`Unsupported organization operation: ${operation.type}`);
  }
}

/**
 * Execute requisition operations against the API
 */
async function executeRequisitionOperation(operation: any) {
  const {
    createRequisition,
    updateRequisition,
    deleteRequisition,
    submitRequisitionForApproval,
  } = await import("@/app/_actions/requisitions");

  switch (operation.type) {
    case "CREATE":
      return await createRequisition(operation.data);
    case "UPDATE":
      return await updateRequisition(operation.data);
    case "DELETE":
      return await deleteRequisition(operation.entityId);
    case "SUBMIT":
      return await submitRequisitionForApproval(operation.data);
    default:
      throw new Error(`Unsupported requisition operation: ${operation.type}`);
  }
}

/**
 * Execute purchase order operations against the API
 */
async function executePurchaseOrderOperation(operation: any) {
  // Use existing purchase order actions if available
  try {
    const actions = await import("@/app/_actions/purchase-orders");

    switch (operation.type) {
      case "CREATE":
        return await actions.createPurchaseOrder(operation.data);
      case "UPDATE":
        return await actions.updatePurchaseOrder(operation.data);
      case "DELETE":
        return await actions.deletePurchaseOrder(operation.entityId);
      case "SUBMIT":
        return await actions.submitPurchaseOrderForApproval(operation.data);
      default:
        throw new Error(
          `Unsupported purchase order operation: ${operation.type}`,
        );
    }
  } catch (importError) {
    throw new Error("Purchase order operations not implemented yet");
  }
}

/**
 * Execute payment voucher operations against the API
 */
async function executePaymentVoucherOperation(operation: any) {
  // Use existing payment voucher actions if available
  try {
    const actions = await import("@/app/_actions/payment-vouchers");

    switch (operation.type) {
      case "CREATE":
        return await actions.createPaymentVoucher(operation.data);
      case "UPDATE":
        return await actions.updatePaymentVoucher(operation.data);
      case "DELETE":
        return await actions.deletePaymentVoucher(operation.entityId);
      case "SUBMIT":
        return await actions.submitPaymentVoucherForApproval(operation.data);
      case "MARK_PAID":
        return await actions.markPaymentVoucherAsPaid(operation.data);
      default:
        throw new Error(
          `Unsupported payment voucher operation: ${operation.type}`,
        );
    }
  } catch (importError) {
    throw new Error("Payment voucher operations not implemented yet");
  }
}

/**
 * Execute GRN operations against the API
 */
async function executeGRNOperation(operation: any) {
  // Use existing GRN actions
  const { createGRNAction, updateGRNAction } =
    await import("@/app/_actions/grn-actions");

  switch (operation.type) {
    case "CREATE":
      return await createGRNAction(
        operation.data.poDocumentNumber,
        operation.data.items,
        operation.data.receivedBy,
        operation.data.warehouseLocation,
        operation.data.notes,
      );
    case "UPDATE":
      return await updateGRNAction(operation.entityId, operation.data);
    default:
      throw new Error(`Unsupported GRN operation: ${operation.type}`);
  }
}

/**
 * Execute budget operations against the API
 */
async function executeBudgetOperation(operation: any) {
  // Use existing budget actions if available
  try {
    const actions = await import("@/app/_actions/budgets");

    switch (operation.type) {
      case "CREATE":
        return await actions.createBudget(operation.data);
      case "UPDATE":
        return await actions.updateBudget(operation.entityId, operation.data);
      case "SUBMIT":
        return await actions.submitBudgetForApproval(operation.data);
      default:
        throw new Error(`Unsupported budget operation: ${operation.type}`);
    }
  } catch (importError) {
    throw new Error("Budget operations not implemented yet");
  }
}

/**
 * Execute vendor operations against the API
 */
async function executeVendorOperation(operation: any) {
  // Vendor actions are not implemented yet, skip for now
  throw new Error("Vendor operations not implemented yet");
}
