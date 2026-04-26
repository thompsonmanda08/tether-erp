"use client";

import { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { useVendors } from "@/hooks/use-vendor-queries";
import { CostComparisonPanel } from "@/components/purchase-orders/cost-comparison-panel";
import { QuotationCollectionSection } from "@/app/(private)/(main)/requisitions/_components/quotation-collection-section";
import { InlineVendorForm } from "./inline-vendor-form";
import type { Vendor } from "@/types/vendor";
import type { Quotation } from "@/types/core";
import type { Requisition } from "@/types/requisition";
import type { WizardStep2State, WizardVendorEntry } from "./types";

export interface Step2Props {
  data: WizardStep2State;
  requisition: Requisition;
  onChange: (data: WizardStep2State) => void;
  onNext: () => void;
  onBack: () => void;
}

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function vendorToEntry(vendor: Vendor): WizardVendorEntry {
  return {
    localId: generateLocalId(),
    vendorId: vendor.id,
    vendorName: vendor.name,
    quotations: [],
  };
}

/**
 * Step 2 — Vendor & Quotes.
 *
 * Shows the QuotationCollectionSection so users can view existing quotations,
 * add new ones, and select a supplier. Falls back to a vendor dropdown when
 * no quotations exist yet.
 *
 * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11
 */
export function Step2VendorQuotes({
  data,
  requisition,
  onChange,
  onNext,
  onBack,
}: Step2Props) {
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [showNoVendorWarning, setShowNoVendorWarning] = useState(false);

  const { data: allVendors = [], isLoading: vendorsLoading } = useVendors();

  // Live quotations — start from REQ metadata, updated as user adds more
  const liveQuotations: Quotation[] =
    data.quotations ?? (requisition.metadata?.quotations as Quotation[]) ?? [];

  // Derive selected vendor entry
  const selectedEntry = data.selectedVendorLocalId
    ? (data.vendors.find((v) => v.localId === data.selectedVendorLocalId) ??
      null)
    : null;

  // ── quotation save (in-memory) ─────────────────────────────────────────────

  const handleQuotationSave = useCallback(
    async (updatedQuotations: Quotation[]) => {
      onChange({ ...data, quotations: updatedQuotations });
    },
    [data, onChange],
  );

  // ── select vendor from quotation row ──────────────────────────────────────

  const handleSelectVendorFromQuotation = useCallback(
    async (
      vendorId: string,
      vendorName: string,
      amount: number,
      fileUrl: string,
    ) => {
      const existing = data.vendors.find(
        (v) => v.vendorId === vendorId || v.vendorName === vendorName,
      );

      if (existing) {
        // Update the existing entry's quotedAmount and selectedQuotationFileId
        const updatedVendors = data.vendors.map((v) =>
          v.localId === existing.localId
            ? { ...v, quotedAmount: amount, selectedQuotationFileId: fileUrl }
            : v,
        );
        onChange({
          ...data,
          vendors: updatedVendors,
          selectedVendorLocalId: existing.localId,
          selectedQuotationFileId: fileUrl,
          selectedQuotedAmount: amount,
        });
      } else {
        const entry: WizardVendorEntry = {
          localId: generateLocalId(),
          vendorId: vendorId ?? "",
          vendorName,
          quotations: [],
          quotedAmount: amount,
          selectedQuotationFileId: fileUrl,
        };
        onChange({
          ...data,
          vendors: [...data.vendors, entry],
          selectedVendorLocalId: entry.localId,
          selectedQuotationFileId: fileUrl,
          selectedQuotedAmount: amount,
        });
      }
    },
    [data, onChange],
  );

  // ── vendor dropdown (no-quotation fallback) ───────────────────────────────

  const handleVendorDropdownChange = useCallback(
    (vendorId: string) => {
      if (!vendorId) {
        onChange({ ...data, selectedVendorLocalId: null });
        return;
      }
      const vendor = (allVendors as Vendor[]).find((v) => v.id === vendorId);
      if (!vendor) return;

      const existing = data.vendors.find((v) => v.vendorId === vendorId);
      if (existing) {
        onChange({ ...data, selectedVendorLocalId: existing.localId });
      } else {
        const entry = vendorToEntry(vendor);
        onChange({
          ...data,
          vendors: [...data.vendors, entry],
          selectedVendorLocalId: entry.localId,
        });
      }
    },
    [data, allVendors, onChange],
  );

  // ── inline new vendor ──────────────────────────────────────────────────────

  const handleNewVendorSaved = useCallback(
    (vendor: Vendor) => {
      const entry = vendorToEntry(vendor);
      onChange({
        ...data,
        vendors: [...data.vendors, entry],
        selectedVendorLocalId: entry.localId,
      });
      setShowInlineForm(false);
    },
    [data, onChange],
  );

  // ── next ───────────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (!data.selectedVendorLocalId) {
      setShowNoVendorWarning(true);
      return;
    }
    setShowNoVendorWarning(false);
    onNext();
  };

  // ── cost comparison ────────────────────────────────────────────────────────

  const costComparisonVendors = liveQuotations.map((q) => ({
    vendorId: q.vendorId || q.vendorName,
    vendorName: q.vendorName,
    quotedAmount: q.amount,
    isSelected:
      selectedEntry?.vendorId === q.vendorId ||
      selectedEntry?.vendorName === q.vendorName,
  }));

  const selectedVendorId = selectedEntry?.vendorId ?? "";

  return (
    <div className="space-y-4" data-testid="step2-vendor-quotes">
      {/* ── Quotation collection section ── */}
      <QuotationCollectionSection
        quotations={liveQuotations}
        requisitionId={requisition.id}
        currency={requisition.currency ?? "ZMW"}
        vendors={Array.isArray(allVendors) ? (allVendors as Vendor[]) : []}
        canEdit={true}
        onSave={handleQuotationSave}
        showVendorSelection={true}
        selectedVendorId={selectedEntry?.vendorId}
        selectedVendorAmount={data.selectedQuotedAmount}
        selectedQuotationFileId={data.selectedQuotationFileId}
        onSelectVendor={handleSelectVendorFromQuotation}
      />

      {/* ── Add New Vendor ── */}
      {!showInlineForm ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInlineForm(true)}
            data-testid="add-new-vendor-btn"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add New Vendor
          </Button>
        </div>
      ) : (
        <InlineVendorForm
          onSaved={handleNewVendorSaved}
          onCancel={() => setShowInlineForm(false)}
        />
      )}

      {/* ── Vendor dropdown fallback when no quotations ── */}
      {liveQuotations.length === 0 && (
        <SelectField
          label="Vendor (optional)"
          placeholder="No vendor — assign later"
          value={selectedVendorId}
          onValueChange={handleVendorDropdownChange}
          isLoading={vendorsLoading}
          options={(allVendors as Vendor[])
            .filter((v) => v.active)
            .map((v) => ({ value: v.id, name: v.name }))}
        />
      )}

      {/* ── Cost comparison ── */}
      {costComparisonVendors.length > 0 && (
        <CostComparisonPanel
          estimatedCost={requisition.totalAmount ?? 0}
          currency={requisition.currency ?? "ZMW"}
          vendors={costComparisonVendors}
        />
      )}

      {/* ── No vendor warning ── */}
      {showNoVendorWarning && (
        <Alert
          variant="default"
          className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
          data-testid="no-vendor-warning"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            No supplier selected. You can still proceed — the supplier can be
            assigned later.
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNoVendorWarning(false)}
              >
                Go Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  setShowNoVendorWarning(false);
                  onNext();
                }}
                data-testid="no-vendor-warning-proceed"
              >
                Proceed Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Footer ── */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto"
          data-testid="step2-back-button"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          className="w-full sm:w-auto"
          data-testid="step2-next-button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
