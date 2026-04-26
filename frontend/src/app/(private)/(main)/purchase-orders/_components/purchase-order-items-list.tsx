"use client";

import { POItem } from "@/types/purchase-order";

/**
 * Props for the PurchaseOrderItemsList component
 */
interface PurchaseOrderItemsListProps {
  /** Array of purchase order items to display */
  items: POItem[];
  /** Currency code for displaying prices (e.g., "ZMW", "USD") */
  currency: string;
}

/**
 * Component for displaying purchase order items in a responsive table format
 *
 * Shows description, quantity, unit price, and total price for each item.
 * Automatically calculates and displays the total amount for all items.
 * Adapts layout for mobile and desktop screens.
 *
 * @param props - Component props
 * @param props.items - Array of purchase order items to display
 * @param props.currency - Currency code for displaying prices
 *
 * @example
 * ```tsx
 * <PurchaseOrderItemsList
 *   items={purchaseOrder.items}
 *   currency={purchaseOrder.currency}
 * />
 * ```
 *
 * **Validates: Requirements 6.3**
 */
export function PurchaseOrderItemsList({
  items,
  currency,
}: PurchaseOrderItemsListProps) {
  // Calculate total amount across all items
  const totalAmount = items.reduce((sum, item) => {
    const lineTotal =
      item.totalPrice || item.amount || item.quantity * item.unitPrice;
    return sum + lineTotal;
  }, 0);

  // Format number with locale-specific formatting (2 decimal places)
  const fmt = (n: number) =>
    n.toLocaleString("en-ZM", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="rounded-lg border border-border overflow-hidden text-sm">
      {/* Column header */}
      <div className="hidden sm:grid grid-cols-[2rem_1fr_3.5rem_7rem_7rem] gap-3 px-4 py-2 bg-muted/60 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">#</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Description
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
          Qty
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
          Unit Price
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
          Total
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {items.map((item, index) => {
          const unitPrice = item.unitPrice || 0;
          const lineTotal =
            item.totalPrice || item.amount || item.quantity * unitPrice;
          const description = item.description || "—";
          const meta = [item.category, item.notes].filter(Boolean).join(" · ");

          return (
            <div
              key={item.id || index}
              className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_3.5rem_7rem_7rem] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              {/* # */}
              <span className="text-xs text-muted-foreground/60 font-mono tabular-nums self-start pt-0.5">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Description + optional meta */}
              <div className="min-w-0">
                <p className="font-medium leading-snug truncate">
                  {description}
                </p>
                {meta && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {meta}
                  </p>
                )}
                {/* Mobile: qty + unit price under description */}
                <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""} × {currency}{" "}
                  {fmt(unitPrice)}
                </p>
              </div>

              {/* Total (mobile — shown inline) */}
              <span className="font-semibold text-right sm:hidden tabular-nums">
                {currency} {fmt(lineTotal)}
              </span>

              {/* Qty — desktop */}
              <span className="hidden sm:block text-center text-muted-foreground tabular-nums">
                {item.quantity}
                {item.unit ? (
                  <span className="text-xs ml-0.5">{item.unit}</span>
                ) : null}
              </span>

              {/* Unit price — desktop */}
              <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                {currency} {fmt(unitPrice)}
              </span>

              {/* Line total — desktop */}
              <span className="hidden sm:block text-right font-semibold tabular-nums">
                {currency} {fmt(lineTotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2rem_1fr_3.5rem_7rem_7rem] items-center gap-3 px-4 py-2.5 bg-muted/40 border-t border-border">
        {/* mobile layout */}
        <div className="sm:hidden flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="sm:hidden font-bold tabular-nums text-right">
          {currency} {fmt(totalAmount)}
        </span>

        {/* desktop layout */}
        <span className="hidden sm:block" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="hidden sm:block" />
        <span className="hidden sm:block text-xs font-medium text-muted-foreground text-right uppercase tracking-wider">
          Total
        </span>
        <span className="hidden sm:block font-bold tabular-nums text-right">
          {currency} {fmt(totalAmount)}
        </span>
      </div>
    </div>
  );
}
