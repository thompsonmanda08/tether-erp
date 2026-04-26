"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Users,
  ArrowRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { WorkflowActionButtons } from "./workflow-action-buttons";
import { useApprovalWorkflow } from "@/hooks/use-approval-workflow";
import { formatDistanceToNow } from "date-fns";
import {
  canUserActOnWorkflowTask,
  formatRoleForDisplay,
} from "@/lib/workflow-utils";

interface WorkflowStatusCardProps {
  documentId: string;
  documentType: string;
  documentNumber?: string;
  currentUserId: string;
  currentUserRole: string;
  onActionComplete?: () => void;
}

export function WorkflowStatusCard({
  documentId,
  documentType,
  documentNumber,
  currentUserId,
  currentUserRole,
  onActionComplete,
}: WorkflowStatusCardProps) {
  const { task, isLoading, error } = useApprovalWorkflow(documentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Workflow Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Workflow Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              No active workflow for this document
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskStatus = task.status?.toUpperCase();
  const isPending = taskStatus === "PENDING";
  const isClaimedByMe =
    taskStatus === "CLAIMED" && task.claimedBy === currentUserId;
  const isClaimedByOther =
    taskStatus === "CLAIMED" && task.claimedBy !== currentUserId;
  const isCompleted = taskStatus === "COMPLETED";

  const getStatusIcon = () => {
    if (isPending) return <Clock className="h-4 w-4 text-amber-500" />;
    if (isClaimedByMe) return <User className="h-4 w-4 text-blue-500" />;
    if (isClaimedByOther) return <Users className="h-4 w-4 text-gray-500" />;
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (isPending) return "Pending Approval";
    if (isClaimedByMe) return "Claimed by You";
    if (isClaimedByOther)
      return `Claimed by ${task.claimerName || "Another User"}`;
    if (isCompleted) return "Workflow Completed";
    return "Unknown Status";
  };

  const getStatusColor = () => {
    if (isPending) return "amber";
    if (isClaimedByMe) return "blue";
    if (isClaimedByOther) return "gray";
    if (isCompleted) return "green";
    return "gray";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Workflow Status
          {documentNumber && (
            <span className="text-sm font-normal text-muted-foreground">
              - {documentType} #{documentNumber}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-foreground">{getStatusText()}</p>
              <p className="text-sm text-muted-foreground">
                Stage: {task.stageName} • Required Role:{" "}
                {formatRoleForDisplay(task.assignedRole, task.assignedRoleName)}
              </p>
            </div>
          </div>
          <Badge
            variant={
              getStatusColor() === "green"
                ? "success"
                : getStatusColor() === "blue"
                  ? "default"
                  : getStatusColor() === "amber"
                    ? "secondary"
                    : "destructive"
            }
          >
            {getStatusText()}
          </Badge>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{formatDistanceToNow(new Date(task.createdAt))} ago</span>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span
                className={
                  new Date(task.dueDate) < new Date()
                    ? "text-red-600 font-medium"
                    : ""
                }
              >
                {formatDistanceToNow(new Date(task.dueDate))}
                {new Date(task.dueDate) < new Date()
                  ? " overdue"
                  : " remaining"}
              </span>
            </div>
          )}

          {task.claimedAt && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Claimed:</span>
              <span>{formatDistanceToNow(new Date(task.claimedAt))} ago</span>
            </div>
          )}

          {task.claimExpiry && isClaimedByMe && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Expires:</span>
              <span className="text-amber-600 font-medium">
                {formatDistanceToNow(new Date(task.claimExpiry))} remaining
              </span>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {task.currentStage && task.totalStages && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                Stage {task.currentStage} of {task.totalStages}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(task.currentStage / task.totalStages) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {task && (
          <div className="border-t pt-4">
            <WorkflowActionButtons
              task={task}
              variant="inline"
              showStatus={false}
              onActionComplete={onActionComplete}
            />
          </div>
        )}

        {/* Additional Information */}
        {isClaimedByOther && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Users className="h-4 w-4" />
              <span className="font-medium">Task Currently Under Review</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {task.claimerName || "Another user"} is currently reviewing this
              document.
              {task.claimExpiry && (
                <>
                  {" "}
                  The claim will expire in{" "}
                  {formatDistanceToNow(new Date(task.claimExpiry))}.
                </>
              )}
            </p>
          </div>
        )}

        {isPending &&
          !canUserActOnWorkflowTask(
            { id: currentUserId, role: currentUserRole },
            task
          ) && (
          <div className="bg-blue-600 border border-blue-700 rounded-lg p-3 dark:bg-blue-50 dark:border-blue-200">
            <div className="flex items-center gap-2 text-white dark:text-blue-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Waiting for Approval</span>
            </div>
            <p className="text-sm text-blue-100 dark:text-blue-700 mt-1">
              This document requires approval from a user with the &quot;
              {formatRoleForDisplay(task.assignedRole, task.assignedRoleName)}
              &quot; role.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Workflow Completed</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              This document has successfully completed the approval workflow.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
