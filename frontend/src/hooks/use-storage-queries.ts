"use client";

/**
 * React Query Hooks for Storage - Unified Data Source
 *
 * ============================================================================
 * SINGLE SOURCE OF TRUTH PATTERN
 * ============================================================================
 *
 * This module provides React Query integration for all workflow documents
 * (Purchase Orders, Requisitions, Payment Vouchers) using localStorage as the
 * primary data source. This ensures:
 *
 * - ✓ Single source of truth: localStorage is the only source of data
 * - ✓ Automatic cache invalidation: staleTime: 0 ensures fresh data on every mount
 * - ✓ Refetch on demand: Components can trigger refetch via refreshTrigger
 * - ✓ Backward compatibility: Still works with seed data initialization
 * - ✓ Ready for backend API: Easy migration when APIs are available
 *
 * ============================================================================
 * BACKEND API INTEGRATION GUIDE
 * ============================================================================
 *
 * When backend APIs are ready, update each hook's queryFn as follows:
 *
 * BEFORE (localStorage):
 *   queryFn: () => getPurchaseOrders(),
 *
 * AFTER (backend API):
 *   queryFn: async () => {
 *     try {
 *       const response = await fetch('/api/purchase-orders');
 *       if (!response.ok) throw new Error('Failed to fetch');
 *       return response.json();
 *     } catch (error) {
 *       console.error('API call failed, falling back to storage');
 *       return getPurchaseOrders(); // Fallback for offline support
 *     }
 *   },
 *
 * Expected API Endpoints:
 * - GET /api/purchase-orders - Get all POs
 * - GET /api/purchase-orders?createdBy=userId - Filter by creator
 * - GET /api/requisitions - Get all requisitions
 * - GET /api/requisitions?createdBy=userId - Filter by creator
 * - GET /api/payment-vouchers - Get all PVs
 * - GET /api/payment-vouchers?createdBy=userId - Filter by creator
 */

import { useQuery } from "@tanstack/react-query";
import { WorkflowDocument, WorkflowDocumentType } from "@/types/workflow";
import { UserRole } from "@/types/core";
import { PurchaseOrder } from "@/types/purchase-order";
import { PaymentVoucher } from "@/types/payment-voucher";
import { Requisition } from "@/types/requisition";
import { GoodsReceivedNote } from "@/types/goods-received-note";
import {
  getPurchaseOrders,
  getRequisitions,
  getPaymentVouchers,
  getPurchaseOrdersByCreator,
  getRequisitionsByCreator,
  getPaymentVouchersByCreator,
  getGoodsReceivedNotes,
  getGoodsReceivedNotesByCreator,
} from "@/lib/storage";

// ============================================================================
// Purchase Order Queries
// ============================================================================

export const usePurchaseOrdersQuery = () => {
  return useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => getPurchaseOrders(),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const usePurchaseOrdersByCreatorQuery = (userId: string) => {
  return useQuery({
    queryKey: ["purchaseOrders", "byCreator", userId],
    queryFn: () => getPurchaseOrdersByCreator(userId),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
  });
};

export const usePurchaseOrdersAsWorkflowDocumentsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ["purchaseOrders", "asDocuments", userId],
    queryFn: () => {
      let orders = getPurchaseOrders();
      if (userId) {
        orders = orders.filter((po) => po.createdBy === userId);
      }
      return convertToWorkflowDocuments(orders);
    },
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================================
// Requisition Queries
// ============================================================================

export const useRequisitionsQuery = () => {
  return useQuery({
    queryKey: ["requisitions"],
    queryFn: () => getRequisitions(),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

export const useRequisitionsByCreatorQuery = (userId: string) => {
  return useQuery({
    queryKey: ["requisitions", "byCreator", userId],
    queryFn: () => getRequisitionsByCreator(userId),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
  });
};

export const useRequisitionsAsWorkflowDocumentsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ["requisitions", "asDocuments", userId],
    queryFn: () => {
      let reqs = getRequisitions();
      if (userId) {
        reqs = reqs.filter((req) => req.createdBy === userId);
      }
      return convertToWorkflowDocuments(reqs);
    },
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================================
// Payment Voucher Queries
// ============================================================================

export const usePaymentVouchersQuery = () => {
  return useQuery({
    queryKey: ["paymentVouchers"],
    queryFn: () => getPaymentVouchers(),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

export const usePaymentVouchersByCreatorQuery = (userId: string) => {
  return useQuery({
    queryKey: ["paymentVouchers", "byCreator", userId],
    queryFn: () => getPaymentVouchersByCreator(userId),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
  });
};

export const usePaymentVouchersAsWorkflowDocumentsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ["paymentVouchers", "asDocuments", userId],
    queryFn: () => {
      let vouchers = getPaymentVouchers();
      if (userId) {
        vouchers = vouchers.filter((pv) => pv.createdBy === userId);
      }
      return convertToWorkflowDocuments(vouchers);
    },
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================================
// Goods Received Note Queries
// ============================================================================
//
// Backend API Integration Guide:
// When backend APIs are ready, update each hook's queryFn:
//
// BEFORE (localStorage):
//   queryFn: () => getGoodsReceivedNotes(),
//
// AFTER (backend API):
//   queryFn: async () => {
//     try {
//       const response = await fetch('/api/goods-received-notes');
//       if (!response.ok) throw new Error('Failed to fetch');
//       return response.json();
//     } catch (error) {
//       console.error('API call failed, falling back to storage');
//       return getGoodsReceivedNotes(); // Fallback for offline support
//     }
//   },
//
// Expected API Endpoints:
// - GET /api/goods-received-notes - Get all GRNs
// - GET /api/goods-received-notes?createdBy=userId - Filter by creator

export const useGoodsReceivedNotesQuery = () => {
  return useQuery({
    queryKey: ["goodsReceivedNotes"],
    queryFn: () => getGoodsReceivedNotes(),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useGoodsReceivedNotesByCreatorQuery = (userId: string) => {
  return useQuery({
    queryKey: ["goodsReceivedNotes", "byCreator", userId],
    queryFn: () => getGoodsReceivedNotesByCreator(userId),
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
  });
};

export const useGrnsAsWorkflowDocumentsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ["grns", "asDocuments", userId],
    queryFn: () => {
      let grns = getGoodsReceivedNotes();
      if (userId) {
        grns = grns.filter((grn) => grn.createdBy === userId);
      }
      return convertToWorkflowDocuments(grns as any[]);
    },
    staleTime: 0, // Always refetch from storage to ensure fresh data
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================================
// Helper Functions
// ============================================================================

function convertToWorkflowDocuments(documents: any[]): WorkflowDocument[] {
  return documents.map((doc) => {
    // Determine document type based on the document structure
    let docType: WorkflowDocumentType = "requisition"; // Default fallback

    // Check for explicit type property first
    if (doc.type) {
      docType = doc.type as WorkflowDocumentType;
    } else {
      // Determine type based on unique properties - fallback for legacy data
      if (doc.documentNumber && doc.poDocumentNumber) {
        docType = "goods_received_note";
      } else if (doc.documentNumber && doc.vendorId && doc.invoiceNumber) {
        docType = "payment_voucher";
      } else if (doc.documentNumber && doc.vendorId) {
        docType = "purchase_order";
      } else if (doc.documentNumber && doc.items && doc.expectedDeliveryDate) {
        docType = "requisition";
      }
    }

    return {
      id: doc.id,
      type: docType,
      documentNumber: doc.documentNumber || doc.id,
      status: doc.status || "DRAFT",
      currentStage: doc.currentStage || doc.approvalStage || 0,
      createdBy: doc.createdBy,
      createdByUser: doc.createdBy
        ? {
            id: doc.createdBy,
            email: "",
            name: doc.createdByName || "Unknown User",
            role: "requester" as UserRole,
          }
        : undefined,
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
      updatedAt:
        doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt),
      metadata: doc.metadata,
    };
  });
}
