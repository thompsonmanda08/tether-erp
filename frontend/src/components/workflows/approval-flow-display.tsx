"use client";

import { ApprovalRecord } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export interface ApprovalFlowDisplayProps {
  approvalHistory: ApprovalRecord[];
  currentStage: number;
  totalStages?: number;
  isCompleted?: boolean;
}

export function ApprovalFlowDisplay({
  approvalHistory,
  currentStage,
  totalStages = 0,
  isCompleted = false,
}: ApprovalFlowDisplayProps) {
  // Build stage information from approval history
  const stages = approvalHistory.map((entry, index) => ({
    stage: index + 1,
    approverName: entry.approverName,
    approverId: entry.approverId,
    status: entry.status?.toUpperCase(),
    approvedAt: entry.approvedAt || entry.actionTakenAt,
    comments: entry.comments || entry.remarks,
  })) || [];

  const getStageStatus = (stageIndex: number) => {
    if (isCompleted) return "completed";
    if (stageIndex < currentStage) return "completed";
    if (stageIndex === currentStage) return "current";
    return "pending";
  };

  const getStageApproval = (stageIndex: number) => {
    return stages[stageIndex];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case "current":
        return <Clock className="h-6 w-6 text-blue-600 animate-pulse" />;
      default:
        return <div className="h-6 w-6 rounded-full border-2 border-border" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "current":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  if (totalStages === 0 && stages.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
          <div>
            <h3 className="font-semibold">No Approval History</h3>
            <p className="text-sm text-muted-foreground">
              This document has not been submitted for approval yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Workflow Progress</CardTitle>
        <CardDescription>
          {isCompleted
            ? "Workflow completed successfully"
            : `Currently at stage ${currentStage + 1} of ${totalStages || stages.length}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timeline View */}
          <div className="relative">
            {stages.map((stageData: any, index: number) => {
              const status = getStageStatus(index);

              return (
                <div key={index}>
                  {/* Stage Card */}
                  <div className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {getStatusIcon(status)}
                      </div>

                      {/* Stage Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            Stage {index + 1}
                          </h3>
                          <Badge
                            variant={
                              status === "completed"
                                ? "secondary"
                                : status === "current"
                                ? "default"
                                : "outline"
                            }
                          >
                            {status === "completed"
                              ? "Completed"
                              : status === "current"
                              ? "Current"
                              : "Pending"}
                          </Badge>
                        </div>

                        {/* Approver Info */}
                        {stageData.approverName && (
                          <div className="mb-3">
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                              Approver
                            </h4>
                            <div className="flex items-center gap-2 bg-background px-2 py-1 rounded border text-sm">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback>
                                  {stageData.approverName?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{stageData.approverName}</span>
                            </div>
                          </div>
                        )}

                        {/* Approval Details */}
                        {(stageData.status || status === "completed") && (
                          <div className="space-y-2 pt-3 border-t">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                              Approval Details
                            </h4>
                            <div className="flex items-center justify-between bg-background px-2 py-2 rounded text-xs">
                              <div className="flex items-center gap-2">
                                {stageData.status === "APPROVED" && (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                )}
                                {stageData.status === "REJECTED" && (
                                  <AlertCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span className="font-medium">
                                  {stageData.approverName || "Pending"}
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {stageData.approvedAt
                                  ? new Date(stageData.approvedAt).toLocaleDateString()
                                  : "Awaiting"}
                              </span>
                            </div>
                            {stageData.comments && (
                              <div className="text-xs bg-muted rounded p-2 mt-2">
                                <p className="text-muted-foreground">{stageData.comments}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < stages.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ChevronRight className="h-6 w-6 text-muted-foreground transform rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Total Stages
                </h4>
                <p className="text-lg font-bold">{totalStages || stages.length}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Completed
                </h4>
                <p className="text-lg font-bold">{currentStage}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Remaining
                </h4>
                <p className="text-lg font-bold">
                  {(totalStages || stages.length) - currentStage - (isCompleted ? 1 : 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
