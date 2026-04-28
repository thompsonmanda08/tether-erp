"use client";

import { cn } from "@/lib/utils";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal title (e.g. "New Requisition", "Create Payment Voucher"). */
  title: string;
  /** Optional subtitle / context line under title. */
  subtitle?: string;
  /** Optional leading icon next to title. */
  icon?: LucideIcon;
  /** Body content — typically a form. */
  children: ReactNode;
  /** Submit button label. Defaults to "Create". */
  submitLabel?: string;
  /** Submit handler — called only when validation passes. */
  onSubmit: () => void | Promise<void>;
  /** Disable submit (e.g. invalid form state). */
  canSubmit?: boolean;
  /** Inflight indicator. */
  isSubmitting?: boolean;
  /** Top-level error message; renders banner above body. */
  error?: string | null;
  /** Modal width preset. */
  size?: "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Extra footer content rendered before Cancel/Submit (e.g. progress dots). */
  footerLeft?: ReactNode;
  /** Hide footer entirely (use when wizard manages its own footer). */
  hideFooter?: boolean;
  /** Additional body className. */
  bodyClassName?: string;
}

/**
 * Consistent shell for all document creation dialogs. Provides:
 * - Branded header (icon + title + subtitle + close button)
 * - Top-level error banner slot
 * - Scrollable body with consistent padding
 * - Sticky footer with Cancel + Submit (or hidden for wizards)
 *
 * Adopt incrementally — existing dialogs can keep their forms and just
 * swap their HeroUI Modal+ModalContent boilerplate for this shell.
 */
export function CreateDocumentDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon: Icon,
  children,
  submitLabel = "Create",
  onSubmit,
  canSubmit = true,
  isSubmitting = false,
  error,
  size = "2xl",
  footerLeft,
  hideFooter = false,
  bodyClassName,
}: CreateDocumentDialogProps) {
  return (
    <Modal
      isOpen={open}
      onOpenChange={onOpenChange}
      size={size}
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent>
        <ModalHeader className="flex items-start justify-between gap-3 border-b border-divider px-6 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div className="rounded-md bg-primary-100 p-2 text-primary-700 dark:bg-primary-100/30 dark:text-primary-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            aria-label="Close"
            className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </ModalHeader>

        <ModalBody className={cn("space-y-4 px-6 py-5", bodyClassName)}>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-300/40 dark:bg-danger-100/20 dark:text-danger-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {children}
        </ModalBody>

        {!hideFooter && (
          <ModalFooter className="flex items-center justify-between gap-2 border-t border-divider px-6 py-3">
            <div>{footerLeft}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="light"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                isLoading={isSubmitting}
                onClick={onSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {submitLabel}
              </Button>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
