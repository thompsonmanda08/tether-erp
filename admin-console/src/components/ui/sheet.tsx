"use client";

import * as React from "react";
import { Drawer, DrawerContent, DrawerHeader as NextUIDrawerHeader, DrawerBody, DrawerFooter as NextUIDrawerFooter } from "@heroui/react";
import { cn } from "@/lib/utils";

function Sheet({ open, onOpenChange, children, ...props }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  return <Drawer data-slot="sheet" isOpen={open} onOpenChange={onOpenChange} {...(props as any)}>{children}</Drawer>;
}

function SheetTrigger({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function SheetClose({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function SheetPortal({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function SheetOverlay({ className }: { className?: string }) { return null; }

function SheetContent({ className, children, side = "right", ...props }: React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "right" | "bottom" | "left" }) {
  return <DrawerContent data-slot="sheet-content" className={cn(className)} {...(props as any)}>{(onClose) => <>{children}</>}</DrawerContent>;
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <NextUIDrawerHeader data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...(props as any)} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <NextUIDrawerFooter data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2", className)} {...(props as any)} />;
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-slot="sheet-title" className={cn("text-foreground font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="sheet-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
