import type {
  SystemStatistics,
  ApprovalMetrics,
  UserActivityMetrics,
  AnalyticsDashboard,
} from "@/types/reports";

/**
 * Export system statistics to CSV
 */
export function exportSystemStatsToCSV(stats: SystemStatistics): void {
  const csv = `System Statistics Report
Generated: ${new Date().toISOString()}

OVERVIEW METRICS
Total Documents,${stats.totalDocuments}
Approved Documents,${stats.approvedDocuments}
Rejected Documents,${stats.rejectedDocuments}
Draft Documents,${stats.draftDocuments}
Submitted Documents,${stats.submittedDocuments}
Pending Approval,${stats.pendingApproval}
Average Approval Time,${stats.averageApprovalTime.toFixed(2)} days
Approval Rate,${stats.approvalRate.toFixed(2)}%
Rejection Rate,${stats.rejectionRate.toFixed(2)}%

DOCUMENT TYPE BREAKDOWN
Requisitions,${stats.documentTypeBreakdown.requisitions}
Purchase Orders,${stats.documentTypeBreakdown.purchaseOrders}
Payment Vouchers,${stats.documentTypeBreakdown.paymentVouchers}
GRN,${stats.documentTypeBreakdown.grn}
Budgets,${stats.documentTypeBreakdown.budgets}

STATUS BREAKDOWN
Draft,${stats.statusBreakdown.draft}
Submitted,${stats.statusBreakdown.submitted}
In Review,${stats.statusBreakdown.inReview}
Approved,${stats.statusBreakdown.approved}
Rejected,${stats.statusBreakdown.rejected}
`;

  downloadCSV(
    csv,
    `system-stats-${new Date().toISOString().split("T")[0]}.csv`,
  );
}

/**
 * Export approval metrics to CSV
 */
export function exportApprovalMetricsToCSV(metrics: ApprovalMetrics): void {
  const header = "Document Number,Type,Status,Approver,Role,Date,Comments\n";
  const rows = metrics.recentApprovals
    .map(
      (approval) =>
        `"${approval.documentNumber}","${approval.documentType}","${approval.action}","${approval.approverName}","${approval.approverRole}","${new Date(approval.createdAt).toLocaleString()}","${approval.comments || ""}"`,
    )
    .join("\n");

  const csv = `Approval Metrics Report
Generated: ${new Date().toISOString()}

SUMMARY
Total Approved,${metrics.totalApproved}
Total Rejected,${metrics.totalRejected}
Total Pending,${metrics.totalPending}
Approval Rate,${metrics.approvalRate.toFixed(2)}%

RECENT APPROVALS
${header}${rows}
`;

  downloadCSV(
    csv,
    `approval-metrics-${new Date().toISOString().split("T")[0]}.csv`,
  );
}

/**
 * Export user activity to CSV
 */
export function exportUserActivityToCSV(activity: UserActivityMetrics): void {
  const header =
    "Name,Email,Role,Approvals,Rejections,Active Documents,Last Activity\n";
  const rows = activity.users
    .map(
      (user) =>
        `"${user.name}","${user.email}","${user.role}",${user.approvalCount},${user.rejectionCount},${user.activeDocuments},"${user.lastActivity ? new Date(user.lastActivity).toLocaleString() : "N/A"}"`,
    )
    .join("\n");

  const csv = `User Activity Report
Generated: ${new Date().toISOString()}

SUMMARY
Active Users,${activity.activeUsers}
Total Actions,${activity.totalActions}
Documents In Progress,${activity.documentsInProgress}

USER DETAILS
${header}${rows}
`;

  downloadCSV(
    csv,
    `user-activity-${new Date().toISOString().split("T")[0]}.csv`,
  );
}

/**
 * Export analytics dashboard to CSV
 */
export function exportAnalyticsDashboardToCSV(
  analytics: AnalyticsDashboard,
): void {
  const trendHeader = "Date,Approved,Rejected,Pending\n";
  const trendRows = analytics.approvalTrends
    .map(
      (trend) =>
        `"${trend.date}",${trend.approved},${trend.rejected},${trend.pending}`,
    )
    .join("\n");

  const stageHeader =
    "Stage,Avg Processing Time (days),Document Count,SLA Compliance (%)\n";
  const stageRows = analytics.stageMetrics
    .map(
      (stage) =>
        `"${stage.stageName}",${stage.avgProcessingTime.toFixed(2)},${stage.documentCount},${stage.slaCompliance.toFixed(2)}`,
    )
    .join("\n");

  const csv = `Analytics Dashboard Report
Generated: ${new Date().toISOString()}

KEY METRICS
Total Pending,${analytics.totalPending}
Total Approved,${analytics.totalApproved}
Total Rejected,${analytics.totalRejected}
Avg Approval Time,${analytics.avgApprovalTime.toFixed(2)} days
SLA Compliance,${analytics.slaCompliance.toFixed(2)}%

APPROVAL TRENDS (Last 7 Days)
${trendHeader}${trendRows}

STAGE PERFORMANCE
${stageHeader}${stageRows}

BOTTLENECK ANALYSIS
${
  analytics.bottleneck
    ? `Stage: ${analytics.bottleneck.stageName}
Avg Days: ${analytics.bottleneck.avgDays.toFixed(2)}
Document Count: ${analytics.bottleneck.documentCount}`
    : "No bottleneck detected"
}
`;

  downloadCSV(
    csv,
    `analytics-dashboard-${new Date().toISOString().split("T")[0]}.csv`,
  );
}

/**
 * Helper function to download CSV content
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
