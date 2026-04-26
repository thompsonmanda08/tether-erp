"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Context ────────────────────────────────────────────────────────────────

type ToggleGroupContextValue = {
  value: string | string[];
  onValueChange?: (value: string) => void;
  type: "single" | "multiple";
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  value: "",
  type: "single",
});

// ── ToggleGroup root ───────────────────────────────────────────────────────

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: "single" | "multiple";
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: string) => void;
  }
>(({ className, type = "single", value = "", onValueChange, children, ...props }, ref) => (
  <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  </ToggleGroupContext.Provider>
));

ToggleGroup.displayName = "ToggleGroup";

// ── ToggleGroupItem ────────────────────────────────────────────────────────

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(ToggleGroupContext);
  const isActive = Array.isArray(ctx.value)
    ? ctx.value.includes(value)
    : ctx.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isActive}
      data-state={isActive ? "on" : "off"}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium",
        "ring-offset-background transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
