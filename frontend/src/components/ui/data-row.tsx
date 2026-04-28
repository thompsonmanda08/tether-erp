"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

interface DataRowProps {
  label: ReactNode;
  value: ReactNode;
  /**
   * If a string is provided, shows a copy-to-clipboard button when hovered.
   * Useful for IDs, document numbers, emails.
   */
  copyValue?: string;
  /**
   * Layout direction.
   * `inline` (default) — label left, value right (best for sidebar metadata).
   * `stacked` — label above value (best for dense card content).
   */
  orientation?: "inline" | "stacked";
  className?: string;
}

/**
 * Single key/value row used on document detail sidebars and metadata
 * panels. Replaces ad-hoc `<div className="flex justify-between">` patterns.
 */
export function DataRow({
  label,
  value,
  copyValue,
  orientation = "inline",
  className,
}: DataRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be unavailable in non-secure contexts
    }
  };

  if (orientation === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span className="min-w-0 truncate">{value}</span>
          {copyValue && (
            <CopyButton copied={copied} onClick={handleCopy} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 py-1.5 text-sm",
        className,
      )}
    >
      <span className="flex-shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate text-right font-medium text-foreground">
          {value}
        </span>
        {copyValue && (
          <CopyButton
            copied={copied}
            onClick={handleCopy}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>
    </div>
  );
}

function CopyButton({
  copied,
  onClick,
  className,
}: {
  copied: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3 w-3 text-success-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
