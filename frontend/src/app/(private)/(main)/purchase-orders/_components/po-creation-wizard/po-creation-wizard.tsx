"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { QUERY_KEYS } from "@/lib/constants";
import {
  createPurchaseOrderFromRequisition,
  updatePurchaseOrder,
} from "@/app/_actions/purchase-orders";
import type { Requisition } from "@/types/requisition";
import { WizardStepIndicator } from "./wizard-step-indicator";
import { Step1PODetails } from "./step1-po-details";
import { Step2VendorQuotes } from "./step2-vendor-quotes";
import { Step3ReviewConfirm } from "./step3-review-confirm";
import { useWizardState } from "./use-wizard-state";

// ============================================================================
// TYPES
// ============================================================================

export interface POCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: Requisition;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIZARD_STEPS = [
  { label: "PO Details" },
  { label: "Vendor & Quotes" },
  { label: "Review & Confirm" },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * POCreationWizard — root dialog component that wires all three wizard steps.
 *
 * Owns the WizardState via useWizardState. Handles step navigation with
 * validation gating on Step 1. On close, resets all state back to Step 1.
 * On submit, calls createPurchaseOrderFromRequisition, then patches quotations
 * via updatePurchaseOrder (non-blocking), invalidates the purchase orders
 * cache, and shows a success toast.
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 5.5, 5.6, 5.7, 5.8
 */
export function POCreationWizard({
  open,
  onOpenChange,
  requisition,
}: POCreationWizardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { wizardState, setStep1, setStep2, setStep3, resetWizard } =
    useWizardState(requisition);

  // ── navigation ─────────────────────────────────────────────────────────────

  // Step 1 → Step 2: only called by Step1PODetails after its own validation passes
  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  // Step 2 → Step 3
  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  // Step 2 → Step 1
  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  // Step 3 → Step 2
  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  // ── close / reset ──────────────────────────────────────────────────────────

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      // Req 1.7: discard all WizardState and reset to Step 1
      resetWizard();
      setCurrentStep(1);
    }
    onOpenChange(nextOpen);
  };

  // ── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Derive the selected vendor from Step 2 state
    const selectedVendor = wizardState.step2.selectedVendorLocalId
      ? wizardState.step2.vendors.find(
          (v) => v.localId === wizardState.step2.selectedVendorLocalId,
        )
      : null;

    try {
      // Req 5.5: call createPurchaseOrderFromRequisition with wizard state
      const result = await createPurchaseOrderFromRequisition(
        requisition,
        wizardState.step3.workflowId,
        selectedVendor?.vendorId || undefined,
        selectedVendor?.vendorName || undefined,
        wizardState.step3.procurementFlow,
      );

      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to create purchase order");
      }

      const createdPO = result.data;

      // Quotations to persist: use live quotations from step2 (which includes
      // any newly added ones), falling back to the REQ's existing quotations
      const liveQuotations =
        wizardState.step2.quotations ??
        (requisition.metadata?.quotations as any[]) ??
        [];

      // Always patch metadata: quotations + selected quotation file URL
      updatePurchaseOrder({
        poId: createdPO.id,
        purchaseOrderId: createdPO.id,
        metadata: {
          quotations: liveQuotations,
          ...(wizardState.step2.selectedQuotationFileId
            ? {
                selectedQuotationFileUrl:
                  wizardState.step2.selectedQuotationFileId,
              }
            : {}),
        },
      }).catch(() => {
        toast.warning(
          "Purchase order created, but quotations could not be saved. You can add them from the PO detail page.",
        );
      });

      // Req 5.7: invalidate purchase orders cache
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });

      // Req 5.7: show success toast, close dialog, navigate to PO detail
      toast.success("Purchase order created successfully");
      handleOpenChange(false);
      router.push(`/purchase-orders/${createdPO.id}`);
    } catch (err) {
      // Req 5.8: re-throw so Step3 can display the inline error
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Req 8.3: max-h-[90vh] with internal scrolling */}
      <DialogContent
        className="w-full max-w-lg sm:max-w-2xl max-h-[92vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        data-testid="po-creation-wizard"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create Purchase Order
          </DialogTitle>
        </DialogHeader>

        {/* Req 1.2: step indicator */}
        <div className="pb-2">
          <WizardStepIndicator currentStep={currentStep} steps={WIZARD_STEPS} />
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <Step1PODetails
            data={wizardState.step1}
            requisition={requisition}
            onChange={setStep1}
            onNext={handleStep1Next}
          />
        )}

        {currentStep === 2 && (
          <Step2VendorQuotes
            data={wizardState.step2}
            requisition={requisition}
            onChange={setStep2}
            onNext={handleStep2Next}
            onBack={handleStep2Back}
          />
        )}

        {currentStep === 3 && (
          <Step3ReviewConfirm
            wizardState={wizardState}
            requisition={requisition}
            onChange={setStep3}
            onSubmit={handleSubmit}
            onBack={handleStep3Back}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
