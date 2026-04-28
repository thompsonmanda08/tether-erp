"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── AlertDialog root ───────────────────────────────────────────────────────

function AlertDialog({
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
    <Modal
      data-slot="alert-dialog"
      isOpen={open}
      onOpenChange={onOpenChange}
      {...(props as any)}
    >
      {children}
    </Modal>
  );
}

// ── Trigger (compatibility shim) ───────────────────────────────────────────

function AlertDialogTrigger({
  children,
  asChild: _asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

// ── Portal (no-op) ─────────────────────────────────────────────────────────

function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Overlay (handled by Modal) ─────────────────────────────────────────────

function AlertDialogOverlay({ className }: { className?: string }) {
  return null;
}

// ── Content ────────────────────────────────────────────────────────────────

function AlertDialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <ModalContent
      data-slot="alert-dialog-content"
      className={cn("sm:max-w-lg", className)}
      {...(props as any)}
    >
      {(onClose) => <>{children}</>}
    </ModalContent>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalHeader
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...(props as any)}
    />
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalFooter
      data-slot="alert-dialog-footer"
      className={cn("flex flex-row justify-end gap-2", className)}
      {...(props as any)}
    />
  );
}

// ── Title ──────────────────────────────────────────────────────────────────

function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

// ── Description ────────────────────────────────────────────────────────────

function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// ── Action button ──────────────────────────────────────────────────────────

function AlertDialogAction({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { disabled?: boolean }) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      onClick={onClick as any}
      {...(props as any)}
    >
      {children}
    </Button>
  );
}

// ── Cancel button ──────────────────────────────────────────────────────────

function AlertDialogCancel({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { disabled?: boolean }) {
  return (
    <Button
      data-slot="alert-dialog-cancel"
      variant="outline"
      className={cn(className)}
      onClick={onClick as any}
      {...(props as any)}
    >
      {children}
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
