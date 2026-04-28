"use client";

import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { type ItemColumn } from "./types";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

interface ItemsTableProps<TItem> {
  items: TItem[];
  columns: ItemColumn<TItem>[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Generic items table for line-item rendering on document detail pages.
 * Pass a column config; rows render via each column's render(item, index).
 *
 * Replaces 4 near-identical *-items-table.tsx files.
 */
export function ItemsTable<TItem>({
  items,
  columns,
  emptyTitle = "No items",
  emptyDescription = "Items added to this document will appear here.",
  className,
}: ItemsTableProps<TItem>) {
  if (!items || items.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Package className="h-6 w-6" aria-hidden="true" />
        </EmptyMedia>
        <EmptyContent>
          <h3 className="text-base font-semibold">{emptyTitle}</h3>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              className="border-b border-divider/60 last:border-b-0 hover:bg-muted/40"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 align-top",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.render(item, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
