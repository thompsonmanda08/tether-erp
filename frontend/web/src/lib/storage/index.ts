/**
 * Storage Module
 * Central barrel export for all storage-related utilities
 *
 * Import directly from '@/lib/storage' instead of individual files
 */

// Core storage operations
export { STORAGE_KEYS, getDocuments, getDocumentById, saveDocument, saveDocuments, deleteDocument, clearDocuments, clearAllData, isStorageInitialized, getStorageStats, exportStorageAsJSON } from './storage';

// Initialization
export { initializeStorage, resetStorage } from './init';

// High-level hooks for each document type
export {
  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrderById,
  savePurchaseOrder,
  deletePurchaseOrder,
  filterPurchaseOrders,
  getPurchaseOrdersByStatus,
  getPurchaseOrdersByCreator,
  // Requisitions
  getRequisitions,
  getRequisitionById,
  saveRequisition,
  deleteRequisition,
  filterRequisitions,
  getRequisitionsByStatus,
  getRequisitionsByCreator,
  getRequisitionsByDepartment,
  // Payment Vouchers
  getPaymentVouchers,
  getPaymentVoucherById,
  savePaymentVoucher,
  deletePaymentVoucher,
  filterPaymentVouchers,
  getPaymentVouchersByStatus,
  getPaymentVouchersByCreator,
  getPaymentVouchersByAmount,
  // Goods Received Notes
  getGoodsReceivedNotes,
  getGoodsReceivedNoteById,
  saveGoodsReceivedNote,
  deleteGoodsReceivedNote,
  filterGoodsReceivedNotes,
  getGoodsReceivedNotesByStatus,
  getGoodsReceivedNotesByCreator,
  getGoodsReceivedNotesByPurchaseOrder,
  // Bulk operations
  getAllDocuments,
  getDocumentsByStatus,
  getDocumentsByCreator,
} from './hooks';

// Note: Seed data removed - system is now fully database-driven
