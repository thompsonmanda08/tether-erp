"use client";

import { useParams } from "next/navigation";
import { useApprovalTaskDetail } from "@/hooks/use-approval-workflow";
import { useBudgetById } from "@/hooks/use-budget-queries";
import {
  ApprovalFlowDisplay,
  ApprovalActionPanel,
  ApprovalHistory,
} from "@/components/workflows";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  ClockIcon,
  Banknote,
  TrendingUp,
  User,
  Calendar,
} from "lucide-react";

export default function BudgetApprovalPage() {
  const params = useParams();
  const taskId = params.id as string;

  const { data: task, isLoading } = useApprovalTaskDetail(taskId);

  // Fetch budget data if we have a documentId from the task
  const budgetId = task?.documentId;
  const { data: budget } = useBudgetById(budgetId || "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load approval task details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Budget Approval
            </h1>
            <p className="text-muted-foreground">
              {budget?.budgetCode || `Budget #${task.documentId}`}
            </p>
          </div>
          <Badge
            variant={
              task.status?.toUpperCase() === "PENDING"
                ? "default"
                : task.status?.toUpperCase() === "APPROVED"
                  ? "secondary"
                  : "destructive"
            }
          >
            {task.status?.toUpperCase() === "PENDING"
              ? "Pending Approval"
              : task.status?.toUpperCase() === "APPROVED"
                ? "Approved"
                : "Rejected"}
          </Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-semibold">
                {task.entityType} #{task.entityNumber}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm">Budget Approval Workflow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-sm">{task.stageName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {task.approverName || "Unassigned"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Forms and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Details */}
          {budget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Budget Details
                </CardTitle>
                <CardDescription>
                  Review the budget information below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Budget Code
                    </h4>
                    <p className="font-mono">{budget.budgetCode}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Total Budget
                    </h4>
                    <p className="font-semibold text-lg">
                      K{(budget.totalBudget || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Department
                    </h4>
                    <p>{budget.department || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Fiscal Year
                    </h4>
                    <p>{budget.fiscalYear || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Allocated Amount
                    </h4>
                    <p className="font-semibold">
                      K{(budget.allocatedAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Remaining Amount
                    </h4>
                    <p className="font-semibold">
                      K{(budget.remainingAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Actions */}
          {task.status?.toUpperCase() === "PENDING" && (
            <ApprovalActionPanel
              task={task}
              onApprovalComplete={() => {
                window.location.reload();
              }}
            />
          )}

          {/* Completed Approval Alert */}
          {task.status?.toUpperCase() !== "PENDING" && (
            <Alert
              className={
                task.status?.toUpperCase() === "APPROVED"
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20"
              }
            >
              <CheckCircle2
                className={`h-4 w-4 ${task.status?.toUpperCase() === "APPROVED" ? "text-green-600" : "text-red-600"}`}
              />
              <AlertDescription
                className={
                  task.status?.toUpperCase() === "APPROVED"
                    ? "text-green-700 dark:text-green-200"
                    : "text-red-700 dark:text-red-200"
                }
              >
                {task.status?.toUpperCase() === "APPROVED"
                  ? "This budget has been approved and is proceeding to the next stage."
                  : "This budget has been rejected. Contact the requester for more information."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Right Column - Workflow Progress */}
        <div className="space-y-6">
          {/* Workflow Timeline */}
          <ApprovalFlowDisplay
            approvalHistory={task.approvalHistory || []}
            currentStage={task.stage || 0}
            totalStages={4}
            isCompleted={task.status !== "PENDING"}
          />

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground mb-1">
                  Created
                </h4>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(task.createdAt || new Date()).toLocaleString()}
                </p>
              </div>

              {task.actionDate && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">
                    Action Date
                  </h4>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    {new Date(task.actionDate).toLocaleString()}
                  </p>
                </div>
              )}

              {task.dueDate && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">
                    Due Date
                  </h4>
                  <p className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    {new Date(task.dueDate).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval History */}
      <ApprovalHistory
        entityId={task.entityId || taskId}
        entityType={task.entityType || "Budget"}
      />
    </div>
  );
}
