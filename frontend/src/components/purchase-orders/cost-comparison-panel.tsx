import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  computeVariance,
  varianceColorClass,
} from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";

interface CostComparisonPanelProps {
  estimatedCost: number;
  currency: string;
  vendors: Array<{
    vendorId: string;
    vendorName: string;
    quotedAmount?: number; // undefined = no quotation yet
    isSelected?: boolean;
  }>;
}

export function CostComparisonPanel({
  estimatedCost,
  currency,
  vendors,
}: CostComparisonPanelProps) {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-3">
      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
        Cost Comparison
      </h4>
      <Table>
        <TableHeader>
          <TableRow className="border-blue-200 dark:border-blue-800">
            <TableHead className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
              Vendor
            </TableHead>
            <TableHead className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
              Estimated Cost (from REQ)
            </TableHead>
            <TableHead className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
              Vendor Quoted Price
            </TableHead>
            <TableHead className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
              Variance
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => {
            const hasQuote = vendor.quotedAmount !== undefined;
            const variance = hasQuote
              ? computeVariance(estimatedCost, vendor.quotedAmount!)
              : null;
            const colorClass = variance
              ? varianceColorClass(variance.absolute, variance.percentage)
              : "";
            const isUnder = variance ? variance.absolute < 0 : false;
            const isOver = variance ? variance.absolute > 0 : false;
            const VarianceIcon = isUnder
              ? TrendingDown
              : isOver
                ? TrendingUp
                : Minus;

            return (
              <TableRow
                key={vendor.vendorId}
                className={cn(
                  "border-blue-200 dark:border-blue-800",
                  vendor.isSelected &&
                    "bg-blue-100/60 dark:bg-blue-900/30 font-medium",
                )}
              >
                <TableCell className="text-blue-900 dark:text-blue-100 text-sm">
                  {vendor.vendorName}
                  {vendor.isSelected && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">
                      (selected)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-blue-900 dark:text-blue-100 text-sm font-medium">
                  {formatCurrency(estimatedCost, currency)}
                </TableCell>
                <TableCell className="text-blue-900 dark:text-blue-100 text-sm">
                  {hasQuote
                    ? formatCurrency(vendor.quotedAmount!, currency)
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {variance ? (
                    <span
                      className={cn(
                        "flex items-center gap-1 font-medium",
                        colorClass,
                      )}
                    >
                      <VarianceIcon className="h-3.5 w-3.5 shrink-0" />
                      {isUnder ? "−" : isOver ? "+" : ""}
                      {formatCurrency(Math.abs(variance.absolute), currency)}
                      <span className="font-normal text-xs">
                        ({isUnder ? "−" : isOver ? "+" : ""}
                        {Math.abs(variance.percentage).toFixed(1)}%)
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
