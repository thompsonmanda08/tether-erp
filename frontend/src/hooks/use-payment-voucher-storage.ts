"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PaymentVoucher, ActionHistoryEntry } from "@/types";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getPaymentVouchers,
  getPaymentVoucherById,
} from "@/app/_actions/payment-vouchers";

const PV_STORAGE_KEY = "tether_payment_vouchers";

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Load all payment vouchers from localStorage
 */
function loadPaymentVouchersFromStorage(): PaymentVoucher[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(PV_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load payment vouchers from storage:", error);
    return [];
  }
}

/**
 * Save payment voucher to localStorage
 */
function savePaymentVoucherToStorage(pv: PaymentVoucher): void {
  try {
    if (typeof window === "undefined") return;
    const vouchers = loadPaymentVouchersFromStorage();
    const index = vouchers.findIndex((r) => r.id === pv.id);
    if (index >= 0) {
      vouchers[index] = pv;
    } else {
      vouchers.push(pv);
    }
    localStorage.setItem(PV_STORAGE_KEY, JSON.stringify(vouchers));
  } catch (error) {
    console.error("Failed to save payment voucher to storage:", error);
  }
}

/**
 * Get a specific payment voucher by ID from localStorage
 */
function getPaymentVoucherFromStorage(pvId: string): PaymentVoucher | null {
  try {
    if (typeof window === "undefined") return null;
    const vouchers = loadPaymentVouchersFromStorage();
    return vouchers.find((r) => r.id === pvId) || null;
  } catch (error) {
    console.error("Failed to get payment voucher from storage:", error);
    return null;
  }
}

/**
 * Delete a payment voucher from localStorage
 */
function deletePaymentVoucherFromStorage(pvId: string): void {
  try {
    if (typeof window === "undefined") return;
    const vouchers = loadPaymentVouchersFromStorage();
    const filtered = vouchers.filter((r) => r.id !== pvId);
    localStorage.setItem(PV_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete payment voucher from storage:", error);
  }
}

/**
 * Clear all payment vouchers from localStorage
 */
function clearPaymentVouchersStorage(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PV_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear payment vouchers storage:", error);
  }
}

// ============================================================================
// DATA CONVERSION
// ============================================================================

/**
 * Convert a PaymentVoucher to workflow document format for display in tables
 */
function paymentVoucherToWorkflowDocument(pv: PaymentVoucher) {
  return {
    id: pv.id,
    type: "PAYMENT_VOUCHER" as const,
    documentNumber: pv.documentNumber,
    status: pv.status as any,
    currentStage: pv.currentApprovalStage || 1,
    createdBy: pv.requestedByName,
    createdAt:
      pv.createdAt instanceof Date ? pv.createdAt : new Date(pv.createdAt),
    updatedAt: new Date(),
    metadata: {
      title: pv.title,
      payeeName: pv.vendorName,
      amount: pv.totalAmount,
      currency: pv.currency,
      department: pv.department,
      priority: pv.priority,
      submittedAt: pv.submittedAt,
      approvedAt: pv.approvedAt,
    },
  };
}

/**
 * Public export of conversion function for use in components
 */
export function convertPaymentVoucherToWorkflowDocument(pv: PaymentVoucher) {
  return paymentVoucherToWorkflowDocument(pv);
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to manage payment voucher data with localStorage persistence
 */
export function usePaymentVoucherStorage() {
  const [pvs, setPVs] = useState<PaymentVoucher[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setPVs(loadPaymentVouchersFromStorage());
    setIsHydrated(true);
  }, []);

  // Update single PV in storage
  const updatePV = useCallback(
    (updatedPV: PaymentVoucher) => {
      const updated = pvs.map((pv) =>
        pv.id === updatedPV.id ? updatedPV : pv
      );
      setPVs(updated);
      localStorage.setItem(PV_STORAGE_KEY, JSON.stringify(updated));
    },
    [pvs]
  );

  // Add PV to storage
  const addPV = useCallback(
    (newPV: PaymentVoucher) => {
      const updated = [...pvs, newPV];
      setPVs(updated);
      localStorage.setItem(PV_STORAGE_KEY, JSON.stringify(updated));
    },
    [pvs]
  );

  // Find PV by ID
  const findById = useCallback(
    (pvId: string): PaymentVoucher | undefined => {
      return pvs.find((pv) => pv.id === pvId);
    },
    [pvs]
  );

  return {
    pvs,
    isHydrated,
    loadFromStorage: loadPaymentVouchersFromStorage,
    loadOneFromStorage: getPaymentVoucherFromStorage,
    saveToStorage: savePaymentVoucherToStorage,
    deleteFromStorage: deletePaymentVoucherFromStorage,
    clearStorage: clearPaymentVouchersStorage,
    updatePV,
    addPV,
    findById,
  };
}

/**
 * Action history management for PVs
 */
export const usePaymentVoucherActionHistory = (pvId: string) => {
  const { findById, updatePV } = usePaymentVoucherStorage();

  const addAction = useCallback(
    (action: ActionHistoryEntry) => {
      const pv = findById(pvId);
      if (pv) {
        if (!pv.actionHistory) {
          pv.actionHistory = [];
        }
        pv.actionHistory.push(action);
        pv.updatedAt = new Date();
        updatePV(pv);
      }
    },
    [pvId, findById, updatePV]
  );

  const getHistory = useCallback(() => {
    const pv = findById(pvId);
    return pv?.actionHistory || [];
  }, [pvId, findById]);

  return { addAction, getHistory };
};

/**
 * React Query hook for fetching all payment vouchers with localStorage fallback
 */
export const usePaymentVouchersWithStorage = (
  initialData?: PaymentVoucher[]
) => {
  const { pvs } = usePaymentVoucherStorage();

  return useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL],
    queryFn: async () => {
      const response = await getPaymentVouchers();
      if (response.success && response.data) {
        // Save all to localStorage
        localStorage.setItem(PV_STORAGE_KEY, JSON.stringify(response.data));
        return response.data;
      }
      return pvs;
    },
    initialData: initialData || pvs,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * React Query hook for fetching single PV with localStorage fallback
 */
export const usePaymentVoucherWithStorage = (
  pvId: string,
  initialData?: PaymentVoucher
) => {
  const { findById, updatePV } = usePaymentVoucherStorage();
  const storagePV = findById(pvId);

  return useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.BY_ID, pvId],
    queryFn: async () => {
      const response = await getPaymentVoucherById(pvId);
      if (response.success && response.data) {
        updatePV(response.data);
        return response.data;
      }
      return storagePV;
    },
    initialData: initialData || storagePV,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * React Query hook for fetching payment vouchers as workflow documents
 */
export const usePaymentVouchersAsWorkflowDocuments = (
  includeStorageData = true
) =>
  useQuery({
    queryKey: [QUERY_KEYS.PAYMENT_VOUCHERS.ALL, "as-documents"],
    queryFn: async () => {
      const vouchers = loadPaymentVouchersFromStorage();
      return vouchers.map(paymentVoucherToWorkflowDocument);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
