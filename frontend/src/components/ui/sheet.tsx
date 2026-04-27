"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader as NextUIDrawerHeader,
  DrawerBody,
  DrawerFooter as NextUIDrawerFooter,
} from "@heroui/react";
import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

const sideToPlacement: Record<SheetSide, "top" | "right" | "bottom" | "left"> = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
};

// ── Sheet root ─────────────────────────────────────────────────────────────

function Sheet({
  open,
  onOpenChange,
  children,
  ...props
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer
      data-slot="sheet"
      isOpen={open}
      onOpenChange={onOpenChange}
      {...(props as any)}
    >
      {children}
    </Drawer>
  );
}

// ── Trigger (shim) ─────────────────────────────────────────────────────────

function SheetTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Close (shim) ───────────────────────────────────────────────────────────

function SheetClose({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Portal (no-op) ─────────────────────────────────────────────────────────

function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Overlay (handled by Drawer) ────────────────────────────────────────────

function SheetOverlay({ className }: { className?: string }) {
  return null;
}

// ── Content ────────────────────────────────────────────────────────────────

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: SheetSide }) {
  return (
    <DrawerContent
      data-slot="sheet-content"
      className={cn(className)}
      {...(props as any)}
    >
      {(onClose) => <>{children}</>}
    </DrawerContent>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <NextUIDrawerHeader
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...(props as any)}
    />
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <NextUIDrawerFooter
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...(props as any)}
    />
  );
}

// ── Title ──────────────────────────────────────────────────────────────────

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

// ── Description ────────────────────────────────────────────────────────────

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
