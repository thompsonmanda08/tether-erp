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
import { PaymentVoucher } from "@/types/payment-voucher";
import type { Workflow } from "@/types/workflow-config";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { WorkflowRequirementBanner } from "@/components/ui/workflow-requirement-banner";
import { formatCurrency } from "@/lib/utils";

/**
 * Props for the PaymentVoucherSubmitDialog component
 */
interface PaymentVoucherSubmitDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change the open state */
  onOpenChange: (open: boolean) => void;
  /** The payment voucher to submit */
  paymentVoucher: PaymentVoucher;
  /** Callback to submit the PV with selected workflow and optional comments */
  onSubmit: (workflowId: string, comments?: string) => Promise<void>;
  /** Whether the submission is in progress */
  isSubmitting: boolean;
}

/**
 * Dialog component for submitting a payment voucher for approval
 *
 * Displays a workflow selection interface with PV summary and validation.
 * Ensures the PV has required data (items, vendor, invoice number, amount) before allowing submission.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback to change the open state
 * @param props.paymentVoucher - The payment voucher to submit
 * @param props.onSubmit - Callback to submit the PV with selected workflow and optional comments
 * @param props.isSubmitting - Whether the submission is in progress
 *
 * @example
 * ```tsx
 * <PaymentVoucherSubmitDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   paymentVoucher={paymentVoucher}
 *   onSubmit={handleSubmit}
 *   isSubmitting={submitMutation.isPending}
 * />
 * ```
 *
 * **Validates: Requirements 1.3, 1.4, 11.1-11.8, 20.1-20.7**
 */
export function PaymentVoucherSubmitDialog({
  open,
  onOpenChange,
  paymentVoucher,
  onSubmit,
  isSubmitting,
}: PaymentVoucherSubmitDialogProps) {
  const [comments, setComments] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // Validation: PV must have items, vendor, invoice number, and valid amount before submission
  const hasItems = paymentVoucher.items && paymentVoucher.items.length > 0;
  const hasVendor = !!paymentVoucher.vendorId || !!paymentVoucher.vendorName;
  const hasInvoiceNumber = !!paymentVoucher.invoiceNumber;
  const hasValidAmount =
    paymentVoucher.totalAmount > 0 || paymentVoucher.amount > 0;
  const canSubmit =
    hasItems && hasVendor && hasInvoiceNumber && hasValidAmount && workflowId;

  /**
   * Handles workflow selection from the WorkflowSelector component
   * Currently only tracks workflowId state, but can be extended for additional workflow details
   */
  const handleWorkflowSelect = useCallback((_workflow: Workflow | null) => {
    // Workflow selection is tracked via workflowId state
    // Additional workflow details can be used here if needed in the future
  }, []);

  /**
   * Handles the submit button click
   * Validates workflow selection and calls the onSubmit callback
   */
  const handleSubmit = async () => {
    // Validate workflow selection
    if (!workflowId) {
      setWorkflowError("Please select a workflow");
      return;
    }

    if (!canSubmit) return;

    setWorkflowError(null);
    await onSubmit(workflowId, comments);

    // Only reset if submission was successful (dialog will close)
    // The handleClose function will also reset state when dialog closes
  };

  /**
   * Handles dialog close
   * Resets all form state when dialog is closed
   */
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
            Submit Payment Voucher for Approval
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workflow Requirement Banner - Shows if no workflows configured */}
          <WorkflowRequirementBanner entityType="payment_voucher" />

          {/* Workflow Selector */}
          <WorkflowSelector
            entityType="payment_voucher"
            value={workflowId}
            onChange={setWorkflowId}
            onWorkflowSelect={handleWorkflowSelect}
            disabled={isSubmitting}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          <Separator />

          {/* Payment Voucher Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Document Number:</span>
              <span className="text-sm font-mono">
                {paymentVoucher.documentNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Title:</span>
              <span className="text-sm">{paymentVoucher.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Vendor:</span>
              <span className="text-sm">{paymentVoucher.vendorName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Invoice Number:</span>
              <span className="text-sm font-mono">
                {paymentVoucher.invoiceNumber || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{paymentVoucher.department}</span>
            </div>
            {paymentVoucher.priority && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Priority:</span>
                <span className="text-sm capitalize">
                  {paymentVoucher.priority}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-mono text-primary">
                {formatCurrency(
                  paymentVoucher.totalAmount || paymentVoucher.amount,
                  paymentVoucher.currency,
                )}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items:</span>
              <span className="text-sm">
                {paymentVoucher.items?.length || 0} item
                {paymentVoucher.items?.length !== 1 ? "s" : ""}
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

          {!hasInvoiceNumber && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must provide an invoice number before submitting.
              </AlertDescription>
            </Alert>
          )}

          {!hasValidAmount && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment amount must be greater than zero.
              </AlertDescription>
            </Alert>
          )}

          {canSubmit && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Payment voucher is ready for submission. Once submitted, it will
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
            Submit for Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
