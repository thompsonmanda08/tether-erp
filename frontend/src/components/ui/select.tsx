"use client";

import {
  Select as RawNextUISelect,
  SelectItem as RawNextUISelectItem,
  SelectSection as RawSelectSection,
} from "@heroui/react";

// HeroUI Select uses CollectionChildren typing; shadcn callers pass raw nodes.
// Cast to permissive at the boundary.
const NextUISelect = RawNextUISelect as any;
const NextUISelectItem = RawNextUISelectItem as any;
const SelectSection = RawSelectSection as any;
import * as React from "react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextValue>({});

// ── Root ───────────────────────────────────────────────────────────────────

function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div data-slot="select" className="w-full" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ── Group ──────────────────────────────────────────────────────────────────

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <SelectSection data-slot="select-group">{children}</SelectSection>;
}

// ── Value (compatibility shim) ─────────────────────────────────────────────

function SelectValue({ placeholder }: { placeholder?: string }) {
  return null; // NextUI handles value display internally
}

// ── Trigger (compatibility shim) ───────────────────────────────────────────

function SelectTrigger(_props: {
  className?: string;
  size?: "sm" | "default";
  /** Arbitrary HTML/ARIA passthrough kept for shadcn caller compatibility (shim is a no-op). */
  id?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}) {
  return null; // NextUI renders its own trigger
}

// ── Content (compatibility shim) ───────────────────────────────────────────

function SelectContent({
  children,
  className: _className,
  align: _align,
}: {
  children: React.ReactNode;
  /** No-op shadcn-compat (HeroUI Select renders its own listbox). */
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return <>{children}</>;
}

// ── Label ──────────────────────────────────────────────────────────────────

function SelectLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
    >
      {children}
    </div>
  );
}

// ── Item ───────────────────────────────────────────────────────────────────

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
}) {
  return (
    <NextUISelectItem
      key={value}
      data-slot="select-item"
      className={cn(className)}
      isDisabled={disabled}
      {...props}
    >
      {children as string}
    </NextUISelectItem>
  );
}

// ── Separator ──────────────────────────────────────────────────────────────

function SelectSeparator({ className }: { className?: string }) {
  return (
    <div
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
    />
  );
}

// ── Scroll buttons (no-ops in NextUI) ──────────────────────────────────────

function SelectScrollUpButton({ className }: { className?: string }) {
  return null;
}

function SelectScrollDownButton({ className }: { className?: string }) {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
