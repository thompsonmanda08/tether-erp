"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas } from "@/components/ui/signature-canvas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useApprovalTasks,
  useApproveTask,
  useRejectTask,
} from "@/hooks/use-approval-workflow";
import { Budget } from "@/types/budget";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface BudgetApprovalActionPanelProps {
  budgetId: string;
  budgetStatus: string;
  budget?: Budget;
  onApprovalComplete: () => void;
}

export function BudgetApprovalActionPanel({
  budgetId,
  budgetStatus,
  budget,
  onApprovalComplete,
}: BudgetApprovalActionPanelProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [remarks, setRemarks] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch approval tasks for this budget
  const { data: approvalData } = useApprovalTasks(
    { documentType: "BUDGET" },
    1,
    100
  );

  const approvalTasks = approvalData?.data || [];

  // Find the approval task for this budget
  const approvalTask = approvalTasks.find(
    (task: any) => task.documentId === budgetId
  );

  // Setup approve/reject mutations with real backend
  const approveMutation = useApproveTask(approvalTask?.id || "", () => {
    setSuccess("Budget approved successfully");
    setTimeout(onApprovalComplete, 1500);
  });

  const rejectMutation = useRejectTask(approvalTask?.id || "", () => {
    setSuccess("Budget rejected successfully");
    setTimeout(onApprovalComplete, 1500);
  });

  // Reset on mutation completion
  useEffect(() => {
    if (approveMutation.isSuccess || rejectMutation.isSuccess) {
      setComments("");
      setRemarks("");
      setSignature("");
      setAction(null);
    }
  }, [approveMutation.isSuccess, rejectMutation.isSuccess]);

  // Only show for budgets that are in approval
  if (budgetStatus !== "IN_REVIEW" && budgetStatus !== "SUBMITTED") {
    return null;
  }

  // Don't show if no approval task found
  if (!approvalTask) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No pending approval task found for this budget.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async () => {
    if (!signature) {
      setError("Signature is required to approve the budget");
      return;
    }

    setError(null);
    setSuccess(null);

    approveMutation.mutate({
      comments: comments || "Budget approved",
      signature,
      stageNumber: 0,
    });
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      setError("Remarks are required for rejection");
      return;
    }

    setError(null);
    setSuccess(null);

    rejectMutation.mutate({
      remarks,
      comments,
      signature: signature || "",
      rejectionType: "reject",
    });
  };

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  if (action === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Action</CardTitle>
          <CardDescription>
            Approve or reject this budget submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => {
                setAction("approve");
                setError(null);
                setSuccess(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Budget
            </Button>
            <Button
              onClick={() => {
                setAction("reject");
                setError(null);
                setSuccess(null);
              }}
              variant="destructive"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Reject Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {action === "approve" ? "Approve Budget" : "Reject Budget"}
        </CardTitle>
        <CardDescription>
          {action === "approve"
            ? "Add a digital signature and optional comments to approve this budget"
            : "Provide detailed remarks explaining why this budget is being rejected"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {action === "approve" ? (
          <>
            <Textarea
              label="Comments (Optional)"
              id="comments"
              placeholder="Add any approval comments, conditions, or recommendations..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={isLoading}
            />

            <SignatureCanvas
              onSignatureChange={setSignature}
              disabled={isLoading}
            />
          </>
        ) : (
          <>
            <Textarea
              label="Rejection Remarks"
              required
              id="remarks"
              placeholder="Required: Explain in detail why this budget is being rejected. This helps the requester understand the issues and resubmit appropriately."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isLoading}
              descriptionText="Detailed remarks are required for rejection to provide clear feedback"
            />

            <Textarea
              label="Additional Comments (Optional)"
              id="comments"
              placeholder="Any additional context or suggestions for improvement..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={isLoading}
            />
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={action === "approve" ? handleApprove : handleReject}
            disabled={
              isLoading ||
              (action === "reject" && !remarks.trim()) ||
              (action === "approve" && !signature)
            }
            className={
              action === "approve"
                ? "bg-green-600 hover:bg-green-700 flex-1"
                : "bg-red-600 hover:bg-red-700 flex-1"
            }
          >
            {isLoading
              ? "Processing..."
              : action === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAction(null);
              setComments("");
              setRemarks("");
              setSignature("");
              setError(null);
              setSuccess(null);
            }}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
