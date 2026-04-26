"use client";

import { Select as NextUISelect, SelectItem as NextUISelectItem, SelectSection } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

type SelectContextValue = { value?: string; onValueChange?: (value: string) => void };
const SelectContext = React.createContext<SelectContextValue>({});

function Select({ children, value, defaultValue, onValueChange, disabled, ...props }: { children: React.ReactNode; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; disabled?: boolean }) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div data-slot="select" className="w-full" {...props}>{children}</div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <SelectSection data-slot="select-group">{children}</SelectSection>;
}

function SelectValue({ placeholder }: { placeholder?: string }) { return null; }
function SelectTrigger({ className, size = "default", children }: { className?: string; size?: "sm" | "default"; children?: React.ReactNode }) { return null; }
function SelectContent({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function SelectLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div data-slot="select-label" className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}>{children}</div>;
}

function SelectItem({ className, children, value, disabled, ...props }: { className?: string; children: React.ReactNode; value: string; disabled?: boolean }) {
  return <NextUISelectItem key={value} data-slot="select-item" className={cn(className)} isDisabled={disabled} {...props}>{children as string}</NextUISelectItem>;
}

function SelectSeparator({ className }: { className?: string }) {
  return <div data-slot="select-separator" className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)} />;
}

function SelectScrollUpButton({ className }: { className?: string }) { return null; }
function SelectScrollDownButton({ className }: { className?: string }) { return null; }

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
