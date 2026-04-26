"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components";
import { QuotationCollectionSection } from "@/app/(private)/(main)/requisitions/_components/quotation-collection-section";
import type { Quotation } from "@/types/core";
import type { Vendor } from "@/types/vendor";
import type { WizardVendorEntry } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface VendorEntryRowProps {
  vendor: WizardVendorEntry;
  currency: string;
  estimatedCost: number;
  isSelected: boolean;
  onSelectAsSupplier: (localId: string) => void;
  onQuotationsChange: (localId: string, quotations: Quotation[]) => void;
  onRemove: (localId: string) => void;
  /** The full vendor list — passed through to QuotationCollectionSection */
  vendors: Vendor[];
  /** The source requisition ID — required by QuotationCollectionSection */
  requisitionId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * A single vendor card in Step 2 of the PO Creation Wizard.
 *
 * Renders the vendor name, a "Select as Supplier" button, a remove button,
 * and an embedded `QuotationCollectionSection` scoped to this vendor's
 * quotations. The `onSave` callback is in-memory — no API call is made here.
 *
 * Requirements: 3.8, 3.10
 */
export function VendorEntryRow({
  vendor,
  currency,
  isSelected,
  onSelectAsSupplier,
  onQuotationsChange,
  onRemove,
  vendors,
  requisitionId,
}: VendorEntryRowProps) {
  // Local loading state for the in-memory onSave (always resolves instantly,
  // but QuotationCollectionSection expects a Promise<void>).
  const [saving, setSaving] = useState(false);

  // In-memory onSave: update the wizard state instead of calling an API.
  const handleSave = useCallback(
    async (updatedQuotations: Quotation[]) => {
      setSaving(true);
      try {
        onQuotationsChange(vendor.localId, updatedQuotations);
      } finally {
        setSaving(false);
      }
    },
    [vendor.localId, onQuotationsChange],
  );

  return (
    <Card
      className={isSelected ? "border-primary ring-1 ring-primary" : undefined}
      data-testid={`vendor-entry-row-${vendor.localId}`}
    >
      {/* ── Header: vendor name + actions ── */}
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className="font-medium truncate"
            data-testid={`vendor-entry-name-${vendor.localId}`}
          >
            {vendor.vendorName}
          </span>
          {isSelected && (
            <Badge
              variant="default"
              className="shrink-0 gap-1"
              data-testid={`vendor-entry-selected-badge-${vendor.localId}`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Selected Supplier
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Select as Supplier */}
          {!isSelected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectAsSupplier(vendor.localId)}
              data-testid={`vendor-entry-select-btn-${vendor.localId}`}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Select as Supplier
            </Button>
          )}

          {/* Remove */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(vendor.localId)}
            data-testid={`vendor-entry-remove-btn-${vendor.localId}`}
            aria-label={`Remove ${vendor.vendorName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* ── Body: embedded quotation section ── */}
      <CardContent className="pt-0">
        <QuotationCollectionSection
          quotations={vendor.quotations}
          requisitionId={requisitionId}
          currency={currency}
          vendors={vendors}
          canEdit={true}
          onSave={handleSave}
          showVendorSelection={false}
        />
      </CardContent>
    </Card>
  );
}
