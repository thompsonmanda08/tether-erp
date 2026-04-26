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
import { Label } from "@/components/ui/label";
import { PurchaseOrder } from "@/types/purchase-order";
import type { Workflow } from "@/types/workflow-config";
import { Send, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { WorkflowRequirementBanner } from "@/components/ui/workflow-requirement-banner";
import { updatePurchaseOrder } from "@/app/_actions/purchase-orders";
import { toast } from "sonner";
import type { Quotation } from "@/types/core";

interface PurchaseOrderSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  onSubmit: (workflowId: string, comments?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function PurchaseOrderSubmitDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSubmit,
  isSubmitting,
}: PurchaseOrderSubmitDialogProps) {
  const [comments, setComments] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [bypassJustification, setBypassJustification] = useState("");
  const [isSavingBypass, setIsSavingBypass] = useState(false);

  const hasItems = purchaseOrder.items && purchaseOrder.items.length > 0;
  const hasVendor = !!(
    purchaseOrder.vendorId?.trim() || purchaseOrder.vendorName?.trim()
  );

  // Quotation gate
  const isAutomatic = purchaseOrder.automationUsed;
  const quotations: Quotation[] =
    (purchaseOrder.metadata?.quotations as Quotation[]) ?? [];
  const quotationCount = quotations.length;
  const needsQuotations = !isAutomatic && quotationCount < 3;
  const bypassAlreadySaved = purchaseOrder.quotationGateOverridden;
  // Bypass is satisfied when already saved OR user has enabled + filled justification
  const bypassSatisfied =
    bypassAlreadySaved ||
    (bypassEnabled && bypassJustification.trim().length > 0);

  const canSubmit =
    hasItems &&
    hasVendor &&
    workflowId &&
    (!needsQuotations || bypassSatisfied);

  const handleWorkflowSelect = useCallback(
    (_workflow: Workflow | null) => {},
    [],
  );

  const handleSubmit = async () => {
    if (!workflowId) {
      setWorkflowError("Please select a workflow");
      return;
    }
    if (!canSubmit) return;
    setWorkflowError(null);

    // If bypass is newly enabled, persist it before submitting
    if (needsQuotations && bypassEnabled && !bypassAlreadySaved) {
      setIsSavingBypass(true);
      try {
        const result = await updatePurchaseOrder({
          purchaseOrderId: purchaseOrder.id,
          poId: purchaseOrder.id,
          quotationGateOverridden: true,
          bypassJustification: bypassJustification.trim(),
        });
        if (!result.success) {
          toast.error("Failed to save bypass justification");
          setIsSavingBypass(false);
          return;
        }
      } catch {
        toast.error("Failed to save bypass justification");
        setIsSavingBypass(false);
        return;
      }
      setIsSavingBypass(false);
    }

    await onSubmit(workflowId, comments);
  };

  const handleClose = () => {
    if (!isSubmitting && !isSavingBypass) {
      setComments("");
      setWorkflowId("");
      setWorkflowError(null);
      setBypassEnabled(false);
      setBypassJustification("");
      onOpenChange(false);
    }
  };

  const isPending = isSubmitting || isSavingBypass;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl! max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Purchase Order for Approval
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <WorkflowRequirementBanner entityType="purchase_order" />

          <WorkflowSelector
            entityType="purchase_order"
            value={workflowId}
            onChange={setWorkflowId}
            onWorkflowSelect={handleWorkflowSelect}
            disabled={isPending}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          <Separator />

          {/* Purchase Order Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Document Number:</span>
              <span className="text-sm font-mono">
                {purchaseOrder.documentNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Title:</span>
              <span className="text-sm">{purchaseOrder.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Vendor:</span>
              <span className="text-sm">{purchaseOrder.vendorName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{purchaseOrder.department}</span>
            </div>
            {purchaseOrder.priority && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Priority:</span>
                <span className="text-sm capitalize">
                  {purchaseOrder.priority}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-mono text-primary">
                {purchaseOrder.currency}{" "}
                {purchaseOrder.totalAmount?.toLocaleString("en-ZM", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Quotations:</span>
              <span
                className={`text-sm font-mono ${
                  quotationCount >= 3 || isAutomatic
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isAutomatic ? "N/A (auto-PO)" : `${quotationCount}/3`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items:</span>
              <span className="text-sm">
                {purchaseOrder.items?.length || 0} item
                {purchaseOrder.items?.length !== 1 ? "s" : ""}
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

          {!hasVendor && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must select a vendor before submitting.
              </AlertDescription>
            </Alert>
          )}

          {/* Quotation gate warning + bypass section */}
          {needsQuotations && !bypassAlreadySaved && (
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="space-y-3">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  Only {quotationCount} of 3 required quotations have been
                  added.
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs">
                  You can add more quotations in the Supporting Documents tab,
                  or override the requirement with a justification below.
                </p>
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="bypass-check"
                    checked={bypassEnabled}
                    onChange={(e) => {
                      setBypassEnabled(e.target.checked);
                      if (!e.target.checked) setBypassJustification("");
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 dark:border-amber-600 accent-amber-600"
                  />
                  <Label
                    htmlFor="bypass-check"
                    className="text-amber-800 dark:text-amber-200 text-xs cursor-pointer"
                  >
                    Override the minimum quotation requirement
                  </Label>
                </div>
                {bypassEnabled && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-amber-800 dark:text-amber-200">
                      Justification (required)
                    </Label>
                    <Textarea
                      placeholder="Explain why fewer than 3 quotations are available (e.g. only 2 vendors supply this item in the region)..."
                      value={bypassJustification}
                      onChange={(e) => setBypassJustification(e.target.value)}
                      rows={3}
                      className="text-sm border-amber-300 focus:border-amber-500 dark:border-amber-700 dark:focus:border-amber-500 dark:bg-background dark:text-foreground dark:placeholder:text-muted-foreground"
                      disabled={isPending}
                    />
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {bypassAlreadySaved && (
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription>
                <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                  Quotation Override Applied
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                  {purchaseOrder.bypassJustification}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {canSubmit && !needsQuotations && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Purchase order is ready for submission. Once submitted, it will
                enter the approval workflow.
              </AlertDescription>
            </Alert>
          )}

          <Textarea
            id="comments"
            label="Comments (Optional)"
            placeholder="Add any comments or notes for the approvers..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isPending}
            rows={4}
          />
        </div>

        {/* Sticky Footer */}
        <div className="bg-card/5 backdrop-blur-xs sticky bottom-0 flex flex-col-reverse justify-end gap-3 p-4 rounded-b-lg border-t py-6 sm:flex-row sm:py-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            isLoading={isPending}
            loadingText={
              isSavingBypass ? "Saving override..." : "Submitting..."
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {needsQuotations && bypassEnabled && !bypassAlreadySaved
              ? "Submit with Override"
              : "Submit for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
