"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Budget } from "@/types/budget";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";

interface BudgetSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onSubmit: (workflowId: string, comments?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function BudgetSubmitDialog({
  open,
  onOpenChange,
  budget,
  onSubmit,
  isSubmitting,
}: BudgetSubmitDialogProps) {
  const [comments, setComments] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const utilizationPercentage =
    (budget.allocatedAmount / budget.totalBudget) * 100;
  const isOverBudget = budget.allocatedAmount > budget.totalBudget;
  const hasItems = budget.items && budget.items.length > 0;

  const canSubmit = !isOverBudget && hasItems && workflowId;

  const handleSubmit = async () => {
    // Validate workflow selection
    if (!workflowId) {
      setWorkflowError("Please select a workflow");
      return;
    }

    if (!canSubmit) return;

    setWorkflowError(null);
    await onSubmit(workflowId, comments);
    setComments("");
    setWorkflowId("");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComments("");
      setWorkflowId("");
      setWorkflowError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Budget for Approval
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow and review the budget summary before
            submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workflow Selector */}
          <WorkflowSelector
            entityType="budget"
            value={workflowId}
            onChange={setWorkflowId}
            disabled={isSubmitting}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          <Separator />

          {/* Budget Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Budget Code:</span>
              <span className="text-sm font-mono">{budget.budgetCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{budget.department}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Fiscal Year:</span>
              <span className="text-sm">{budget.fiscalYear}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Budget:</span>
              <span className="text-sm font-mono">
                {budget.currency || "K"}
                {budget.totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Allocated:</span>
              <span className="text-sm font-mono text-primary">
                {budget.currency || "K"}
                {budget.allocatedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Remaining:</span>
              <span
                className={`text-sm font-mono ${budget.remainingAmount < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {budget.currency || "K"}
                {budget.remainingAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Utilization:</span>
              <span className="text-sm font-semibold">
                {utilizationPercentage.toFixed(1)}%
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Budget Items:</span>
              <span className="text-sm">
                {budget.items?.length || 0} item
                {budget.items?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Validation Alerts */}
          {!hasItems && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must add at least one budget item before submitting.
              </AlertDescription>
            </Alert>
          )}

          {isOverBudget && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Budget items exceed total budget. Please adjust before
                submitting.
              </AlertDescription>
            </Alert>
          )}

          {canSubmit && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Budget is ready for submission. Once submitted, it will enter
                the approval workflow.
              </AlertDescription>
            </Alert>
          )}

          {/* Comments */}
          <Textarea
            label="Comments (Optional)"
            id="comments"
            placeholder="Add any comments or notes for the approvers..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isSubmitting}
            rows={4}
          />

        </div>

        {/* Sticky Footer */}
        <div className="bg-card/5 backdrop-blur-xs sticky bottom-0 flex flex-col-reverse justify-end gap-3 p-4 rounded-b-lg border-t py-6 sm:flex-row sm:py-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            isLoading={isSubmitting}
            loadingText="Submitting..."
          >
            <Send className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
