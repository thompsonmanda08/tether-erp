"use client";

import {
  Table as NextUITable,
  TableHeader as NextUITableHeader,
  TableColumn,
  TableBody as NextUITableBody,
  TableRow as NextUITableRow,
  TableCell as NextUITableCell,
} from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ── Table root ─────────────────────────────────────────────────────────────

function Table({ className, children, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <NextUITable
        data-slot="table"
        removeWrapper
        className={cn("w-full caption-bottom text-sm", className)}
        {...(props as any)}
      >
        {children as any}
      </NextUITable>
    </div>
  );
}

// ── TableHeader ────────────────────────────────────────────────────────────

function TableHeader({ className, children, ...props }: React.ComponentProps<"thead">) {
  return (
    <NextUITableHeader
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...(props as any)}
    >
      {children as any}
    </NextUITableHeader>
  );
}

// ── TableBody ──────────────────────────────────────────────────────────────

function TableBody({ className, children, ...props }: React.ComponentProps<"tbody">) {
  return (
    <NextUITableBody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...(props as any)}
    >
      {children as any}
    </NextUITableBody>
  );
}

// ── TableFooter ────────────────────────────────────────────────────────────

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

// ── TableRow ───────────────────────────────────────────────────────────────

function TableRow({ className, children, ...props }: React.ComponentProps<"tr">) {
  return (
    <NextUITableRow
      data-slot="table-row"
      className={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)}
      {...(props as any)}
    >
      {children as any}
    </NextUITableRow>
  );
}

// ── TableHead ──────────────────────────────────────────────────────────────

function TableHead({ className, children, ...props }: React.ComponentProps<"th">) {
  return (
    <TableColumn
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
        className
      )}
      {...(props as any)}
    >
      {children as any}
    </TableColumn>
  );
}

// ── TableCell ──────────────────────────────────────────────────────────────

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <NextUITableCell
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap", className)}
      {...(props as any)}
    />
  );
}

// ── TableCaption ───────────────────────────────────────────────────────────

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
