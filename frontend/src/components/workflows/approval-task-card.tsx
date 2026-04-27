"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Timer,
} from "lucide-react";
import { formatDistanceToNow, isAfter } from "date-fns";
import { useApprovalWorkflow } from "@/hooks/use-approval-workflow";
import {
  canUserActOnWorkflowTask,
  formatRoleForDisplay,
} from "@/lib/workflow-utils";
import { ClaimTaskModal } from "./claim-task-modal";
import { ApprovalActionModal } from "./approval-action-modal";
import { toast } from "sonner";

interface ApprovalTaskCardProps {
  taskId: string;
  currentUserId: string;
  currentUserRole: string;
}

export function ApprovalTaskCard({
  taskId,
  currentUserId,
  currentUserRole,
}: ApprovalTaskCardProps) {
  const {
    task,
    isLoading,
    error,
    claim,
    unclaim,
    approve,
    reject,
    isClaiming,
    isUnclaiming,
    isApproving,
    isRejecting,
    isProcessing,
  } = useApprovalWorkflow(taskId);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Update time remaining every minute
  useEffect(() => {
    if (task?.claimExpiry) {
      const updateTimer = () => {
        const remaining =
          new Date(task.claimExpiry).getTime() - new Date().getTime();
        setTimeRemaining(Math.max(0, remaining));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [task?.claimExpiry]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
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
      <Card className="w-full border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load task details</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Task state calculations
  const taskStatus = task.status?.toUpperCase();
  const isPending = taskStatus === "PENDING";
  const isClaimedByMe =
    taskStatus === "CLAIMED" && task.claimedBy === currentUserId;
  const isClaimedByOther =
    taskStatus === "CLAIMED" && task.claimedBy !== currentUserId;
  const isCompleted = taskStatus === "COMPLETED";

  const canUserClaim = canUserActOnWorkflowTask(
    { id: currentUserId, role: currentUserRole as any },
    task
  );

  const isClaimExpired =
    task.claimExpiry && isAfter(new Date(), new Date(task.claimExpiry));
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));

  // Handle claim action
  const handleClaim = async () => {
    try {
      await claim();
      setShowClaimModal(false);
      toast.success(
        "Task claimed successfully! You can now approve or reject it.",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to claim task");
    }
  };

  // Handle unclaim action
  const handleUnclaim = async () => {
    try {
      await unclaim();
      toast.success(
        "Task unclaimed successfully. Other users can now claim it.",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to unclaim task");
    }
  };

  // Handle approval/rejection
  const handleApprovalAction = async (data: {
    comments: string;
    signature: string;
  }) => {
    try {
      if (approvalAction === "approve") {
        await approve({
          ...data,
          expectedVersion: task.version,
        });
        toast.success("Task approved successfully!");
      } else {
        await reject({
          remarks: data.comments,
          signature: data.signature,
          expectedVersion: task.version,
        });
        toast.success("Task rejected successfully!");
      }
      setShowApprovalModal(false);
    } catch (error: any) {
      if (
        error.message.includes("version") ||
        error.message.includes("modified by another user")
      ) {
        toast.error(
          "Task was modified by another user. Please refresh and try again.",
        );
      } else {
        toast.error(error.message || `Failed to ${approvalAction} task`);
      }
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isPending) {
      return <Badge variant="secondary">Available</Badge>;
    }
    if (isClaimedByMe) {
      return (
        <Badge variant="default" className="bg-blue-600">
          Claimed by You
        </Badge>
      );
    }
    if (isClaimedByOther) {
      return (
        <Badge variant="destructive">
          Claimed by {task.claimerName || "Another User"}
        </Badge>
      );
    }
    if (isCompleted) {
      return <Badge variant="success">Completed</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  return (
    <>
      <Card
        className={`w-full transition-all duration-200 ${
          isClaimedByMe
            ? "border-blue-600 bg-blue-600/10 dark:border-blue-200 dark:bg-blue-50/30"
            : isClaimedByOther
              ? "border-border bg-muted/50"
              : "border-border hover:border-border/80"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {task.entityType} #{task.entityId}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{task.stageName}</p>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Required Role:</span>
              <span className="font-medium">
                {formatRoleForDisplay(task.assignedRole, task.assignedRoleName)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDistanceToNow(new Date(task.createdAt))} ago</span>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span
                  className={
                    isAfter(new Date(), new Date(task.dueDate))
                      ? "text-red-600 font-medium"
                      : ""
                  }
                >
                  {formatDistanceToNow(new Date(task.dueDate))}{" "}
                  {isAfter(new Date(), new Date(task.dueDate))
                    ? "overdue"
                    : "remaining"}
                </span>
              </div>
            )}

            {isClaimedByMe && task.claimExpiry && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Claim expires:</span>
                <span
                  className={
                    minutesRemaining < 10
                      ? "text-red-600 font-medium"
                      : "text-amber-600"
                  }
                >
                  {minutesRemaining} min remaining
                </span>
              </div>
            )}
          </div>

          {/* Claim Status Information */}
          {isClaimedByOther && (
            <div className="bg-muted/50 p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Currently being reviewed by{" "}
                  {task.claimerName || "another user"}
                </span>
              </div>
              {task.claimExpiry && (
                <p className="text-sm text-muted-foreground mt-1">
                  Claim expires in{" "}
                  {Math.floor(
                    (new Date(task.claimExpiry).getTime() -
                      new Date().getTime()) /
                      (1000 * 60),
                  )}{" "}
                  minutes
                </p>
              )}
            </div>
          )}

          {isClaimedByMe && (
            <div className="bg-blue-600 p-3 rounded-lg border border-blue-700 dark:bg-blue-50 dark:border-blue-200">
              <div className="flex items-center gap-2 text-white dark:text-blue-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">You have claimed this task</span>
              </div>
              <p className="text-sm text-blue-100 dark:text-blue-600 mt-1">
                Please review and take action within {minutesRemaining} minutes,
                or unclaim to allow others to work on it.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Claim Button */}
            {isPending && canUserClaim && (
              <Button
                onClick={() => setShowClaimModal(true)}
                disabled={isClaiming || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isClaiming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Claim Task
                  </>
                )}
              </Button>
            )}

            {/* Approve/Reject Buttons */}
            {isClaimedByMe && !isClaimExpired && (
              <>
                <Button
                  onClick={() => {
                    setApprovalAction("approve");
                    setShowApprovalModal(true);
                  }}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setApprovalAction("reject");
                    setShowApprovalModal(true);
                  }}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRejecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleUnclaim}
                  disabled={isProcessing}
                >
                  {isUnclaiming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                      Unclaiming...
                    </>
                  ) : (
                    "Unclaim"
                  )}
                </Button>
              </>
            )}

            {/* Permission Message */}
            {isPending && !canUserClaim && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {task.assignedUserId
                  ? "This task has been assigned to a specific user."
                  : `This task requires the "${formatRoleForDisplay(task.assignedRole, task.assignedRoleName)}" role or an admin/approver role to claim.`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ClaimTaskModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onConfirm={handleClaim}
        isLoading={isClaiming}
        taskDetails={{
          entityType: task.entityType,
          entityId: task.entityId,
          stageName: task.stageName,
          assignedRole: formatRoleForDisplay(task.assignedRole, task.assignedRoleName),
        }}
      />

      <ApprovalActionModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onConfirm={handleApprovalAction}
        isLoading={isApproving || isRejecting}
        action={approvalAction}
        taskDetails={{
          entityType: task.entityType,
          entityId: task.entityId,
          stageName: task.stageName,
          claimedBy: "You",
          claimExpiry: task.claimExpiry || "",
        }}
      />
    </>
  );
}
