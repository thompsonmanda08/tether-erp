"use client";

import { useState, useMemo, memo } from "react";
import {
  CheckCircle2,
  X,
  UserCheck,
  Clock,
  MoreHorizontal,
  Users,
  XCircle,
  User,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/use-session";
import {
  canUserActOnWorkflowTask,
  formatRoleForDisplay,
} from "@/lib/workflow-utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ReassignmentModal } from "./reassignment-modal";
import { ClaimTaskModal } from "./claim-task-modal";
import { ApprovalActionModal } from "./approval-action-modal";

// Define WorkflowTask interface locally since it's not exported from types
interface WorkflowTask {
  id: string;
  status: string;
  claimedBy?: string;
  assignedRole?: string;
  assignedRoleName?: string;
  assignedUserId?: string;
  stageName?: string;
  stageNumber?: number;
  claimExpiry?: string;
  entityType?: string;
  entityId?: string;
  documentType?: string;
  documentId?: string;
}

interface WorkflowActionButtonsProps {
  task: WorkflowTask;
  onClaim?: (taskId: string) => Promise<void>;
  onApprove?: (
    taskId: string,
    data?: { signature: string; comments: string }
  ) => Promise<void>;
  onReject?: (
    taskId: string,
    data?: {
      signature: string;
      comments: string;
      rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
    }
  ) => Promise<void>;
  onReassign?: (
    taskId: string,
    newUserId: string,
    reason: string
  ) => Promise<void>;
  onRefresh?: () => void;
  variant?: "table" | "detail" | "dropdown" | "inline" | "compact"; // Enhanced variants
  showViewButton?: boolean;
  showStatus?: boolean;
  onView?: (task: WorkflowTask) => void;
  onActionComplete?: () => void;
}

const StatusBadge = memo(
  ({ task, user }: { task: WorkflowTask; user: any }) => {
    const taskStatus = task.status?.toUpperCase();
    const isPending = taskStatus === "PENDING" || taskStatus === "CLAIMED";
    const isClaimedByUser = task.claimedBy === user?.id;
    const isClaimedByOther = task.claimedBy && task.claimedBy !== user?.id;
    const isCompleted = taskStatus === "COMPLETED" || taskStatus === "APPROVED";

    if (isPending && !task.claimedBy) {
      return (
        <Badge variant="secondary" className="text-xs">
          Pending Approval
        </Badge>
      );
    }
    if (isClaimedByUser) {
      return (
        <Badge variant="default" className="text-xs bg-blue-600">
          Claimed by You
        </Badge>
      );
    }
    if (isClaimedByOther) {
      return (
        <Badge variant="destructive" className="text-xs">
          Claimed by Other
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Unknown
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

export const WorkflowActionButtons = memo(function WorkflowActionButtons({
  task,
  onClaim,
  onApprove,
  onReject,
  onReassign,
  onRefresh,
  variant = "table",
  showViewButton = true,
  showStatus = false,
  onView,
  onActionComplete,
}: WorkflowActionButtonsProps) {
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve"
  );

  const isAdmin = user?.role === "admin";

  const canUserClaimTask = useMemo(
    () => canUserActOnWorkflowTask(user, task),
    [user, task]
  );

  const isTaskClaimedByUser = useMemo(() => {
    if (!user) return false;
    return task.claimedBy === user.id;
  }, [user, task.claimedBy]);

  const isTaskClaimed = useMemo(() => {
    return (
      task.claimedBy !== null &&
      task.claimedBy !== undefined &&
      task.claimedBy !== ""
    );
  }, [task.claimedBy]);

  const canUserApproveReject = useMemo(() => {
    if (!user) return false;
    return isTaskClaimedByUser;
  }, [user, isTaskClaimedByUser]);

  const isPending = task.status?.toUpperCase() === "PENDING" || task.status?.toUpperCase() === "CLAIMED";
  const canClaim = canUserClaimTask && !isTaskClaimed;
  const canApproveReject = canUserApproveReject;

  const handleAction = async (
    action: string,
    handler?: (taskId: string) => Promise<void>
  ) => {
    if (!handler) return;

    if (action === "claim") {
      setShowClaimModal(true);
      return;
    }

    if (action === "approve" || action === "reject") {
      setApprovalAction(action as "approve" | "reject");
      setShowApprovalModal(true);
      return;
    }

    setIsLoading(action);
    try {
      await handler(task.id);
      toast.success(`Task ${action}d successfully`);
      if (onRefresh) await onRefresh();
      onActionComplete?.();
    } catch (error) {
      toast.error(`Failed to ${action} task`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleClaimConfirm = async () => {
    if (!onClaim) return;
    setIsLoading("claim");
    try {
      await onClaim(task.id);
      toast.success("Task claimed successfully");
      setShowClaimModal(false);
      if (onRefresh) await onRefresh();
      onActionComplete?.();
    } catch (error) {
      toast.error("Failed to claim task");
    } finally {
      setIsLoading(null);
    }
  };

  const handleApprovalConfirm = async (data: {
    comments: string;
    signature: string;
    rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
  }) => {
    const handler = approvalAction === "approve" ? onApprove : onReject;
    if (!handler) return;
    setIsLoading(approvalAction);
    try {
      await handler(task.id, data);
      const successMsg =
        data.rejectionType === "return_to_previous_stage"
          ? "Document returned to previous stage"
          : data.rejectionType === "return_to_draft"
            ? "Document returned to draft"
            : `Task ${approvalAction}d successfully`;
      toast.success(successMsg);
      setShowApprovalModal(false);
      if (onRefresh) await onRefresh();
      onActionComplete?.();
    } catch (error) {
      toast.error(`Failed to ${approvalAction} task`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleReassignment = async (newUserId: string, reason: string) => {
    if (!onReassign) return;
    setIsLoading("reassign");
    try {
      await onReassign(task.id, newUserId, reason);
      toast.success("Task reassigned successfully");
      setShowReassignModal(false);
      if (onRefresh) onRefresh();
      onActionComplete?.();
    } catch (error) {
      toast.error("Failed to reassign task");
      throw error;
    } finally {
      setIsLoading(null);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(task);
      return;
    }
    const docType = (task.entityType || task.documentType || "").toLowerCase();
    const docId = task.entityId || task.documentId;
    const routes: Record<string, string> = {
      requisition: `/requisitions/${docId}`,
      purchase_order: `/purchase-orders/${docId}`,
      payment_voucher: `/payment-vouchers/${docId}`,
      goods_received_note: `/grn/${docId}`,
      budget: `/budgets/${docId}`,
    };
    const url = routes[docType || ""] || `/tasks/${task.id}`;
    window.location.href = url;
  };

  // Shared modals — must be included in every variant's return
  const sharedModals = (
    <>
      {showReassignModal && (
        <ReassignmentModal
          task={task as any}
          isOpen={showReassignModal}
          onOpenChange={setShowReassignModal}
          onReassign={handleReassignment}
        />
      )}
      {showClaimModal && (
        <ClaimTaskModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          onConfirm={handleClaimConfirm}
          isLoading={isLoading === "claim"}
          taskDetails={{
            entityType: task.entityType || task.documentType || "Task",
            entityId: (task as any).entityNumber || (task as any).documentNumber || task.entityId || task.documentId || task.id,
            stageName: task.stageName || "Approval",
            assignedRole: formatRoleForDisplay(task.assignedRole, task.assignedRoleName) || "Approver",
          }}
        />
      )}
      {showApprovalModal && (
        <ApprovalActionModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onConfirm={handleApprovalConfirm}
          isLoading={isLoading === approvalAction}
          action={approvalAction}
          taskDetails={{
            entityType: task.entityType || task.documentType || "Task",
            entityId: (task as any).entityNumber || (task as any).documentNumber || task.entityId || task.documentId || task.id,
            stageName: task.stageName || "Approval",
            stageNumber: task.stageNumber,
            claimedBy: user?.name || "You",
            claimExpiry:
              task.claimExpiry ||
              new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          }}
        />
      )}
    </>
  );

  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-2">
          {showStatus && <StatusBadge task={task} user={user} />}
          {isPending && canClaim && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("claim", onClaim)}
              disabled={isLoading === "claim"}
              title="Claim task"
              className="h-7 px-2 text-xs gap-1"
            >
              <Users className="h-3 w-3" />
              Claim
            </Button>
          )}
          {isTaskClaimed && canApproveReject && (
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => handleAction("approve", onApprove)}
                disabled={!!isLoading}
                title="Approve"
                className="h-7 w-7 sm:w-auto p-0 sm:px-2 sm:gap-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Approve</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction("reject", onReject)}
                disabled={!!isLoading}
                title="Reject"
                className="h-7 w-7 sm:w-auto p-0 sm:px-2 sm:gap-1 bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Reject</span>
              </Button>
            </div>
          )}
        </div>
        {sharedModals}
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Workflow Status:</span>
            </div>
            <StatusBadge task={task} user={user} />
          </div>
          {task.claimExpiry && isTaskClaimedByUser && (
            <div className="text-sm text-muted-foreground">
              Expires: {formatDistanceToNow(new Date(task.claimExpiry))}{" "}
              remaining
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {isPending && !isTaskClaimed && canClaim && (
            <Button
              onClick={() => handleAction("claim", onClaim)}
              disabled={isLoading === "claim"}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Claim for Review
            </Button>
          )}
          {isTaskClaimed && canApproveReject && (
            <>
              <Button
                onClick={() => handleAction("approve", onApprove)}
                disabled={!!isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction("reject", onReject)}
                disabled={!!isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {isTaskClaimed && !isTaskClaimedByUser && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-2 rounded">
              <User className="h-4 w-4" />
              <span className="text-sm">
                Currently being reviewed by another user
              </span>
            </div>
          )}
          {isPending && !canClaim && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Requires &quot;{formatRoleForDisplay(task.assignedRole, task.assignedRoleName)}&quot; role to approve
              </span>
            </div>
          )}
        </div>
      </div>
      {sharedModals}
    </>
    );
  }

  if (variant === "dropdown") {
    return (
      <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium text-foreground border-b">
            Workflow Status
          </div>
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current:</span>
            <StatusBadge task={task} user={user} />
          </div>
          {task.stageName && (
            <div className="px-2 py-1.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stage:</span>
              <span className="text-sm font-medium">{task.stageName}</span>
            </div>
          )}
          <DropdownMenuSeparator />
          {isPending && canClaim && !isTaskClaimed && (
            <DropdownMenuItem onClick={() => handleAction("claim", onClaim)}>
              <Users className="mr-2 h-4 w-4" />
              <span>Claim Task</span>
            </DropdownMenuItem>
          )}
          {isTaskClaimed && canApproveReject && (
            <>
              <DropdownMenuItem
                onClick={() => handleAction("approve", onApprove)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                <span>Approve</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAction("reject", onReject)}
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                <span>Reject</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          {isAdmin && isPending && !isTaskClaimed && onReassign && (
            <>
              <DropdownMenuItem onClick={() => setShowReassignModal(true)}>
                <User className="mr-2 h-4 w-4 text-blue-600" />
                <span>Reassign Task</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            <span>View Details</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {sharedModals}
      </>
    );
  }

  if (variant === "detail") {
    return (
      <>
      <div className="flex flex-wrap gap-3">
        {isPending && (
          <>
            {!isTaskClaimed && canClaim && onClaim && (
              <Button
                size="default"
                variant="outline"
                onClick={() => handleAction("claim", onClaim)}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {isLoading === "claim" ? "Claiming..." : "Claim Task"}
              </Button>
            )}
            {isTaskClaimed && canApproveReject && (
              <>
                {onApprove && (
                  <Button
                    size="default"
                    onClick={() => handleAction("approve", onApprove)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!!isLoading}
                    isLoading={isLoading === "approve"}
                    loadingText="Approving..."
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => handleAction("reject", onReject)}
                    disabled={!!isLoading}
                    isLoading={isLoading === "reject"}
                    loadingText="Rejecting..."
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </>
            )}
            {isTaskClaimed && !isTaskClaimedByUser && (
              <div className="flex items-center text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4 mr-2" />
                Task claimed by another user
              </div>
            )}
          </>
        )}
        {!isPending && task.status?.toUpperCase() === "APPROVED" && showStatus && (
          <Button
            size="default"
            variant="outline"
            disabled
            className="text-green-600"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approved
          </Button>
        )}
        {!isPending && task.status?.toUpperCase() === "REJECTED" && showStatus && (
          <Button
            size="default"
            variant="outline"
            disabled
            className="text-red-600"
          >
            <X className="h-4 w-4 mr-2" />
            Rejected
          </Button>
        )}
      </div>
      {sharedModals}
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2 ml-auto">
      {showViewButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleView}
          className="text-xs"
        >
          <Clock className="h-4 w-4 mr-1" />
          View
        </Button>
      )}
      {isPending && (
        <>
          {!isTaskClaimed && canClaim && onClaim && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("claim", onClaim)}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              {isLoading === "claim" ? "..." : "Claim"}
            </Button>
          )}
          {isTaskClaimed && canApproveReject && (
            <>
              {onApprove && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAction("approve", onApprove)}
                  disabled={!!isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isLoading === "approve" ? "..." : "Approve"}
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction("reject", onReject)}
                  disabled={!!isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  {isLoading === "reject" ? "..." : "Reject"}
                </Button>
              )}
            </>
          )}
          {isTaskClaimed && !isTaskClaimedByUser && canClaim && (
            <Badge variant={"outline"} className="text-xs text-muted-foreground">
              Claimed
            </Badge>
          )}
        </>
      )}
      <>
        {showStatus && <StatusBadge task={task} user={user} />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleView}>
              <Clock className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canClaim && onClaim && !isTaskClaimed && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleAction("claim", onClaim)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Claim Task
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && isPending && !isTaskClaimedByUser && onReassign && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowReassignModal(true)}>
                  <User className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Reassign Task</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
      {sharedModals}
    </div>
  );
});
