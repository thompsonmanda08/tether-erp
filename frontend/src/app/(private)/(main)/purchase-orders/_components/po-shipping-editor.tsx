"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Truck } from "lucide-react";
import { updatePurchaseOrder } from "@/app/_actions/purchase-orders";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import type { PurchaseOrder } from "@/types/purchase-order";
import { formatCurrency } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShippingMetadata {
  receiverName?: string;
  receiverAddress?: string;
  receiverContact?: string;
  receiverEmail?: string;
  /** Tax rate as a percentage e.g. 16 means 16% */
  taxRate?: number;
  /** Flat delivery cost */
  deliveryCost?: number;
  /** Purchase type label e.g. "SERVICE OR GOODS" */
  purchaseType?: string;
  /** Fund source label e.g. "CDF 2026 BUDGET" */
  fundSource?: string;
}

interface POShippingEditorProps {
  poId: string;
  purchaseOrder: PurchaseOrder;
  canEdit: boolean;
  onSaved: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Inline editor for PO shipping / delivery metadata.
 *
 * Reads initial values from:
 *   1. purchaseOrder.metadata (previously saved)
 *   2. The linked requisition's requestedFor / requester fields (pre-populated)
 *
 * All fields are optional. Tax and delivery cost are used by the PDF to
 * compute the totals breakdown. They only appear in the PDF when provided.
 */
export function POShippingEditor({
  poId,
  purchaseOrder,
  canEdit,
  onSaved,
}: POShippingEditorProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Seed from existing metadata, falling back to REQ-derived fields
  const meta = (purchaseOrder.metadata ?? {}) as Record<string, unknown>;

  const [receiverName, setReceiverName] = useState<string>(
    (meta.receiverName as string) ?? purchaseOrder.requestedByName ?? "",
  );
  const [receiverAddress, setReceiverAddress] = useState<string>(
    (meta.receiverAddress as string) ?? "",
  );
  const [receiverContact, setReceiverContact] = useState<string>(
    (meta.receiverContact as string) ?? "",
  );
  const [receiverEmail, setReceiverEmail] = useState<string>(
    (meta.receiverEmail as string) ?? "",
  );
  const [department, setDepartment] = useState<string>(
    (meta.receiverDept as string) ?? purchaseOrder.department ?? "",
  );
  const [taxRate, setTaxRate] = useState<string>(num(meta.taxRate));
  const [deliveryCost, setDeliveryCost] = useState<string>(
    num(meta.deliveryCost),
  );
  const [purchaseType, setPurchaseType] = useState<string>(
    (meta.purchaseType as string) ?? "",
  );
  const [fundSource, setFundSource] = useState<string>(
    (meta.fundSource as string) ??
      purchaseOrder.costCenter ??
      purchaseOrder.budgetCode ??
      "",
  );

  // Re-seed if the PO reloads (e.g. after another save)
  useEffect(() => {
    const m = (purchaseOrder.metadata ?? {}) as Record<string, unknown>;
    setReceiverName(
      (m.receiverName as string) ?? purchaseOrder.requestedByName ?? "",
    );
    setReceiverAddress((m.receiverAddress as string) ?? "");
    setReceiverContact((m.receiverContact as string) ?? "");
    setReceiverEmail((m.receiverEmail as string) ?? "");
    setDepartment((m.receiverDept as string) ?? purchaseOrder.department ?? "");
    setTaxRate(num(m.taxRate));
    setDeliveryCost(num(m.deliveryCost));
    setPurchaseType((m.purchaseType as string) ?? "");
    setFundSource(
      (m.fundSource as string) ??
        purchaseOrder.costCenter ??
        purchaseOrder.budgetCode ??
        "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrder.id]);

  // ── Derived totals (live preview) ──────────────────────────────────────────
  const subtotal = purchaseOrder.totalAmount ?? 0;
  const taxAmt = taxRate ? (subtotal * parseFloat(taxRate)) / 100 : 0;
  const delCost = deliveryCost ? parseFloat(deliveryCost) : 0;
  const grandTotal = subtotal + taxAmt + delCost;

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Spread ALL existing metadata keys first (preserves quotations,
      // attachments, selectedQuotationFileUrl, etc.), then overlay new values.
      const updatedMeta: Record<string, unknown> = {
        ...meta,
        // Only persist non-empty values
        ...(receiverName.trim() && { receiverName: receiverName.trim() }),
        ...(receiverAddress.trim() && {
          receiverAddress: receiverAddress.trim(),
        }),
        ...(receiverContact.trim() && {
          receiverContact: receiverContact.trim(),
        }),
        ...(receiverEmail.trim() && { receiverEmail: receiverEmail.trim() }),
        ...(department.trim() && { receiverDept: department.trim() }),
        ...(taxRate && { taxRate: parseFloat(taxRate) }),
        ...(deliveryCost && { deliveryCost: parseFloat(deliveryCost) }),
        ...(purchaseType.trim() && { purchaseType: purchaseType.trim() }),
        ...(fundSource.trim() && { fundSource: fundSource.trim() }),
      };

      const result = await updatePurchaseOrder({
        poId,
        purchaseOrderId: poId,
        metadata: updatedMeta,
      });

      if (!result.success) throw new Error(result.message || "Failed to save");

      await queryClient.refetchQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, poId],
      });
      toast.success("Shipping details saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Shipping / Receiver ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Shipping To</h3>
          <span className="text-xs text-muted-foreground">
            (pre-filled from requisition — edit as needed)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ">
          <Input
            id="receiverName"
            label="Receiver Name"
            placeholder="e.g. Bob W Simasiku"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            disabled={!canEdit}
          />
          <Input
            id="department"
            label="Department"
            placeholder="e.g. Stores"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!canEdit}
          />

          <Input
            label="Address"
            id="receiverAddress"
            placeholder="e.g. Ke Agency, 33 NAPSA Building, Mongu"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            disabled={!canEdit}
          />

          <Input
            id="receiverContact"
            label="Contact / Phone"
            placeholder="e.g. 0974291023"
            value={receiverContact}
            onChange={(e) => setReceiverContact(e.target.value)}
            disabled={!canEdit}
          />

          <Input
            id="receiverEmail"
            label="Email Address"
            type="email"
            placeholder="e.g. simasiku@mail.com"
            value={receiverEmail}
            onChange={(e) => setReceiverEmail(e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* ── Document Classification ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Document Classification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="purchaseType"
            label="Purchase Type"
            placeholder="e.g. SERVICE OR GOODS"
            value={purchaseType}
            onChange={(e) => setPurchaseType(e.target.value)}
            disabled={!canEdit}
          />

          <Input
            id="fundSource"
            label="Fund Source"
            placeholder="e.g. CDF 2026 BUDGET"
            value={fundSource}
            onChange={(e) => setFundSource(e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* ── Tax & Delivery ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">
          Tax &amp; Delivery{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional — shown on PDF when provided)
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Input
              id="taxRate"
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 16"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={!canEdit}
              descriptionText={
                taxRate &&
                `  Tax amount: ${formatCurrency(taxAmt, purchaseOrder.currency)}`
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryCost">
              Delivery Cost ({purchaseOrder.currency})
            </Label>
            <Input
              id="deliveryCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500"
              value={deliveryCost}
              onChange={(e) => setDeliveryCost(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Live totals preview */}
        {(taxRate || deliveryCost) && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Sub Total</span>
              <span className="font-medium">
                {formatCurrency(subtotal, purchaseOrder.currency)}
              </span>
            </div>
            {taxRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-medium">
                  {formatCurrency(taxAmt, purchaseOrder.currency)}
                </span>
              </div>
            )}
            {deliveryCost && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Cost</span>
                <span className="font-medium">
                  {formatCurrency(delCost, purchaseOrder.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <span>Total Order Value</span>
              <span className="text-green-700 dark:text-green-400">
                {formatCurrency(grandTotal, purchaseOrder.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Save ── */}
      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            isLoading={saving}
            loadingText="Saving..."
          >
            <Save className="h-4 w-4" />
            Save Details
          </Button>
        </div>
      )}
    </div>
  );
}
