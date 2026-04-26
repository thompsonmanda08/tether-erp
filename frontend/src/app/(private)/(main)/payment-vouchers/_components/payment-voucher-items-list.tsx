"use client";

import { PaymentItem } from "@/types/payment-voucher";
import { formatCurrency } from "@/lib/utils";

/**
 * Props for the PaymentVoucherItemsList component
 */
interface PaymentVoucherItemsListProps {
  /** Array of payment voucher items to display */
  items: PaymentItem[];
  /** Currency code for displaying prices (e.g., "ZMW", "USD") */
  currency: string;
  /** Total amount for the payment voucher (optional, will be calculated if not provided) */
  totalAmount?: number;
}

/**
 * Component for displaying payment voucher items in a responsive table format
 *
 * Shows description, quantity, unit price, and total price for each item.
 * Automatically calculates and displays the total amount for all items.
 * Adapts layout for mobile and desktop screens.
 *
 * @param props - Component props
 * @param props.items - Array of payment voucher items to display
 * @param props.currency - Currency code for displaying prices
 * @param props.totalAmount - Optional total amount (will be calculated if not provided)
 *
 * @example
 * ```tsx
 * <PaymentVoucherItemsList
 *   items={paymentVoucher.items}
 *   currency={paymentVoucher.currency}
 *   totalAmount={paymentVoucher.totalAmount}
 * />
 * ```
 *
 * **Validates: Requirements 19.1-19.7**
 */
export function PaymentVoucherItemsList({
  items,
  currency,
  totalAmount: providedTotal,
}: PaymentVoucherItemsListProps) {
  // Calculate total amount across all items if not provided
  const calculatedTotal = items.reduce((sum, item) => {
    return sum + (item.amount || 0);
  }, 0);

  const totalAmount = providedTotal ?? calculatedTotal;

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No items in this payment voucher
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden text-sm">
      {/* Column header */}
      <div className="hidden sm:grid grid-cols-[2rem_1fr_7rem] gap-3 px-4 py-2 bg-muted/60 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">#</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Description
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
          Amount
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {items.map((item, index) => {
          const amount = item.amount || 0;
          const description = item.description || "—";
          const glCode = item.glCode;
          const taxInfo =
            item.taxAmount && item.taxAmount > 0
              ? `Tax: ${formatCurrency(item.taxAmount, currency)}`
              : null;

          return (
            <div
              key={index}
              className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_7rem] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-muted/30 transition-colors"
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
                {(glCode || taxInfo) && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[glCode, taxInfo].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              {/* Amount */}
              <span className="font-semibold text-right tabular-nums">
                {formatCurrency(amount, currency)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2rem_1fr_7rem] items-center gap-3 px-4 py-2.5 bg-muted/40 border-t border-border">
        {/* mobile layout */}
        <div className="sm:hidden flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="sm:hidden font-bold tabular-nums text-right">
          {formatCurrency(totalAmount, currency)}
        </span>

        {/* desktop layout */}
        <span className="hidden sm:block" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs font-medium text-muted-foreground text-right uppercase tracking-wider ml-auto">
            Total
          </span>
        </div>
        <span className="hidden sm:block font-bold tabular-nums text-right">
          {formatCurrency(totalAmount, currency)}
        </span>
      </div>
    </div>
  );
}
