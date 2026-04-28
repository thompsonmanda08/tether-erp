"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataRow } from "@/components/ui/data-row";
import { StatusPill, documentStatusTone } from "@/components/ui/status-pill";
import {
  type ActionButton,
  type ActionContext,
  type MetadataField,
} from "./types";
import { type ReactNode } from "react";

interface DetailSidebarProps<TDoc extends { status?: string; documentNumber?: string }> {
  doc: TDoc;
  title?: string;
  metadataFields: MetadataField<TDoc>[];
  actions: ActionButton<TDoc>[];
  context: ActionContext;
  /** Optional bottom slot (e.g. audit summary, attachments preview). */
  footer?: ReactNode;
  className?: string;
}

const variantClass = {
  primary: "default",
  outline: "outline",
  danger: "destructive",
  warning: "outline",
} as const;

/**
 * Left rail of document detail page. Renders:
 * - doc number + status pill
 * - metadata grid (DataRows)
 * - action buttons stack
 * - optional footer slot
 *
 * Sticky on desktop (>= lg breakpoint).
 */
export function DetailSidebar<TDoc extends { status?: string; documentNumber?: string }>({
  doc,
  title,
  metadataFields,
  actions,
  context,
  footer,
  className,
}: DetailSidebarProps<TDoc>) {
  const visibleFields = metadataFields.filter((f) => {
    if (f.show && !f.show(doc)) return false;
    const v = f.value(doc);
    return v !== null && v !== undefined && v !== "";
  });

  const visibleActions = actions.filter(
    (a) => !a.condition || a.condition(doc, context),
  );

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-4 flex w-full flex-col gap-4 self-start lg:w-80 lg:flex-shrink-0",
        className,
      )}
    >
      {/* Doc identity */}
      <div className="rounded-lg border border-divider bg-content1 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Document
            </p>
            <h1 className="mt-0.5 truncate text-lg font-semibold text-foreground">
              {doc.documentNumber || "—"}
            </h1>
            {title && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {title}
              </p>
            )}
          </div>
          {doc.status && (
            <StatusPill
              tone={documentStatusTone(doc.status)}
              dot
              size="sm"
            >
              {doc.status}
            </StatusPill>
          )}
        </div>
      </div>

      {/* Metadata */}
      {visibleFields.length > 0 && (
        <div className="rounded-lg border border-divider bg-content1 px-5 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Details
          </p>
          <div className="divide-y divide-divider/60">
            {visibleFields.map((f) => (
              <DataRow
                key={f.label}
                label={
                  <span className="flex items-center gap-1.5">
                    {f.icon && <f.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {f.label}
                  </span>
                }
                value={f.value(doc)}
                copyValue={f.copyValue?.(doc)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {visibleActions.length > 0 && (
        <div className="rounded-lg border border-divider bg-content1 px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Actions
          </p>
          <div className="flex flex-col gap-2">
            {visibleActions.map((a) => (
              <Button
                key={a.id}
                onClick={() => a.onClick(doc, context)}
                isLoading={a.isLoading}
                variant={variantClass[a.variant ?? "outline"] as any}
                className={cn(
                  "w-full justify-start gap-2",
                  a.variant === "warning" &&
                    "text-warning-700 border-warning-300 hover:bg-warning-50",
                )}
              >
                {a.icon && <a.icon className="h-4 w-4" />}
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {footer}
    </aside>
  );
}
