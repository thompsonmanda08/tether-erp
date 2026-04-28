"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { type ReactNode } from "react";

export type TaskScope = "all" | "mine" | "available" | "completed";
export type TaskPriority = "all" | "HIGH" | "MEDIUM" | "LOW";
export type TaskDocType =
  | "all"
  | "REQUISITION"
  | "PURCHASE_ORDER"
  | "PAYMENT_VOUCHER"
  | "BUDGET"
  | "GRN";

const SCOPES: { value: TaskScope; label: string; count?: number }[] = [
  { value: "mine", label: "Mine" },
  { value: "available", label: "Available" },
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
];

const DOC_TYPES: { value: TaskDocType; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "REQUISITION", label: "Requisition" },
  { value: "PURCHASE_ORDER", label: "Purchase Order" },
  { value: "PAYMENT_VOUCHER", label: "Payment Voucher" },
  { value: "GRN", label: "GRN" },
  { value: "BUDGET", label: "Budget" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "all", label: "Any priority" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

interface TaskFiltersProps {
  scope: TaskScope;
  onScopeChange: (s: TaskScope) => void;
  docType: TaskDocType;
  onDocTypeChange: (d: TaskDocType) => void;
  priority: TaskPriority;
  onPriorityChange: (p: TaskPriority) => void;
  search: string;
  onSearchChange: (s: string) => void;
  scopeCounts?: Partial<Record<TaskScope, number>>;
  rightSlot?: ReactNode;
}

interface ChipProps {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}

function Chip({ active, count, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary-300 bg-primary-100 text-primary-700 dark:bg-primary-100/30 dark:text-primary-300"
          : "border-divider bg-content1 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active
              ? "bg-primary-200 text-primary-800 dark:bg-primary-200/40"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Compact filter bar for tasks page. Top row: scope chips (Mine/Available/
 * All/Completed). Bottom row: search input + doc-type + priority selects.
 */
export function TaskFilters({
  scope,
  onScopeChange,
  docType,
  onDocTypeChange,
  priority,
  onPriorityChange,
  search,
  onSearchChange,
  scopeCounts,
  rightSlot,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Scope chips */}
      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <Chip
            key={s.value}
            active={scope === s.value}
            count={scopeCounts?.[s.value]}
            onClick={() => onScopeChange(s.value)}
          >
            {s.label}
          </Chip>
        ))}
        {rightSlot && <div className="ml-auto">{rightSlot}</div>}
      </div>

      {/* Inline filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by document number, title, requester…"
            className="h-9 pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={docType}
          onChange={(e) => onDocTypeChange(e.target.value as TaskDocType)}
          className="h-9 rounded-md border border-divider bg-content1 px-3 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {DOC_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
          className="h-9 rounded-md border border-divider bg-content1 px-3 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
