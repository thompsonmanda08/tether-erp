/**
 * Unified Storage Management
 * Central hub for all localStorage operations across the application
 * Single source of truth for all in-app data
 *
 * When backend APIs are ready:
 * 1. Replace storage.get* calls with API calls
 * 2. Replace storage.save* calls with API mutations
 * 3. Remove this entire folder
 */

// Types are imported where needed in function signatures

// Storage keys constants
export const STORAGE_KEYS = {
  PURCHASE_ORDERS: 'tether_purchase_orders',
  REQUISITIONS: 'tether_requisitions',
  PAYMENT_VOUCHERS: 'tether_payment_vouchers',
  GOODS_RECEIVED_NOTES: 'tether_goods_received_notes',
} as const;

type DocumentType = 'PURCHASE_ORDER' | 'REQUISITION' | 'PAYMENT_VOUCHER';

/**
 * Get all documents of a specific type from localStorage
 */
export function getDocuments<T>(storageKey: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to load documents from ${storageKey}:`, error);
    return [];
  }
}

/**
 * Get a single document by ID
 */
export function getDocumentById<T extends { id: string }>(
  storageKey: string,
  id: string
): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const documents = getDocuments<T>(storageKey);
    return documents.find((doc) => doc.id === id) || null;
  } catch (error) {
    console.error(`Failed to get document ${id} from ${storageKey}:`, error);
    return null;
  }
}

/**
 * Save or update a document
 */
export function saveDocument<T extends { id: string }>(
  storageKey: string,
  document: T
): T {
  try {
    if (typeof window === 'undefined') return document;

    const documents = getDocuments<T>(storageKey);
    const index = documents.findIndex((doc) => doc.id === document.id);

    if (index >= 0) {
      documents[index] = document;
    } else {
      documents.push(document);
    }

    localStorage.setItem(storageKey, JSON.stringify(documents));
    return document;
  } catch (error) {
    console.error(`Failed to save document to ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Save multiple documents
 */
export function saveDocuments<T extends { id: string }>(
  storageKey: string,
  documents: T[]
): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(documents));
  } catch (error) {
    console.error(`Failed to save documents to ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Delete a document by ID
 */
export function deleteDocument(storageKey: string, id: string): void {
  try {
    if (typeof window === 'undefined') return;

    const documents = getDocuments(storageKey);
    const filtered = documents.filter((doc: any) => doc.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch (error) {
    console.error(`Failed to delete document ${id} from ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Clear all documents of a specific type
 */
export function clearDocuments(storageKey: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Failed to clear ${storageKey}:`, error);
    throw error;
  }
}

/**
 * Clear all app data
 */
export function clearAllData(): void {
  try {
    if (typeof window === 'undefined') return;

    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

  } catch (error) {
    console.error('Failed to clear all data:', error);
    throw error;
  }
}

/**
 * Check if storage has been initialized
 */
export function isStorageInitialized(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS) !== null ||
    localStorage.getItem(STORAGE_KEYS.REQUISITIONS) !== null ||
    localStorage.getItem(STORAGE_KEYS.PAYMENT_VOUCHERS) !== null ||
    localStorage.getItem(STORAGE_KEYS.GOODS_RECEIVED_NOTES) !== null
  );
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  purchaseOrders: number;
  requisitions: number;
  paymentVouchers: number;
  goodsReceivedNotes: number;
  total: number;
} {
  return {
    purchaseOrders: getDocuments(STORAGE_KEYS.PURCHASE_ORDERS).length,
    requisitions: getDocuments(STORAGE_KEYS.REQUISITIONS).length,
    paymentVouchers: getDocuments(STORAGE_KEYS.PAYMENT_VOUCHERS).length,
    goodsReceivedNotes: getDocuments(STORAGE_KEYS.GOODS_RECEIVED_NOTES).length,
    total:
      getDocuments(STORAGE_KEYS.PURCHASE_ORDERS).length +
      getDocuments(STORAGE_KEYS.REQUISITIONS).length +
      getDocuments(STORAGE_KEYS.PAYMENT_VOUCHERS).length +
      getDocuments(STORAGE_KEYS.GOODS_RECEIVED_NOTES).length,
  };
}

/**
 * Export storage for debugging purposes
 */
export function exportStorageAsJSON(): Record<string, any> {
  return {
    purchaseOrders: getDocuments(STORAGE_KEYS.PURCHASE_ORDERS),
    requisitions: getDocuments(STORAGE_KEYS.REQUISITIONS),
    paymentVouchers: getDocuments(STORAGE_KEYS.PAYMENT_VOUCHERS),
    goodsReceivedNotes: getDocuments(STORAGE_KEYS.GOODS_RECEIVED_NOTES),
    exportedAt: new Date().toISOString(),
  };
}
