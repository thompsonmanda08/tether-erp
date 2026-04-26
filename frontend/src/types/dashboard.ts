/**
 * Dashboard types - used by dashboard components and server actions
 */

export interface DashboardMetrics {
  totalDocuments: number;
  draftDocuments: number;
  submittedDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  pendingApproval: number;
  documentsNeedingAction: number;
  averageApprovalTime: number;
  statusBreakdown: Record<string, number>;
  documentTypeBreakdown: Record<string, number>;
  recentActivity: Array<{
    id: string;
    type: string;
    documentNumber: string;
    action: string;
    timestamp: Date;
    user: string;
  }>;
}

export interface SignupSettings {
  allowSignups: boolean;
  requireEmailVerification: boolean;
  autoApproveUsers: boolean;
  defaultRole?: string;
}

export interface SignupAnalytics {
  totalSignups: number;
  recentSignups: number;
  pendingApprovals: number;
  rejectedCount: number;
}
