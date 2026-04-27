/**
 * Common/Shared Types
 * General utility types used across the application
 * Note: Core common types moved to core.ts to avoid duplication
 */

// ================== SPECIALIZED PAGINATION ==================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  page_size: number;           // Alias for limit
  totalCount: number;          // Alias for total
  total_pages: number;         // Alias for totalPages
  has_next: boolean;           // Alias for hasNext
  has_prev: boolean;           // Alias for hasPrev
}

// Legacy pagination interface for backward compatibility
export interface PaginationLegacy {
  page: number;
  page_size: number;
  total_pages: number;
  totalCount: number;
  has_next: boolean;
  has_prev: boolean;
}

// ================== OFFLINE OPERATIONS ==================

export type OfflineOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'MARK_PAID';
export type OfflineEntityType = 'requisition' | 'purchase-order' | 'payment-voucher' | 'grn' | 'budget' | 'vendor' | 'user' | 'organization';

export interface OfflineMutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
  queuedForSync?: boolean;
}

// ================== DASHBOARD METRICS ==================

export interface DashboardMetrics {
  totalDocuments: number;
  pendingApprovals: number;
  completedThisMonth: number;
  averageProcessingTime: number;
  budgetUtilization: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    user: string;
    documentNumber?: string;    // Document reference number
    action?: string;           // Action performed
  }>;
  approvalsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  documentsByType: {
    requisitions: number;
    purchaseOrders: number;
    paymentVouchers: number;
    budgets: number;
  };
  
  // Extended fields for UI compatibility (should be added to backend)
  averageApprovalTime?: number;        // Average time for approvals
  pendingApproval?: number;            // Alias for pendingApprovals
  approvedDocuments?: number;          // Number of approved documents
  documentsNeedingAction?: number;     // Documents requiring action
  draftDocuments?: number;             // Draft documents count
  submittedDocuments?: number;         // Submitted documents count
  rejectedDocuments?: number;          // Rejected documents count
  documentTypeBreakdown?: Record<string, number>; // Breakdown by document type
  statusBreakdown?: Record<string, number>;       // Breakdown by status
}