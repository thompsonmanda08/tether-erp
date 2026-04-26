"use client";

import { useCallback, useState } from "react";
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
import { Requisition } from "@/types/requisition";
import type { Workflow } from "@/types/workflow-config";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShoppingCart,
  Info,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { WorkflowRequirementBanner } from "@/components/ui/workflow-requirement-banner";

interface RequisitionSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: Requisition;
  onSubmit: (workflowId: string, comments?: string) => Promise<void>;
  isSubmitting: boolean;
}

function getRoutingPreview(
  workflow: Workflow | null,
  requisition: Requisition,
): {
  type: "auto" | "accounting-stages" | "procurement";
  message: string;
} | null {
  if (!workflow) return null;

  const conditions = workflow.conditions;
  if (!conditions) {
    return {
      type: "procurement",
      message: "Standard procurement approval workflow.",
    };
  }

  const isAccounting = conditions.routingType === "accounting";

  if (!isAccounting) {
    return {
      type: "procurement",
      message: "Standard procurement approval workflow.",
    };
  }

  // Check if auto-approval criteria are met
  const stagesCount = workflow.stages?.length || 0;
  if (conditions.autoApprove && stagesCount === 0) {
    const maxAmount = conditions.autoApprovalMaxAmount;
    const withinAmount = !maxAmount || requisition.totalAmount <= maxAmount;

    if (withinAmount) {
      return {
        type: "auto",
        message:
          "This requisition qualifies for auto-approval. A Purchase Order will be generated automatically.",
      };
    } else {
      return {
        type: "accounting-stages",
        message: `This is an accounting workflow but the requisition amount exceeds the auto-approval limit of ${maxAmount?.toLocaleString()}. It requires manual approval.`,
      };
    }
  }

  // Accounting workflow with stages
  if (stagesCount > 0) {
    return {
      type: "accounting-stages",
      message: `Accounting workflow with ${stagesCount} approval ${stagesCount === 1 ? "stage" : "stages"}. A Purchase Order will be auto-generated after approval.`,
    };
  }

  return {
    type: "procurement",
    message: "Standard procurement approval workflow.",
  };
}

export function RequisitionSubmitDialog({
  open,
  onOpenChange,
  requisition,
  onSubmit,
  isSubmitting,
}: RequisitionSubmitDialogProps) {
  const [comments, setComments] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );

  const hasItems = requisition.items && requisition.items.length > 0;
  const canSubmit = hasItems && workflowId;

  const routingPreview = getRoutingPreview(selectedWorkflow, requisition);

  const handleWorkflowSelect = useCallback((workflow: Workflow | null) => {
    setSelectedWorkflow(workflow);
  }, []);

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
      setSelectedWorkflow(null);
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
            Submit Requisition for Approval
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workflow Requirement Banner - Shows if no workflows configured */}
          <WorkflowRequirementBanner entityType="requisition" />

          {/* Workflow Selector */}
          <WorkflowSelector
            entityType="requisition"
            value={workflowId}
            onChange={setWorkflowId}
            onWorkflowSelect={handleWorkflowSelect}
            disabled={isSubmitting}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          {/* Routing Preview */}
          {routingPreview && (
            <Alert
              variant="default"
              className={
                routingPreview.type === "auto"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  : routingPreview.type === "accounting-stages"
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                    : "border-primary/20 bg-primary/5 text-foreground"
              }
            >
              {routingPreview.type === "auto" ? (
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : routingPreview.type === "accounting-stages" ? (
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-primary" />
              )}
              <AlertDescription>{routingPreview.message}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Requisition Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Document Number:</span>
              <span className="text-sm font-mono">
                {requisition.documentNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Title:</span>
              <span className="text-sm">{requisition.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{requisition.department}</span>
            </div>
            {requisition.priority && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Priority:</span>
                <span className="text-sm capitalize">
                  {requisition.priority}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-mono text-primary">
                {requisition.currency}{" "}
                {requisition.totalAmount?.toLocaleString("en-ZM", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items:</span>
              <span className="text-sm">
                {requisition.items?.length || 0} item
                {requisition.items?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Validation Alerts */}
          {!hasItems && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must add at least one item before submitting.
              </AlertDescription>
            </Alert>
          )}

          {canSubmit && !routingPreview && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Requisition is ready for submission. Once submitted, it will
                enter the approval workflow.
              </AlertDescription>
            </Alert>
          )}

          {/* Comments */}
          <Textarea
            id="comments"
            label="Comments (Optional)"
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
            {routingPreview?.type === "auto"
              ? "Auto-Approve & Generate PO"
              : "Submit for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
