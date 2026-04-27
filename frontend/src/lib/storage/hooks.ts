/**
 * Storage Hooks - Data Access Layer
 *
 * ============================================================================
 * PURPOSE
 * ============================================================================
 *
 * These hooks provide a clean API for managing documents (Purchase Orders,
 * Requisitions, Payment Vouchers) with localStorage as the data source.
 *
 * When backend APIs are ready, replace storage functions with API calls
 * without requiring changes to component code.
 *
 * ============================================================================
 * BACKEND API INTEGRATION GUIDE
 * ============================================================================
 *
 * Replace storage function calls with API calls:
 *
 * OLD (localStorage):
 *   export function getPurchaseOrders(): PurchaseOrder[] {
 *     return getDocuments<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS);
 *   }
 *
 * NEW (Backend API):
 *   export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
 *     // TODO: Replace with real backend API endpoint
 *     const response = await fetch('/api/purchase-orders');
 *     if (!response.ok) {
 *       console.error('API Error:', response.statusText);
 *       // Fallback to storage for offline support
 *       return getDocuments<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS);
 *     }
 *     return response.json();
 *   }
 *
 * Expected Backend Endpoints:
 * - GET /api/purchase-orders - Get all purchase orders
 * - GET /api/purchase-orders/:id - Get specific PO
 * - POST /api/purchase-orders - Create new PO
 * - PUT /api/purchase-orders/:id - Update PO
 * - DELETE /api/purchase-orders/:id - Delete PO
 * - GET /api/purchase-orders/by-creator/:userId - Filter by creator
 * - GET /api/purchase-orders/by-status/:status - Filter by status
 *
 * (Similar endpoints for /api/requisitions and /api/payment-vouchers)
 */

import { PurchaseOrder } from "@/types/purchase-order";
import { PaymentVoucher } from "@/types/payment-voucher";
import { Requisition } from "@/types/requisition";
import { GoodsReceivedNote } from "@/types/goods-received-note";
import {
  STORAGE_KEYS,
  getDocuments,
  getDocumentById,
  saveDocument,
  deleteDocument,
} from "./storage";

// ============================================================================
// Purchase Order Hooks
// ============================================================================

export function getPurchaseOrders(): PurchaseOrder[] {
  return getDocuments<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS);
}

export function getPurchaseOrderById(id: string): PurchaseOrder | null {
  return getDocumentById<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS, id);
}

export function savePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return saveDocument<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS, po);
}

export function deletePurchaseOrder(id: string): void {
  deleteDocument(STORAGE_KEYS.PURCHASE_ORDERS, id);
}

export function filterPurchaseOrders(
  predicate: (po: PurchaseOrder) => boolean
): PurchaseOrder[] {
  return getPurchaseOrders().filter(predicate);
}

export function getPurchaseOrdersByStatus(status: string): PurchaseOrder[] {
  return filterPurchaseOrders((po) => (po as any).status === status);
}

export function getPurchaseOrdersByCreator(creatorId: string): PurchaseOrder[] {
  return filterPurchaseOrders(
    (po) =>
      (po as any).createdBy === creatorId || (po as any).ownerId === creatorId
  );
}

// ============================================================================
// Requisition Hooks
// ============================================================================

export function getRequisitions(): Requisition[] {
  return getDocuments<Requisition>(STORAGE_KEYS.REQUISITIONS);
}

export function getRequisitionById(id: string): Requisition | null {
  const req = getDocumentById<Requisition>(STORAGE_KEYS.REQUISITIONS, id);
  // Ensure id is set for compatibility
  if (req && !req.id) {
    req.id = id;
  }
  return req;
}

export function saveRequisition(req: Requisition): Requisition {
  // Ensure id is set before saving
  if (!req.id) {
    req.id = `req-${Date.now()}`;
  }
  return saveDocument<Requisition>(STORAGE_KEYS.REQUISITIONS, req);
}

export function deleteRequisition(id: string): void {
  deleteDocument(STORAGE_KEYS.REQUISITIONS, id);
}

export function filterRequisitions(
  predicate: (req: Requisition) => boolean
): Requisition[] {
  return getRequisitions().filter(predicate);
}

export function getRequisitionsByStatus(status: string): Requisition[] {
  return filterRequisitions((req) => (req as any).status === status);
}

export function getRequisitionsByCreator(creatorId: string): Requisition[] {
  return filterRequisitions(
    (req) =>
      (req as any).createdBy === creatorId ||
      (req as any).requesterId === creatorId
  );
}

export function getRequisitionsByDepartment(department: string): Requisition[] {
  return filterRequisitions(
    (req) =>
      req.department === department ||
      (req as any).metadata?.department === department
  );
}

// ============================================================================
// Payment Voucher Hooks
// ============================================================================

export function getPaymentVouchers(): PaymentVoucher[] {
  return getDocuments<PaymentVoucher>(STORAGE_KEYS.PAYMENT_VOUCHERS);
}

export function getPaymentVoucherById(id: string): PaymentVoucher | null {
  return getDocumentById<PaymentVoucher>(STORAGE_KEYS.PAYMENT_VOUCHERS, id);
}

export function savePaymentVoucher(pv: PaymentVoucher): PaymentVoucher {
  return saveDocument<PaymentVoucher>(STORAGE_KEYS.PAYMENT_VOUCHERS, pv);
}

export function deletePaymentVoucher(id: string): void {
  deleteDocument(STORAGE_KEYS.PAYMENT_VOUCHERS, id);
}

export function filterPaymentVouchers(
  predicate: (pv: PaymentVoucher) => boolean
): PaymentVoucher[] {
  return getPaymentVouchers().filter(predicate);
}

export function getPaymentVouchersByStatus(status: string): PaymentVoucher[] {
  return filterPaymentVouchers((pv) => (pv as any).status === status);
}

export function getPaymentVouchersByCreator(
  creatorId: string
): PaymentVoucher[] {
  return filterPaymentVouchers(
    (pv) =>
      (pv as any).createdBy === creatorId || (pv as any).ownerId === creatorId
  );
}

export function getPaymentVouchersByAmount(
  minAmount: number,
  maxAmount: number
): PaymentVoucher[] {
  return filterPaymentVouchers((pv) => {
    const amount = pv.amount || (pv as any).metadata?.amount || 0;
    return amount >= minAmount && amount <= maxAmount;
  });
}

// ============================================================================
// Bulk Operations
// ============================================================================

export function getAllDocuments() {
  return {
    purchaseOrders: getPurchaseOrders(),
    requisitions: getRequisitions(),
    paymentVouchers: getPaymentVouchers(),
  };
}

export function getDocumentsByStatus(status: string) {
  return {
    purchaseOrders: getPurchaseOrdersByStatus(status),
    requisitions: getRequisitionsByStatus(status),
    paymentVouchers: getPaymentVouchersByStatus(status),
  };
}

export function getDocumentsByCreator(creatorId: string) {
  return {
    purchaseOrders: getPurchaseOrdersByCreator(creatorId),
    requisitions: getRequisitionsByCreator(creatorId),
    paymentVouchers: getPaymentVouchersByCreator(creatorId),
    goodsReceivedNotes: getGoodsReceivedNotesByCreator(creatorId),
  };
}

// ============================================================================
// Goods Received Note Hooks
// ============================================================================
//
// Backend API Integration:
// Replace storage function calls with API calls when backend is ready
//
// OLD (localStorage):
//   export function getGoodsReceivedNotes(): GoodsReceivedNote[] {
//     return getDocuments<GoodsReceivedNote>(STORAGE_KEYS.GOODS_RECEIVED_NOTES);
//   }
//
// NEW (Backend API):
//   export async function getGoodsReceivedNotes(): Promise<GoodsReceivedNote[]> {
//     const response = await fetch('/api/goods-received-notes');
//     if (!response.ok) {
//       return getDocuments<GoodsReceivedNote>(STORAGE_KEYS.GOODS_RECEIVED_NOTES);
//     }
//     return response.json();
//   }
//
// Expected Backend Endpoints:
// - GET /api/goods-received-notes - Get all GRNs
// - GET /api/goods-received-notes/:id - Get specific GRN
// - POST /api/goods-received-notes - Create new GRN
// - PUT /api/goods-received-notes/:id - Update GRN
// - DELETE /api/goods-received-notes/:id - Delete GRN
// - GET /api/goods-received-notes/by-creator/:userId - Filter by creator
// - GET /api/goods-received-notes/by-status/:status - Filter by status
// - GET /api/goods-received-notes/by-purchase-order/:poId - Filter by purchase order

export function getGoodsReceivedNotes(): GoodsReceivedNote[] {
  return getDocuments<GoodsReceivedNote>(STORAGE_KEYS.GOODS_RECEIVED_NOTES);
}

export function getGoodsReceivedNoteById(id: string): GoodsReceivedNote | null {
  return getDocumentById<GoodsReceivedNote>(
    STORAGE_KEYS.GOODS_RECEIVED_NOTES,
    id
  );
}

export function saveGoodsReceivedNote(
  grn: GoodsReceivedNote
): GoodsReceivedNote {
  return saveDocument<GoodsReceivedNote>(
    STORAGE_KEYS.GOODS_RECEIVED_NOTES,
    grn
  );
}

export function deleteGoodsReceivedNote(id: string): void {
  deleteDocument(STORAGE_KEYS.GOODS_RECEIVED_NOTES, id);
}

export function filterGoodsReceivedNotes(
  predicate: (grn: GoodsReceivedNote) => boolean
): GoodsReceivedNote[] {
  return getGoodsReceivedNotes().filter(predicate);
}

export function getGoodsReceivedNotesByStatus(
  status: string
): GoodsReceivedNote[] {
  return filterGoodsReceivedNotes((grn) => grn.status === status);
}

export function getGoodsReceivedNotesByCreator(
  creatorId: string
): GoodsReceivedNote[] {
  return filterGoodsReceivedNotes(
    (grn) =>
      (grn as any).createdBy === creatorId ||
      (grn as any).receivedBy === creatorId
  );
}

export function getGoodsReceivedNotesByPurchaseOrder(
  poId: string
): GoodsReceivedNote[] {
  return filterGoodsReceivedNotes(
    (grn) =>
      grn.poDocumentNumber === poId || (grn as any).metadata?.poId === poId
  );
}
