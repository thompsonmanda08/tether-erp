/**
 * Budget Types
 * Aligned with backend models and database schema
 */

// ============================================================================
// CORE BUDGET TYPES
// ============================================================================

export interface Budget {
  // Core fields
  id: string;
  organizationId: string;
  budgetCode: string;
  ownerId: string;
  owner?: any;
  ownerName: string;
  department: string;
  departmentId: string;
  status: BudgetStatus; // draft, pending, approved, rejected, completed, cancelled
  fiscalYear: string;
  totalBudget: number;
  allocatedAmount: number;
  remainingAmount: number;
  approvalStage: number;
  approvalHistory: any[];
  createdAt: Date;
  updatedAt: Date;

  // Business requirement fields
  name: string;
  description: string;
  currency: string;
  totalAmount: number; // Same as totalBudget
  createdBy: string;
  items: any[];

  // UI compatibility fields
  documentNumber?: string;
  currentStage?: number;
  actionHistory?: any[];
  metadata?: Record<string, any>;
  type?: string;
  createdByUser?: any;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CreateBudgetRequest {
  budgetCode?: string;
  name: string;
  description: string;
  department: string;
  departmentId: string;
  fiscalYear: string;
  totalBudget: number;
  allocatedAmount: number;
  currency: string;
  createdBy: string;
  items?: any[];
}

export interface UpdateBudgetRequest {
  budgetId: string;
  department?: string;
  totalBudget?: number;
  allocatedAmount?: number;
  name?: string;
  description?: string;
  currency?: string;
  items?: BudgetItem[];
}

export interface ApproveBudgetRequest {
  budgetId: string;
  approvingUserId: string;
  approvingUserRole: string;
  signature: string;
  comments?: string;
  stageNumber?: number; // For multi-stage approvals
}

export interface RejectBudgetRequest {
  budgetId: string;
  rejectingUserId: string;
  rejectingUserRole: string;
  remarks: string;
  signature: string;
  rejectionReason?: string; // Alias for remarks
  comments?: string; // Additional comments
}

export interface SubmitBudgetRequest {
  budgetId: string;
  workflowId: string; // REQUIRED - Workflow to use for approval
  submittedBy: string;
  submittedByRole: string;
  submittingUserId?: string; // Alias for submittedBy
  comments?: string;
}

export interface BudgetFilters {
  status?: BudgetStatus;
  department?: string;
  departmentId?: string; // Alias for department
  fiscalYear?: string;
  search?: string;
  searchTerm?: string; // Alias for search
  page?: number;
  limit?: number;
  userId?: string; // For user-specific filtering
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface BudgetStats {
  total: number;
  active: number;
  allocated: number;
  remaining: number;
  utilizationRate: number;
}

// ============================================================================
// TYPE ALIASES
// ============================================================================

export type BudgetStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";
