"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { useApprovalTasks } from "@/hooks/use-approval-workflow";
import { WorkflowActionButtons } from "@/components/workflows/workflow-action-buttons";
import {
  claimWorkflowTask,
  approveApprovalTask,
  rejectApprovalTask,
} from "@/app/_actions/workflow-approval-actions";
import { ApprovalTask } from "@/types";

interface RecentTasksProps {
  userId: string;
  userRole: string;
  initialTasks?: { data: ApprovalTask[]; pagination?: any };
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  REQUISITION: "Requis",
  BUDGET: "Budget",
  PURCHASE_ORDER: "PO",
  PAYMENT_VOUCHER: "PV",
  GOODS_RECEIVED_NOTE: "GRN",
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  REQUISITION:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  BUDGET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PURCHASE_ORDER:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PAYMENT_VOUCHER:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  GOODS_RECEIVED_NOTE:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
};

const DOC_ROUTES: Record<string, string> = {
  REQUISITION: "/requisitions",
  BUDGET: "/budgets",
  PURCHASE_ORDER: "/purchase-orders",
  PAYMENT_VOUCHER: "/payment-vouchers",
  GOODS_RECEIVED_NOTE: "/grn",
};

function PriorityBadge({
  priority,
  importance,
}: {
  priority?: string;
  importance?: string;
}) {
  const p = (priority || importance || "").toUpperCase();
  if (p === "HIGH" || p === "URGENT") {
    return (
      <Badge variant="destructive" className="text-xs px-1.5">
        High
      </Badge>
    );
  }
  if (p === "MEDIUM") {
    return (
      <Badge className="text-xs px-1.5 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">
        Medium
      </Badge>
    );
  }
  if (p === "LOW") {
    return (
      <Badge variant="secondary" className="text-xs px-1.5">
        Low
      </Badge>
    );
  }
  return null;
}

export function RecentTasks({ userId: _userId, userRole: _userRole, initialTasks }: RecentTasksProps) {
  const router = useRouter();
  // Fetch without status filter so claimed tasks (status="claimed") stay visible after
  // the user claims them. Filter client-side to hide completed/rejected tasks.
  const { data, isLoading, refetch } = useApprovalTasks({ viewAll: true }, 1, 10, initialTasks);
  const allTasks: ApprovalTask[] = data?.data || [];
  const tasks = allTasks
    .filter((t) => t.status?.toUpperCase() === "PENDING" || t.status?.toUpperCase() === "CLAIMED")
    .slice(0, 5);
  const total = tasks.length;

  const handleClaim = async (taskId: string) => {
    await claimWorkflowTask(taskId);
    refetch();
  };

  const handleApprove = async (
    taskId: string,
    actionData?: { signature: string; comments: string }
  ) => {
    await approveApprovalTask(taskId, {
      signature: actionData?.signature || "",
      comments: actionData?.comments || "Approved",
      stageNumber: 1,
    });
    refetch();
  };

  const handleReject = async (
    taskId: string,
    actionData?: {
      signature: string;
      comments: string;
      rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
    }
  ) => {
    await rejectApprovalTask(taskId, {
      remarks: actionData?.comments || "Rejected",
      signature: actionData?.signature || "",
      rejectionType: actionData?.rejectionType || "reject",
    });
    refetch();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Recent Tasks</CardTitle>
            {!isLoading && total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {total} pending
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => router.push("/tasks")}
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-16 shrink-0" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </EmptyMedia>
              <EmptyTitle>All caught up!</EmptyTitle>
              <EmptyDescription>
                No pending approval tasks in the organization.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const docType = task.documentType?.toUpperCase() || "";
              const entityId = task.documentId;
              const isOverdue =
                task.dueAt &&
                new Date(task.dueAt) < new Date() &&
                task.status?.toUpperCase() === "PENDING";

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  {/* Row 1: chip + doc number + priority badge + action button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Entity type chip */}
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          ENTITY_TYPE_COLORS[docType] ||
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {ENTITY_TYPE_LABELS[docType] || docType}
                      </span>

                      {/* Document number */}
                      <button
                        className="text-sm font-semibold text-primary hover:underline truncate"
                        onClick={() =>
                          router.push(
                            `${DOC_ROUTES[docType] || "/tasks"}/${entityId}`
                          )
                        }
                      >
                        {task.documentNumber || task.title || task.id.slice(0, 8)}
                      </button>
                    </div>

                    {/* Action buttons — always visible, pinned right */}
                    <div className="shrink-0">
                      <WorkflowActionButtons
                        task={task as any}
                        variant="compact"
                        showViewButton={false}
                        onClaim={handleClaim}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRefresh={refetch}
                      />
                    </div>
                  </div>

                  {/* Row 2: priority + stage name + due date */}
                  <div className="flex items-center gap-2 mt-1.5 pl-0.5">
                    <PriorityBadge
                      priority={task.priority as string}
                      importance={task.importance as string}
                    />

                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {task.stageName || "Pending Review"}
                    </span>

                    {task.dueAt && (
                      <span
                        className={`shrink-0 text-xs flex items-center gap-1 ${
                          isOverdue
                            ? "text-red-600 dark:text-red-400 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
