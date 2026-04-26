"use client";

import { useState } from "react";
import { ApprovalTask } from "@/types";
import {
  useApproveTask,
  useRejectTask,
  useReassignTask,
} from "@/hooks/use-approval-workflow";
import { NotificationActionModal } from "@/components";
import { ReassignmentModal } from "@/components/workflows/reassignment-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Repeat2,
  AlertCircle,
  Info,
} from "lucide-react";

export interface ApprovalActionPanelProps {
  task: any;
  onApprovalComplete?: () => void;
}

export function ApprovalActionPanel({
  task,
  onApprovalComplete,
}: ApprovalActionPanelProps) {
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "reject" | null
  >(null);

  const approveMutation = useApproveTask(task.id, onApprovalComplete);
  const rejectMutation = useRejectTask(task.id, onApprovalComplete);
  const reassignMutation = useReassignTask(task.id, onApprovalComplete);

  const isLoading =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    reassignMutation.isPending;

  const handleApproveClick = () => {
    setSelectedAction("approve");
    setApproveModalOpen(true);
  };

  const handleRejectClick = () => {
    setSelectedAction("reject");
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async (signature: string, remarks?: string) => {
    try {
      await approveMutation.mutateAsync({
        comments: remarks || "",
        signature,
        stageNumber: task.stage || 1,
      });
      setApproveModalOpen(false);
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const handleRejectSubmit = async (signature: string, reason?: string) => {
    try {
      await rejectMutation.mutateAsync({
        remarks: reason || "",
        comments: reason || "",
        signature,
      });
      setApproveModalOpen(false);
    } catch (error) {
      console.error("Rejection failed:", error);
    }
  };

  const handleReassignSubmit = async (userId: string, reason: string) => {
    try {
      await reassignMutation.mutateAsync({
        newApproverId: userId,
        reason,
      });
      setReassignModalOpen(false);
    } catch (error) {
      console.error("Reassignment failed:", error);
    }
  };

  // Create notification object for modal
  const notification = {
    id: task.id,
    title: `Approve Document`,
    message: `Document ${task.documentId} is pending your approval`,
    type: "TASK_ASSIGNED",
  } as any;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Action Required
          </CardTitle>
          <CardDescription>
            {task.documentType || "Document"} awaits your decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-200">
              Review the document details above, then approve, reject, or
              reassign this task.
            </AlertDescription>
          </Alert>

          {/* Task Details */}
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground">
                  Document
                </h4>
                <p className="font-mono">{task.documentType || "Document"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">
                  Approver
                </h4>
                <p>{task.approverName || "Unknown"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Stage</h4>
                <p>Stage {task.stage}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Created</h4>
                <p>
                  {new Date(task.createdAt || new Date()).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Priority Badge */}
          {task.priority && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Priority:
              </span>
              <Badge
                variant={
                  task.priority === "HIGH"
                    ? "destructive"
                    : task.priority === "MEDIUM"
                      ? "default"
                      : "secondary"
                }
              >
                {task.priority}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t">
            {/* Approve Button */}
            <Button
              onClick={handleApproveClick}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
              isLoading={approveMutation.isPending}
              loadingText="Approving..."
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>

            {/* Reject Button */}
            <Button
              onClick={handleRejectClick}
              disabled={isLoading}
              variant="destructive"
              size="lg"
              isLoading={rejectMutation.isPending}
              loadingText="Rejecting..."
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>

            {/* Reassign Button */}
            <Button
              onClick={() => setReassignModalOpen(true)}
              disabled={isLoading}
              variant="outline"
              size="lg"
              isLoading={reassignMutation.isPending}
              loadingText="Reassigning..."
            >
              <Repeat2 className="mr-2 h-4 w-4" />
              Reassign
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Approving requires your digital signature
          </p>
        </CardContent>
      </Card>

      {/* Notification Action Modal */}
      <NotificationActionModal
        open={approveModalOpen}
        onOpenChange={setApproveModalOpen}
        title={
          selectedAction === "reject" ? "Reject Request" : "Approve Request"
        }
        description={
          selectedAction === "reject"
            ? "Please provide a reason for rejection"
            : "Please provide your digital signature"
        }
        actionLabel={selectedAction === "reject" ? "Reject" : "Approve"}
        onAction={(comment) => {
          if (selectedAction === "reject") {
            handleRejectSubmit("", comment || "");
          } else {
            handleApproveSubmit("", comment);
          }
        }}
        requiresComment={selectedAction === "reject"}
        isLoading={isLoading}
      />

      {/* Reassignment Modal */}
      <ReassignmentModal
        task={task as any}
        isOpen={reassignModalOpen}
        onOpenChange={setReassignModalOpen}
        onReassign={handleReassignSubmit}
      />
    </>
  );
}
