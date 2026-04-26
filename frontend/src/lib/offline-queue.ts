/**
 * Offline Operation Queue
 * Stores mutations performed offline and syncs when connection is restored
 * Uses IndexedDB for persistence across page reloads
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Schema for offline operations queue
 */
interface OfflineQueueDB extends DBSchema {
  operations: {
    key: string;
    value: {
      id: string;
      type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'MARK_PAID';
      entity: 'requisition' | 'purchase-order' | 'payment-voucher' | 'grn' | 'budget' | 'vendor' | 'user' | 'organization';
      entityId?: string;
      data: any;
      timestamp: number;
      retries: number;
      status: 'pending' | 'processing' | 'failed' | 'completed';
      error?: string;
      result?: any; // Store the result of successful operations
    };
    indexes: {
      'by-status': 'status';
      'by-entity': 'entity';
      'by-timestamp': 'timestamp';
    };
  };
}

const DB_NAME = 'tether-offline-queue';
const STORE_NAME = 'operations';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB connection
 */
async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  return openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create indices for efficient querying
        store.createIndex('by-status', 'status');
        store.createIndex('by-entity', 'entity');
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });
}

/**
 * Queue an operation for offline execution
 * Returns the operation ID for tracking
 */
export async function queueOperation(
  type: OfflineQueueDB['operations']['value']['type'],
  entity: OfflineQueueDB['operations']['value']['entity'],
  data: any,
  entityId?: string
): Promise<string> {
  try {
    const db = await getDB();
    const operationId = `${entity}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operation: OfflineQueueDB['operations']['value'] = {
      id: operationId,
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    await db.add(STORE_NAME, operation);
    return operationId;
  } catch (error) {
    console.error('[Offline Queue] Failed to queue operation:', error);
    throw error;
  }
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<
  OfflineQueueDB['operations']['value'][]
> {
  try {
    const db = await getDB();
    const index = db.transaction(STORE_NAME).store.index('by-status');
    const operations = await index.getAll('pending' as any);
    return operations;
  } catch (error) {
    console.error('[Offline Queue] Failed to get pending operations:', error);
    return [];
  }
}

/**
 * Update operation status
 */
export async function updateOperationStatus(
  operationId: string,
  status: 'pending' | 'processing' | 'failed' | 'completed',
  result?: any,
  error?: string
): Promise<void> {
  try {
    const db = await getDB();
    const operation = await db.get(STORE_NAME, operationId);

    if (operation) {
      operation.status = status;
      if (result) operation.result = result;
      if (error) operation.error = error;
      if (status === 'processing' || status === 'failed') {
        operation.retries++;
      }
      await db.put(STORE_NAME, operation);
    }
  } catch (error) {
    console.error('[Offline Queue] Failed to update operation:', error);
  }
}

/**
 * Remove completed operation from queue
 */
export async function removeOperation(operationId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, operationId);
  } catch (error) {
    console.error('[Offline Queue] Failed to remove operation:', error);
  }
}

/**
 * Get operation by ID
 */
export async function getOperation(
  operationId: string
): Promise<OfflineQueueDB['operations']['value'] | undefined> {
  try {
    const db = await getDB();
    return await db.get(STORE_NAME, operationId);
  } catch (error) {
    console.error('[Offline Queue] Failed to get operation:', error);
    return undefined;
  }
}

/**
 * Clear all operations (use with caution)
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('[Offline Queue] Failed to clear queue:', error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
}> {
  try {
    const db = await getDB();
    const allOperations = await db.getAll(STORE_NAME);

    return {
      total: allOperations.length,
      pending: allOperations.filter((op) => op.status === 'pending').length,
      processing: allOperations.filter((op) => op.status === 'processing').length,
      failed: allOperations.filter((op) => op.status === 'failed').length,
      completed: allOperations.filter((op) => op.status === 'completed').length,
    };
  } catch (error) {
    console.error('[Offline Queue] Failed to get queue stats:', error);
    return { total: 0, pending: 0, processing: 0, failed: 0, completed: 0 };
  }
}
