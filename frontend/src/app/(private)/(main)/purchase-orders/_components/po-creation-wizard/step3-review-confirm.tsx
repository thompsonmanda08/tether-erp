"use client";

import { useState } from "react";
import {
  FileText,
  ArrowDownUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { ConfigurationChecklistBanner } from "@/components/ui/configuration-checklist-banner";
import { CostComparisonPanel } from "@/components/purchase-orders/cost-comparison-panel";
import { useConfigurationStatus } from "@/hooks/use-configuration-status";
import { formatCurrency } from "@/lib/utils";
import type { Requisition } from "@/types/requisition";
import type { WizardState, WizardStep3State } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface Step3Props {
  wizardState: WizardState;
  requisition: Requisition;
  onChange: (step3: WizardStep3State) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Step 3 of the PO Creation Wizard — Review & Confirm.
 *
 * Renders read-only summaries of Steps 1 and 2, the WorkflowSelector,
 * procurement flow radio group, CostComparisonPanel for the selected vendor,
 * ConfigurationChecklistBanner when config is incomplete, and the
 * "Create Purchase Order" submit button.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1, 6.2, 6.3, 6.4
 */
export function Step3ReviewConfirm({
  wizardState,
  requisition,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
}: Step3Props) {
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { step1, step2, step3 } = wizardState;

  // Configuration status check (Req 6.1)
  const configStatus = useConfigurationStatus({
    includeWorkflow: true,
    workflowEntityType: "purchase_order",
  });

  // Derive selected vendor entry
  const selectedVendorEntry = step2.selectedVendorLocalId
    ? step2.vendors.find((v) => v.localId === step2.selectedVendorLocalId)
    : null;

  // Use step2.selectedQuotedAmount as the authoritative quoted amount —
  // selectedVendorEntry.quotedAmount can be stale if the same vendor was
  // re-selected with a different quotation row.
  const selectedQuotedAmount =
    step2.selectedQuotedAmount ?? selectedVendorEntry?.quotedAmount;

  // Cost comparison data — selected vendor only (Req 5.3)
  const costComparisonVendors = selectedVendorEntry
    ? [
        {
          vendorId: selectedVendorEntry.vendorId || selectedVendorEntry.localId,
          vendorName: selectedVendorEntry.vendorName,
          quotedAmount: selectedQuotedAmount,
          isSelected: true,
        },
      ]
    : [];

  // Button disabled conditions (Req 5.6, 6.2, 6.3)
  const isConfigIncomplete = !configStatus.allConfigured;
  const isWorkflowMissing = !step3.workflowId;
  const isDisabled = isConfigIncomplete || isWorkflowMissing || isSubmitting;

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleWorkflowChange = (workflowId: string) => {
    onChange({ ...step3, workflowId });
    if (workflowError) setWorkflowError(null);
  };

  const handleProcurementFlowChange = (
    value: "" | "goods_first" | "payment_first",
  ) => {
    onChange({ ...step3, procurementFlow: value });
  };

  const handleSubmit = async () => {
    // Validate workflow selection (Req 6.4)
    if (!step3.workflowId) {
      setWorkflowError("Please select an approval workflow");
      return;
    }
    if (isConfigIncomplete) return;

    setWorkflowError(null);
    setSubmitError(null);

    try {
      await onSubmit();
    } catch (err) {
      // Inline error on failure (Req 5.8)
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to create purchase order. Please try again.",
      );
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="step3-review-confirm">
      {/* ── Configuration Checklist Banner (Req 6.1, 6.2) ── */}
      {!configStatus.allConfigured && !configStatus.isLoading && (
        <ConfigurationChecklistBanner
          requirements={configStatus.requirements}
          title="Configuration Required"
          description="Complete the following configurations before creating a purchase order:"
          variant="creation"
        />
      )}

      {/* ── Step 1 Summary (Req 5.1) ── */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">PO Details</span>
          <Badge variant="secondary" className="text-xs">
            Step 1
          </Badge>
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <SummaryRow label="Title" value={step1.title} />
          {step1.description && (
            <SummaryRow
              label="Description"
              value={step1.description}
              fullWidth
            />
          )}
          <SummaryRow label="Department" value={step1.department} />
          <SummaryRow
            label="Priority"
            value={PRIORITY_LABELS[step1.priority] ?? step1.priority}
          />
          <SummaryRow
            label="Delivery Date"
            value={
              step1.deliveryDate
                ? step1.deliveryDate.toLocaleDateString("en-ZM", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"
            }
          />
          <SummaryRow label="Currency" value={step1.currency} />
          {step1.budgetCode && (
            <SummaryRow label="Budget Code" value={step1.budgetCode} />
          )}
          {step1.costCenter && (
            <SummaryRow label="Cost Center" value={step1.costCenter} />
          )}
          {step1.projectCode && (
            <SummaryRow label="Project Code" value={step1.projectCode} />
          )}
        </div>
      </div>

      {/* ── Step 2 Summary — selected vendor only (Req 5.2) ── */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Selected Supplier</span>
          <Badge variant="secondary" className="text-xs">
            Step 2
          </Badge>
        </div>
        <Separator />
        {!selectedVendorEntry ? (
          <p className="text-sm text-muted-foreground italic">
            No supplier selected — can be assigned later from the PO.
          </p>
        ) : (
          <div className="space-y-2">
            {[selectedVendorEntry].map((vendor) => {
              const isSelected = true;
              return (
                <div
                  key={vendor.localId}
                  className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm"
                  data-testid={`vendor-summary-${vendor.localId}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vendor.vendorName}</span>
                    {isSelected && (
                      <Badge
                        variant="default"
                        className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Selected Supplier
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {selectedQuotedAmount !== undefined
                      ? formatCurrency(selectedQuotedAmount, step1.currency)
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cost Comparison Panel for selected vendor (Req 5.3) ── */}
      {selectedVendorEntry && (
        <CostComparisonPanel
          estimatedCost={requisition.totalAmount ?? 0}
          currency={step1.currency}
          vendors={costComparisonVendors}
        />
      )}

      {/* ── Workflow Selector (Req 5.9, 6.3) ── */}
      <div className="space-y-2">
        <WorkflowSelector
          entityType="purchase_order"
          value={step3.workflowId}
          onChange={handleWorkflowChange}
          disabled={isSubmitting}
          required
          error={workflowError ?? undefined}
          showDetails={true}
        />
      </div>

      {/* ── Procurement Flow (Req 5.10) ── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <ArrowDownUp className="h-4 w-4" />
          Procurement Flow
        </Label>
        <p className="text-xs text-muted-foreground">
          Override the organization default for this purchase order only.
        </p>
        <RadioGroup
          value={step3.procurementFlow}
          onValueChange={(v) =>
            handleProcurementFlowChange(
              v as "" | "goods_first" | "payment_first",
            )
          }
          disabled={isSubmitting}
          className="space-y-2"
        >
          <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem
              value=""
              id="step3-flow-default"
              className="mt-0.5"
            />
            <Label htmlFor="step3-flow-default" className="cursor-pointer">
              <span className="font-medium text-sm">
                Use organization default
              </span>
              <p className="text-xs text-muted-foreground font-normal">
                Follow the workspace-level procurement flow setting
              </p>
            </Label>
          </div>
          <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem
              value="goods_first"
              id="step3-flow-goods"
              className="mt-0.5"
            />
            <Label htmlFor="step3-flow-goods" className="cursor-pointer">
              <span className="font-medium text-sm">Goods-First</span>
              <p className="text-xs text-muted-foreground font-normal">
                GRN must be approved before payment can be processed
              </p>
            </Label>
          </div>
          <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem
              value="payment_first"
              id="step3-flow-payment"
              className="mt-0.5"
            />
            <Label htmlFor="step3-flow-payment" className="cursor-pointer">
              <span className="font-medium text-sm">Payment-First</span>
              <p className="text-xs text-muted-foreground font-normal">
                Payment is processed upfront; GRN confirms delivery later
              </p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* ── Inline submit error (Req 5.8) ── */}
      {submitError && (
        <Alert variant="destructive" data-testid="submit-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* ── Footer ── */}
      <div className="sticky bottom-0 z-50 bg-background border-t flex flex-col-reverse sm:flex-row justify-between gap-2 pt-4 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
          data-testid="step3-back-button"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="w-full sm:w-auto"
          data-testid="step3-submit-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Create Purchase Order
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryRowProps {
  label: string;
  value: string;
  fullWidth?: boolean;
}

function SummaryRow({ label, value, fullWidth }: SummaryRowProps) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}
