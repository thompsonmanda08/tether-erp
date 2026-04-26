"use client";

import {
  useApprovalTasks,
  useClaimTask,
  useApproveTask,
  useRejectTask,
} from "@/hooks/use-approval-workflow";
import { WorkflowActionButtons } from "@/components/workflows/workflow-action-buttons";
import { Loader2 } from "lucide-react";

interface ApprovalActionPanelProps {
  requisitionId: string;
  onApprovalComplete: () => void;
}

export function ApprovalActionPanel({
  requisitionId,
  onApprovalComplete,
}: ApprovalActionPanelProps) {
  // Fetch all pending tasks assigned to the current user
  const { data: approvalData, isLoading } = useApprovalTasks(
    { documentType: "REQUISITION" },
    1,
    100
  );

  const approvalTasks = approvalData?.data || [];

  // Find the task for this specific requisition
  const task = approvalTasks.find(
    (t) =>
      t.documentId === requisitionId ||
      t.entityId === requisitionId ||
      (t as any).requisitionId === requisitionId
  );

  const taskId = task?.id ?? "";

  const claimMutation = useClaimTask(taskId, onApprovalComplete);
  const approveMutation = useApproveTask(taskId, onApprovalComplete);
  const rejectMutation = useRejectTask(taskId, onApprovalComplete);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading approval task...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No pending approval task found for this requisition.
      </p>
    );
  }

  return (
    <WorkflowActionButtons
      task={task as any}
      variant="inline"
      showStatus={true}
      showViewButton={false}
      onClaim={async () => {
        await claimMutation.mutateAsync();
      }}
      onApprove={async (_taskId, data) => {
        await approveMutation.mutateAsync({
          comments: data?.comments ?? "",
          signature: data?.signature ?? "",
          stageNumber: (task as any).stage ?? (task as any).stageIndex ?? 1,
        });
      }}
      onReject={async (_taskId, data) => {
        await rejectMutation.mutateAsync({
          remarks: data?.comments ?? "",
          comments: data?.comments ?? "",
          signature: data?.signature,
        });
      }}
      onActionComplete={onApprovalComplete}
    />
  );
}
