"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Send,
  AlertCircle,
  User,
} from "lucide-react";
import { ActionHistoryEntry, ApprovalRecord } from "@/types";
import { WorkflowDocument } from "@/types/workflow";
import { useApprovalPanelData } from "@/hooks/use-approval-history";
import { formatRoleForDisplay } from "@/lib/workflow-utils";

interface BudgetApprovalPanelProps {
  budgetId: string;
  budget: WorkflowDocument;
  userRole: string;
  actionHistory?: ActionHistoryEntry[];
  approvalChain?: ApprovalRecord[];
}

export function BudgetApprovalPanel({
  budgetId,
  budget,
  userRole,
  actionHistory,
  approvalChain,
}: BudgetApprovalPanelProps) {
  const {
    approvalHistory,
    availableApprovers,
    workflowStatus,
    isLoading,
    hasError,
    refetchAll,
  } = useApprovalPanelData(budgetId, "BUDGET");

  const getActionIcon = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case "APPROVE":
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "REJECT":
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "CREATE":
        return <Plus className="h-5 w-5 text-blue-600" />;
      case "UPDATE":
        return <Edit className="h-5 w-5 text-amber-600" />;
      case "SUBMIT":
        return <Send className="h-5 w-5 text-purple-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case "APPROVE":
      case "APPROVED":
        return "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700";
      case "REJECT":
      case "REJECTED":
        return "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700";
      case "CREATE":
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700";
      case "UPDATE":
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700";
      case "SUBMIT":
        return "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700";
      default:
        return "bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600";
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case "APPROVE":
      case "APPROVED":
        return "Approved";
      case "REJECT":
      case "REJECTED":
        return "Rejected";
      case "CREATE":
        return "Created";
      case "UPDATE":
        return "Updated";
      case "SUBMIT":
        return "Submitted";
      default:
        return actionType;
    }
  };

  // Combine and sort all history entries
  const sortedHistory = [...(actionHistory || [])].sort(
    (a, b) =>
      new Date(b.performedAt || b.timestamp || 0).getTime() -
      new Date(a.performedAt || a.timestamp || 0).getTime(),
  );

  // Combine approval history from both sources
  const combinedApprovalHistory = [
    ...(approvalHistory || []),
    ...(approvalChain || []),
  ].filter(
    (item, index, self) =>
      index ===
      self.findIndex(
        (t) =>
          (t.approverId &&
            item.approverId &&
            t.approverId === item.approverId) ||
          (t.stageNumber &&
            item.stageNumber &&
            t.stageNumber === item.stageNumber),
      ),
  );

  if (hasError && !actionHistory?.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Failed to load approval data</p>
          <button
            onClick={refetchAll}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">
            Timeline
            {sortedHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {sortedHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chain">
            Approval Chain
            {combinedApprovalHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {combinedApprovalHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab - All Actions Chronologically */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          {sortedHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedHistory.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border-2 ${getActionColor(action.actionType || "unknown")}`}
                >
                  <div className="flex items-start gap-3">
                    {getActionIcon(action.actionType || "unknown")}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {action.performedByName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getActionLabel(action.actionType || "unknown")}
                        </Badge>
                        {action.performedByRole && (
                          <Badge variant="secondary" className="text-xs">
                            {action.performedByRole}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(
                          action.performedAt || action.timestamp || 0,
                        ).toLocaleString()}
                      </p>

                      {/* Status transition */}
                      {action.previousStatus && action.newStatus && (
                        <div className="text-xs mt-2 text-gray-700 dark:text-gray-300">
                          Status:{" "}
                          <span className="font-mono">
                            {action.previousStatus}
                          </span>{" "}
                          →{" "}
                          <span className="font-mono">{action.newStatus}</span>
                        </div>
                      )}

                      {/* Stage info for approval actions */}
                      {action.stageNumber && action.stageName && (
                        <div className="text-xs mt-2 text-gray-700 dark:text-gray-300">
                          Stage {action.stageNumber}:{" "}
                          <span className="font-semibold">
                            {action.stageName}
                          </span>
                        </div>
                      )}

                      {/* Comments */}
                      {action.comments && (
                        <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 italic">
                          "{action.comments}"
                        </p>
                      )}

                      {/* Remarks (for rejections) */}
                      {action.remarks && (
                        <p className="text-sm mt-2 text-red-700 dark:text-red-400 font-semibold">
                          Reason: "{action.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Actions will appear here as the budget progresses
              </p>
            </div>
          )}
        </TabsContent>

        {/* Approval Chain Tab - Enhanced Workflow Stage Tracker */}
        <TabsContent value="chain" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {/* Workflow header skeleton */}
              <div className="p-3 rounded-lg border space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-72 bg-muted rounded animate-pulse" />
                <div className="flex items-center gap-4 mt-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                </div>
              </div>
              {/* Stage cards skeleton */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border-2 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-muted rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
                      </div>
                      <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-6 bg-muted rounded-full animate-pulse shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Check if document is in draft status */}
              {budget.status?.toUpperCase() === "DRAFT" || budget.status?.toUpperCase() === "REJECTED" ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-semibold text-lg mb-2">
                    Workflow Not Started
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    The approval workflow will begin once this budget is
                    submitted for approval.
                  </p>
                  <p className="text-xs text-gray-500">
                    Click "Submit for Approval" to start the workflow process.
                  </p>
                </div>
              ) : workflowStatus?.status === "no_workflow" ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-semibold text-lg mb-2">
                    No Workflow Configured
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    No approval workflow has been configured for budgets.
                  </p>
                  <p className="text-xs text-gray-500">
                    Contact your administrator to set up approval workflows.
                  </p>
                </div>
              ) : (
                <>
                  {/* Workflow Progress Header */}
                  <div className="text-xs mb-4 p-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Workflow Progress Tracker
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Track each approval stage and see who has approved or is
                      required to approve
                    </p>
                    {workflowStatus && (
                      <div className="mt-2 flex items-center gap-4">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">
                          Stage {workflowStatus.currentStage} of{" "}
                          {workflowStatus.totalStages}
                        </span>
                        <Badge
                          variant={
                            workflowStatus.status?.toUpperCase() === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {workflowStatus.status?.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Workflow Stage Progress */}
                  {workflowStatus?.stageProgress &&
                  workflowStatus.stageProgress.length > 0 ? (
                    <div className="space-y-3">
                      {workflowStatus.stageProgress.map((stage, index) => (
                        <div
                          key={stage.stageNumber || index}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            stage.status?.toUpperCase() === "APPROVED"
                              ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 shadow-sm"
                              : stage.status?.toUpperCase() === "REJECTED"
                                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 shadow-sm"
                                : stage.isCurrentStage
                                  ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-200 dark:ring-blue-800"
                                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Stage Number Circle */}
                            <div className="shrink-0">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                  stage.status?.toUpperCase() === "APPROVED"
                                    ? "bg-green-600 text-white"
                                    : stage.status?.toUpperCase() === "REJECTED"
                                      ? "bg-red-600 text-white"
                                      : stage.isCurrentStage
                                        ? "bg-blue-600 text-white ring-2 ring-blue-300"
                                        : "bg-gray-300 text-gray-600"
                                }`}
                              >
                                {stage.stageNumber || index + 1}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Stage Header */}
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="font-semibold capitalize text-base text-gray-900 dark:text-gray-100">
                                  {stage.stageName ||
                                    `Stage ${stage.stageNumber || index + 1}`}
                                </span>
                                <Badge
                                  variant={
                                    stage.status?.toUpperCase() === "APPROVED"
                                      ? "default"
                                      : stage.status?.toUpperCase() === "REJECTED"
                                        ? "destructive"
                                        : stage.isCurrentStage
                                          ? "secondary"
                                          : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {stage.status?.toUpperCase() === "APPROVED"
                                    ? "APPROVED"
                                    : stage.status?.toUpperCase() === "REJECTED"
                                      ? "REJECTED"
                                      : stage.isCurrentStage
                                        ? "CURRENT STAGE"
                                        : "PENDING"}
                                </Badge>
                                {stage.isCurrentStage &&
                                  stage.status?.toUpperCase() !== "APPROVED" &&
                                  stage.status?.toUpperCase() !== "REJECTED" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                    >
                                      ⏳ Awaiting Action
                                    </Badge>
                                  )}
                              </div>

                              {/* Required Role */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    <span className="font-medium">
                                      Required Role:
                                    </span>
                                    <span className="ml-1 px-2 py-1 capitalize font-medium bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                                      {formatRoleForDisplay(stage.requiredRole, stage.requiredRoleName)}
                                    </span>
                                  </p>
                                </div>

                                {/* Approver Info */}
                                {(stage.approverName || stage.approverId) && (
                                  <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                      <span className="font-medium">
                                        Approved By:
                                      </span>
                                      <span className="ml-1 text-green-700 dark:text-green-400 font-semibold">
                                        {stage.approverName || "Unknown User"}
                                      </span>
                                      {stage.approverRole && (
                                        <span className="text-gray-500 dark:text-gray-400 font-medium capitalize ml-1">
                                          ({stage.approverRole})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Completion Date */}
                              {stage.completedAt && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  <span className="font-medium">
                                    Completed:
                                  </span>
                                  <span className="ml-1">
                                    {new Date(
                                      stage.completedAt,
                                    ).toLocaleString()}
                                  </span>
                                </p>
                              )}

                              {/* Comments */}
                              {stage.comments && (
                                <div className="mt-2 p-3 bg-white/70 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">
                                      Comments:
                                    </span>
                                    <span className="ml-1 italic">
                                      "{stage.comments}"
                                    </span>
                                  </p>
                                </div>
                              )}

                              {/* Current Stage Instructions */}
                              {stage.isCurrentStage &&
                                stage.status?.toUpperCase() !== "APPROVED" &&
                                stage.status?.toUpperCase() !== "REJECTED" &&
                                stage.status?.toUpperCase() === "PENDING" && (
                                  <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                      <span className="font-medium">
                                        ⚡ Next Action Required:
                                      </span>
                                      <span className="ml-1">
                                        This stage requires approval from a user
                                        with the{" "}
                                        <strong>{formatRoleForDisplay(stage.requiredRole, stage.requiredRoleName)}</strong>{" "}
                                        role.
                                      </span>
                                    </p>
                                  </div>
                                )}
                            </div>

                            {/* Status Icon */}
                            <div className="shrink-0">
                              {stage.status?.toUpperCase() === "APPROVED" ? (
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                              ) : stage.status?.toUpperCase() === "REJECTED" ? (
                                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                              ) : stage.isCurrentStage ? (
                                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                              ) : (
                                <Clock className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No approval chain configured</p>
                      <p className="text-xs text-gray-400 mt-1">
                        The approval workflow will appear here once configured
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
