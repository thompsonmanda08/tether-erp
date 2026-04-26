/**
 * Tasks Types
 * Pending workflow actions and tasks assigned to users
 */

export type TaskType =
  | "REQUISITION_APPROVAL"
  | "PURCHASE_ORDER_APPROVAL"
  | "PAYMENT_VOUCHER_APPROVAL"
  | "GOODS_RECEIVED_NOTE_CONFIRMATION"
  | "BUDGET_APPROVAL";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CLAIMED";

export interface Task {
  id: string;
  taskType: TaskType;
  documentId: string;
  documentNumber: string;
  documentType: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedRole: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  dueDate: Date;
  completedAt?: Date;
  completedBy?: string;
  metadata: {
    documentData?: Record<string, any>; // Amount, vendor name, etc.
    currentApprovalStage?: number;
    totalApprovalStages?: number;
    approvalStageName?: string;
    relatedDocumentNumber?: string; // e.g., PO number for GRN
  };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: TaskType;
  assignedRole?: string;
  dueDate?: {
    start?: string;
    end?: string;
  };
}

export interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
}

export interface TaskWithDocument extends Task {
  documentDetails: {
    amount?: number;
    vendor?: string;
    department?: string;
    description?: string;
  };
}

/**
 * ApprovalTask - Task data for approval workflows
 * Used in approval pages and action panels
 */
export interface ApprovalTask {
  id: string;
  entityId: string;
  entityType: "REQUISITION" | "BUDGET" | "PURCHASE_ORDER" | "PAYMENT_VOUCHER";
  entityNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  stageName: string;
  stageIndex: number;
  importance: "HIGH" | "MEDIUM" | "LOW";
  approverName?: string;
  approverUserId?: string;
  createdAt: Date;
  actionDate?: Date;
  dueDate?: Date;
  workflowId?: string;
  workflowName?: string;
}

/**
 * ApprovalTaskDetail - Full approval task with related data
 * Returned from approval detail endpoints
 */
export interface ApprovalTaskDetail {
  task: ApprovalTask;
  workflow?: {
    id: string;
    name: string;
    totalStages: number;
    stages: Array<{
      stageNumber: number;
      name: string;
      description?: string;
    }>;
  };
  entity?: Record<string, any>; // The actual requisition/budget data
  relatedApprovals?: ApprovalTask[]; // Other approvals in the same workflow
}
