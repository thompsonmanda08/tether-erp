"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CollapsibleCtx = { open: boolean; setOpen: (open: boolean) => void };
const CollapsibleContext = React.createContext<CollapsibleCtx>({ open: false, setOpen: () => {} });

function Collapsible({ open: controlledOpen, defaultOpen = false, onOpenChange, children, className, disabled, ...props }: { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (val: boolean) => { if (disabled) return; setInternalOpen(val); onOpenChange?.(val); };
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div data-slot="collapsible" data-state={open ? "open" : "closed"} className={cn(className)} {...props}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({ children, className, asChild, ...props }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen } = React.useContext(CollapsibleContext);
  return <button type="button" data-slot="collapsible-trigger" data-state={open ? "open" : "closed"} onClick={() => setOpen(!open)} className={cn(className)} {...props}>{children}</button>;
}

function CollapsibleContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(CollapsibleContext);
  if (!open) return null;
  return <div data-slot="collapsible-content" data-state={open ? "open" : "closed"} className={cn(className)} {...props}>{children}</div>;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
