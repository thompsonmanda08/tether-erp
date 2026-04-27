"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PurchaseOrder } from "@/types/purchase-order";
import { WorkflowDocument } from "@/types/workflow";
import { QUERY_KEYS } from "@/lib/constants";

const PO_STORAGE_KEY = "tether_purchase_orders";

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Load all purchase orders from localStorage
 */
function loadPurchaseOrdersFromStorage(): PurchaseOrder[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(PO_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load purchase orders from storage:", error);
    return [];
  }
}

/**
 * Save purchase order to localStorage
 */
function savePurchaseOrderToStorage(po: PurchaseOrder): void {
  try {
    if (typeof window === "undefined") return;
    const orders = loadPurchaseOrdersFromStorage();
    const index = orders.findIndex((r) => r.id === po.id);
    if (index >= 0) {
      orders[index] = po;
    } else {
      orders.push(po);
    }
    localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error("Failed to save purchase order to storage:", error);
  }
}

/**
 * Get a specific purchase order by ID from localStorage
 */
function getPurchaseOrderFromStorage(poId: string): PurchaseOrder | null {
  try {
    if (typeof window === "undefined") return null;
    const orders = loadPurchaseOrdersFromStorage();
    return orders.find((r) => r.id === poId) || null;
  } catch (error) {
    console.error("Failed to get purchase order from storage:", error);
    return null;
  }
}

/**
 * Delete a purchase order from localStorage
 */
function deletePurchaseOrderFromStorage(poId: string): void {
  try {
    if (typeof window === "undefined") return;
    const orders = loadPurchaseOrdersFromStorage();
    const filtered = orders.filter((r) => r.id !== poId);
    localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete purchase order from storage:", error);
  }
}

/**
 * Clear all purchase orders from localStorage
 */
function clearPurchaseOrdersStorage(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PO_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear purchase orders storage:", error);
  }
}

// ============================================================================
// DATA CONVERSION
// ============================================================================

/**
 * Convert a PurchaseOrder to a WorkflowDocument for display in tables
 */
function purchaseOrderToWorkflowDocument(po: PurchaseOrder): WorkflowDocument {
  return {
    id: po.id,
    type: "purchase_order",
    documentNumber:
      (po as any).documentNumber || `PO-${po.id.substring(0, 8).toUpperCase()}`,
    status: po.status as any,
    currentStage: po.currentStage || 1,
    createdBy: po.createdBy,
    createdAt:
      po.createdAt instanceof Date ? po.createdAt : new Date(po.createdAt),
    updatedAt:
      po.updatedAt instanceof Date ? po.updatedAt : new Date(po.updatedAt),
    metadata: po.metadata,
  };
}

/**
 * Public export of conversion function for use in components
 */
export function convertPurchaseOrderToWorkflowDocument(
  po: PurchaseOrder,
): WorkflowDocument {
  return purchaseOrderToWorkflowDocument(po);
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to manage purchase order data with localStorage persistence
 */
export function usePurchaseOrderStorage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    loadFromStorage: loadPurchaseOrdersFromStorage,
    loadOneFromStorage: getPurchaseOrderFromStorage,
    saveToStorage: savePurchaseOrderToStorage,
    deleteFromStorage: deletePurchaseOrderFromStorage,
    clearStorage: clearPurchaseOrdersStorage,
  };
}

/**
 * React Query hook for fetching all purchase orders with localStorage fallback
 * Merges API data with localStorage data for complete view
 */
export const usePurchaseOrdersWithStorage = (includeStorageData = true) =>
  useQuery({
    queryKey: [
      QUERY_KEYS.PURCHASE_ORDERS?.ALL || "PURCHASE_ORDERS",
      "with-storage",
    ],
    queryFn: async () => {
      let allOrders: PurchaseOrder[] = [];

      // Load from localStorage only (mock data)
      if (typeof window !== "undefined") {
        try {
          const storedOrders = loadPurchaseOrdersFromStorage();
          if (storedOrders && storedOrders.length > 0) {
            allOrders = storedOrders;
          }
        } catch (storageError) {
          console.error(
            "Failed to load purchase orders from storage:",
            storageError,
          );
        }
      }

      return allOrders;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

/**
 * React Query hook for fetching purchase orders as workflow documents
 */
export const usePurchaseOrdersAsWorkflowDocuments = (
  includeStorageData = true,
) =>
  useQuery({
    queryKey: [
      QUERY_KEYS.PURCHASE_ORDERS?.ALL || "PURCHASE_ORDERS",
      "as-documents",
    ],
    queryFn: async () => {
      const orders = loadPurchaseOrdersFromStorage();
      return orders.map(purchaseOrderToWorkflowDocument);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
