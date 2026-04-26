/**
 * Offline-aware mutation helper
 * Handles network failures by queuing operations for later sync
 */

import { queueOperation } from './offline-queue';
import { toast } from 'sonner';

export type OfflineOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'MARK_PAID';
export type OfflineEntityType = 'requisition' | 'purchase-order' | 'payment-voucher' | 'grn' | 'budget' | 'vendor' | 'user' | 'organization';

/**
 * Check if error is a network error that should trigger offline handling
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check for common network error indicators
  const networkErrorTypes = [
    'Network Error',
    'ECONNREFUSED',
    'ECONNRESET', 
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNABORTED'
  ];
  
  const errorType = error.type || error.code || error.name || '';
  const errorMessage = error.message || '';
  
  return (
    !navigator.onLine || // Browser is offline
    networkErrorTypes.some(type => 
      errorType.includes(type) || errorMessage.includes(type)
    ) ||
    error.status === 0 || // Network request failed
    (error.status >= 500 && error.status < 600) // Server errors that might be network-related
  );
}

/**
 * Handle mutation with offline support
 * Automatically queues operations when network fails
 */
export async function handleOfflineMutation<T>(
  mutationFn: () => Promise<T>,
  offlineConfig: {
    operation: OfflineOperationType;
    entity: OfflineEntityType;
    data: any;
    entityId?: string;
    localStorageFn?: (data: any) => void; // Function to save to localStorage immediately
    successMessage?: string;
    offlineMessage?: string;
  }
): Promise<T | { success: true; queued: true; data: any }> {
  try {
    // Try the normal mutation first
    const result = await mutationFn();
    return result;
  } catch (error: any) {
    // Check if this is a network error that should trigger offline handling
    if (isNetworkError(error)) {
      
      // Queue the operation for later sync
      const operationId = await queueOperation(
        offlineConfig.operation,
        offlineConfig.entity,
        offlineConfig.data,
        offlineConfig.entityId
      );
      
      // Save to localStorage immediately if function provided
      if (offlineConfig.localStorageFn) {
        offlineConfig.localStorageFn(offlineConfig.data);
      }
      
      // Show offline message
      const message = offlineConfig.offlineMessage || 
        `${offlineConfig.entity} saved offline. Will sync when connected.`;
      toast.info(message);
      
      // Return success with queued flag
      return {
        success: true,
        queued: true,
        data: offlineConfig.data,
        operationId
      } as any;
    }
    
    // Re-throw non-network errors
    throw error;
  }
}

/**
 * Enhanced mutation result type that includes offline status
 */
export interface OfflineMutationResult<T> {
  success: boolean;
  data?: T;
  queued?: boolean;
  operationId?: string;
  message?: string;
}

/**
 * Check if mutation result was queued offline
 */
export function isOfflineResult<T>(result: any): result is OfflineMutationResult<T> & { queued: true } {
  return result && typeof result === 'object' && result.queued === true;
}