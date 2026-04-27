"use client";

import { PaymentVoucher } from "@/types/payment-voucher";
import { Badge } from "@/components/ui/badge";
import { Package, CreditCard } from "lucide-react";

/**
 * Props for the ProcurementFlowIndicator component
 */
interface ProcurementFlowIndicatorProps {
  /** The payment voucher to display flow indicator for */
  paymentVoucher: PaymentVoucher;
}

/**
 * Helper function to determine procurement flow type
 *
 * Checks the explicit procurementFlow field first, then falls back to
 * detecting from linkedGRN presence.
 *
 * @param pv - Payment voucher to check
 * @returns "goods_first" or "payment_first"
 *
 * **Validates: Requirements 17.3, 17.4, 17.5**
 */
export function getProcurementFlow(
  pv: PaymentVoucher,
): "goods_first" | "payment_first" {
  // Check explicit procurementFlow field first
  if (pv.procurementFlow) {
    return pv.procurementFlow as "goods_first" | "payment_first";
  }

  // Fallback: detect from linkedGRN presence
  return pv.linkedGRN ? "goods_first" : "payment_first";
}

/**
 * Component for displaying procurement flow type indicator
 *
 * Shows a badge indicating whether the payment voucher follows a goods-first
 * or payment-first procurement flow, with descriptive text explaining the flow.
 *
 * - Goods-first flow: Goods are received before payment (Req → PO → GRN → PV)
 * - Payment-first flow: Payment is made before goods receipt (Req → PO → PV → GRN)
 *
 * @param props - Component props
 * @param props.paymentVoucher - The payment voucher to display flow indicator for
 *
 * @example
 * ```tsx
 * <ProcurementFlowIndicator paymentVoucher={paymentVoucher} />
 * ```
 *
 * **Validates: Requirements 8.4, 17.3, 17.4, 17.5**
 */
export function ProcurementFlowIndicator({
  paymentVoucher,
}: ProcurementFlowIndicatorProps) {
  const flow = getProcurementFlow(paymentVoucher);
  const isGoodsFirst = flow === "goods_first";

  const label = isGoodsFirst ? "Goods-First Flow" : "Payment-First Flow";
  const description = isGoodsFirst
    ? "Payment made after goods receipt"
    : "Payment made before goods receipt";
  const Icon = isGoodsFirst ? Package : CreditCard;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge
        variant={isGoodsFirst ? "default" : "secondary"}
        className="flex items-center gap-1.5"
      >
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      <span className="text-muted-foreground">{description}</span>
    </div>
  );
}
