export interface SystemStatistics {
  totalDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  draftDocuments: number;
  submittedDocuments: number;
  pendingApproval: number;
  averageApprovalTime: number;
  approvalRate: number;
  rejectionRate: number;
  documentTypeBreakdown: DocumentTypeBreakdown;
  statusBreakdown: StatusBreakdown;
}

export interface DocumentTypeBreakdown {
  requisitions: number;
  purchaseOrders: number;
  paymentVouchers: number;
  grn: number;
  budgets: number;
}

export interface StatusBreakdown {
  draft: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
}

export interface ApprovalMetrics {
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number;
  recentApprovals: ApprovalActivity[];
}

export interface ApprovalActivity {
  id: string;
  documentId: string;
  documentNumber: string;
  documentType:
    | "requisition"
    | "purchase_order"
    | "payment_voucher"
    | "grn"
    | "budget"
    | "REQUISITION"
    | "PURCHASE_ORDER"
    | "PAYMENT_VOUCHER"
    | "GRN"
    | "BUDGET";
  action: "approved" | "rejected";
  approverName: string;
  approverRole: string;
  comments?: string;
  createdAt: string;
}

export interface UserActivityMetrics {
  activeUsers: number;
  totalActions: number;
  documentsInProgress: number;
  users: UserActivity[];
}

export interface UserActivity {
  id: string;
  name: string;
  email: string;
  role: string;
  approvalCount: number;
  rejectionCount: number;
  activeDocuments: number;
  lastActivity?: string;
}

export interface AnalyticsDashboard {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgApprovalTime: number;
  slaCompliance: number;
  approvalTrends: ApprovalTrend[];
  documentDistribution: DocumentDistribution[];
  stageMetrics: StageMetric[];
  bottleneck?: BottleneckInfo;
}

export interface ApprovalTrend {
  date: string;
  approved: number;
  rejected: number;
  pending: number;
}

export interface DocumentDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface StageMetric {
  stageName: string;
  avgProcessingTime: number;
  documentCount: number;
  slaCompliance: number;
}

export interface BottleneckInfo {
  stageName: string;
  avgDays: number;
  documentCount: number;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}
