"use client";

import {
  Popover as NextUIPopover,
  PopoverTrigger as NextUIPopoverTrigger,
  PopoverContent as NextUIPopoverContent,
} from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ── Popover root ───────────────────────────────────────────────────────────

function Popover({
  children,
  open,
  onOpenChange,
  defaultOpen,
  ...props
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  /** Radix-compat (no-op under HeroUI). */
  modal?: boolean;
}) {
  return (
    <NextUIPopover
      data-slot="popover"
      isOpen={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      {...(props as any)}
    >
      {children}
    </NextUIPopover>
  );
}

// ── PopoverTrigger ─────────────────────────────────────────────────────────

function PopoverTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return (
    <NextUIPopoverTrigger data-slot="popover-trigger" {...(props as any)}>
      {children}
    </NextUIPopoverTrigger>
  );
}

// ── PopoverContent ─────────────────────────────────────────────────────────

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: {
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}) {
  return (
    <NextUIPopoverContent
      data-slot="popover-content"
      className={cn("z-50 w-72 rounded-md border p-4 shadow-md outline-none", className)}
      {...(props as any)}
    >
      {children}
    </NextUIPopoverContent>
  );
}

// ── PopoverAnchor (no-op shim) ─────────────────────────────────────────────

function PopoverAnchor({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
