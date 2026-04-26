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
import { Send, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";

interface GRNSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn: {
    documentNumber: string;
    poDocumentNumber?: string;
    linkedPV?: string;
    items: any[];
    status: string;
  };
  onSubmit: (workflowId: string, comments?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function GRNSubmitDialog({
  open,
  onOpenChange,
  grn,
  onSubmit,
  isSubmitting,
}: GRNSubmitDialogProps) {
  const [comments, setComments] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const hasItems = grn.items && grn.items.length > 0;
  const canSubmit = hasItems && !!workflowId;

  const handleSubmit = async () => {
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
            Submit GRN for Approval
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow and review the GRN summary before
            submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <WorkflowSelector
            entityType="grn"
            value={workflowId}
            onChange={setWorkflowId}
            disabled={isSubmitting}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          <Separator />

          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">GRN Number:</span>
              <span className="text-sm font-mono">{grn.documentNumber}</span>
            </div>
            {grn.poDocumentNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Purchase Order:</span>
                <span className="text-sm font-mono">{grn.poDocumentNumber}</span>
              </div>
            )}
            {grn.linkedPV && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Linked PV:</span>
                <span className="text-sm font-mono">{grn.linkedPV}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items Received:</span>
              <span className="text-sm">
                {grn.items?.length || 0} item{grn.items?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {canSubmit && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                GRN is ready for submission. Once submitted, it will enter the
                approval workflow.
              </AlertDescription>
            </Alert>
          )}

          <Textarea
            label="Comments (Optional)"
            id="comments"
            placeholder="Add any comments or notes for the approvers..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>

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
