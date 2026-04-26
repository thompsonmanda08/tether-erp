"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePurchaseOrder } from "@/app/_actions/purchase-orders";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import type { POItem } from "@/types/purchase-order";

interface POItemsEditorProps {
  poId: string;
  items: POItem[];
  currency: string;
  onSaved: (updatedItems: POItem[]) => void;
  onCancel: () => void;
}

function newItem(): POItem {
  return {
    id: Date.now().toString(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  };
}

/**
 * Inline item editor for PO detail page.
 * Matches the exact UI pattern from create-requisition-dialog.tsx.
 * On save, calls updatePurchaseOrder — the backend automatically records
 * a full audit snapshot with old/new item values.
 */
export function POItemsEditor({
  poId,
  items: initialItems,
  currency,
  onSaved,
  onCancel,
}: POItemsEditorProps) {
  const [items, setItems] = useState<POItem[]>(
    initialItems.length > 0
      ? initialItems.map((i) => ({ ...i, id: i.id || Date.now().toString() }))
      : [newItem()],
  );
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  // ── item mutations ─────────────────────────────────────────────────────────

  const handleAddItem = () => {
    setItems((prev) => [...prev, newItem()]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = useCallback(
    (id: string, field: keyof POItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.amount = updated.quantity * updated.unitPrice;
            updated.totalPrice = updated.amount;
          }
          return updated;
        }),
      );
    },
    [],
  );

  // ── save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const invalid = items.some((i) => !i.description.trim() || i.quantity <= 0);
    if (invalid) {
      toast.error("All items need a description and quantity > 0");
      return;
    }

    const finalItems = items.map((i) => ({
      ...i,
      amount: i.quantity * i.unitPrice,
      totalPrice: i.quantity * i.unitPrice,
    }));
    const total = finalItems.reduce((s, i) => s + i.amount, 0);

    setSaving(true);
    try {
      const result = await updatePurchaseOrder({
        poId,
        purchaseOrderId: poId,
        items: finalItems,
        totalAmount: total,
      });
      if (!result.success) throw new Error(result.message || "Failed to save");

      // Refetch immediately so the header total updates without waiting
      await queryClient.refetchQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.BY_ID, poId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit-events", "purchase_order", poId],
      });
      toast.success("Items updated");
      onSaved(finalItems);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save items");
    } finally {
      setSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Column headers — exact match to REQ dialog */}
        <div className="grid grid-cols-[1.75rem_1fr_3.5rem_8rem_6.5rem_1.75rem] gap-x-3 px-3 py-2 bg-muted/60 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">#</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Description
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
            Qty
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
            Unit Price ({currency})
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
            Total
          </span>
          <span />
        </div>

        {/* Item rows */}
        <div className="divide-y divide-border/60">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.75rem_1fr_3.5rem_8rem_6.5rem_1.75rem] gap-x-3 px-3 py-2 items-center hover:bg-muted/20 transition-colors"
            >
              {/* # */}
              <span className="text-xs text-muted-foreground/50 font-mono tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Description */}
              <input
                className="min-w-0 w-full bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 border border-transparent focus:border-border transition-colors"
                placeholder="Item description…"
                value={item.description}
                onChange={(e) =>
                  handleUpdateItem(item.id!, "description", e.target.value)
                }
              />

              {/* Qty */}
              <input
                type="number"
                min="1"
                className="w-full bg-transparent text-sm text-center tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1 py-1 border border-transparent focus:border-border transition-colors"
                value={item.quantity}
                onChange={(e) =>
                  handleUpdateItem(
                    item.id!,
                    "quantity",
                    parseInt(e.target.value) || 1,
                  )
                }
              />

              {/* Unit price */}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-transparent text-sm text-right tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1.5 py-1 border border-transparent focus:border-border transition-colors"
                value={item.unitPrice || ""}
                onChange={(e) =>
                  handleUpdateItem(
                    item.id!,
                    "unitPrice",
                    parseFloat(e.target.value) || 0,
                  )
                }
              />

              {/* Line total */}
              <span className="text-sm font-semibold text-right tabular-nums">
                {(item.quantity * item.unitPrice).toLocaleString("en-ZM", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id!)}
                className="text-muted-foreground/30 hover:text-red-500 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add item row */}
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      </div>

      {/* Summary — gradient footer matching REQ dialog */}
      {items.length > 0 && (
        <div className="gradient-primary rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Total Amount</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {currency}{" "}
              {totalAmount.toLocaleString("en-ZM", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          Save Items
        </Button>
      </div>
    </div>
  );
}
