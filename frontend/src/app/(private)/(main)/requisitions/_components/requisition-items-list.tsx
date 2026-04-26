"use client";

interface RequisitionItem {
  id?: string;
  description?: string;
  itemDescription?: string;
  quantity: number;
  unitPrice?: number;
  estimatedCost?: number;
  amount?: number;
  totalPrice?: number;
  unit?: string;
  category?: string;
  notes?: string;
}

interface RequisitionItemsListProps {
  items: RequisitionItem[];
  currency: string;
  isEstimate?: boolean;
}

export function RequisitionItemsList({
  items,
  currency,
  isEstimate,
}: RequisitionItemsListProps) {
  const totalAmount = items.reduce((sum, item) => {
    const line =
      item.amount ||
      item.totalPrice ||
      item.quantity * (item.unitPrice || item.estimatedCost || 0);
    return sum + line;
  }, 0);

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
          const unitPrice = item.unitPrice || item.estimatedCost || 0;
          const lineTotal =
            item.amount ||
            item.totalPrice ||
            item.quantity * unitPrice;
          const description =
            item.description || item.itemDescription || "—";
          const meta = [item.category, item.notes]
            .filter(Boolean)
            .join(" · ");

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
                  {item.unit ? ` ${item.unit}` : ""} ×{" "}
                  {currency} {fmt(unitPrice)}
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
          {isEstimate && (
            <span className="text-xs text-amber-600 font-medium">
              Estimated
            </span>
          )}
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
          {isEstimate && (
            <span className="text-xs text-amber-600 font-medium">
              · Estimated costs
            </span>
          )}
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
