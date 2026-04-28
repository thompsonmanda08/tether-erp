"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

interface StatusPillProps {
  tone?: StatusTone;
  /** Show small leading dot indicator. */
  dot?: boolean;
  /** Render as outlined ghost rather than filled. Better for dense lists. */
  variant?: "soft" | "outline" | "solid";
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

const toneStyles: Record<StatusTone, Record<string, string>> = {
  neutral: {
    soft: "bg-default-100 text-default-700 dark:bg-default-200/40 dark:text-default-700",
    outline: "border border-default-300 text-default-700 bg-transparent",
    solid: "bg-default-700 text-white",
    dot: "bg-default-500",
  },
  info: {
    soft: "bg-secondary-100 text-secondary-700 dark:bg-secondary-100/30 dark:text-secondary-300",
    outline: "border border-secondary-300 text-secondary-700 bg-transparent",
    solid: "bg-secondary text-white",
    dot: "bg-secondary-500",
  },
  success: {
    soft: "bg-success-100 text-success-700 dark:bg-success-100/30 dark:text-success-300",
    outline: "border border-success-300 text-success-700 bg-transparent",
    solid: "bg-success text-white",
    dot: "bg-success-500",
  },
  warning: {
    soft: "bg-warning-100 text-warning-700 dark:bg-warning-100/30 dark:text-warning-300",
    outline: "border border-warning-300 text-warning-700 bg-transparent",
    solid: "bg-warning text-white",
    dot: "bg-warning-500",
  },
  danger: {
    soft: "bg-danger-100 text-danger-700 dark:bg-danger-100/30 dark:text-danger-300",
    outline: "border border-danger-300 text-danger-700 bg-transparent",
    solid: "bg-danger text-white",
    dot: "bg-danger-500",
  },
  accent: {
    soft: "bg-primary-100 text-primary-700 dark:bg-primary-100/30 dark:text-primary-300",
    outline: "border border-primary-300 text-primary-700 bg-transparent",
    solid: "bg-primary text-white",
    dot: "bg-primary-500",
  },
};

/**
 * Compact status indicator. Use for document statuses, priority labels,
 * row-level state. Prefer this over `Badge` / `StatusBadge` on new surfaces.
 *
 * Usage:
 *   <StatusPill tone="success" dot>Approved</StatusPill>
 *   <StatusPill tone="warning" variant="outline" size="sm">Pending</StatusPill>
 */
export function StatusPill({
  tone = "neutral",
  dot = false,
  variant = "soft",
  size = "md",
  className,
  children,
}: StatusPillProps) {
  const styles = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium leading-none whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        styles[variant],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full", styles.dot)}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Map common document statuses to tone/dot defaults so callers can pass
 * raw status strings without thinking about colors.
 */
export function documentStatusTone(status: string | undefined): StatusTone {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
    case "PAID":
    case "COMPLETED":
    case "CONFIRMED":
      return "success";
    case "REJECTED":
    case "CANCELLED":
    case "FAILED":
      return "danger";
    case "PENDING":
    case "SUBMITTED":
    case "IN_REVIEW":
    case "AWAITING_APPROVAL":
      return "warning";
    case "DRAFT":
      return "neutral";
    case "WITHDRAWN":
      return "neutral";
    default:
      return "info";
  }
}
