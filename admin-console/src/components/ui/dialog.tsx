"use client";

import * as React from "react";
import { Modal, ModalContent, ModalHeader as NextUIModalHeader, ModalBody, ModalFooter as NextUIModalFooter } from "@heroui/react";
import { cn } from "@/lib/utils";

function Dialog({ open, onOpenChange, children, ...props }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  return <Modal data-slot="dialog" isOpen={open} onOpenChange={onOpenChange} {...(props as any)}>{children}</Modal>;
}

function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) { return <>{children}</>; }
function DialogPortal({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function DialogClose({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function DialogOverlay({ className }: { className?: string }) { return null; }

function DialogContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof ModalContent> & { showCloseButton?: boolean }) {
  return <ModalContent data-slot="dialog-content" className={cn("sm:max-w-lg", className)} {...(props as any)}>{(onClose) => <>{children}</>}</ModalContent>;
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <NextUIModalHeader data-slot="dialog-header" className={cn("flex flex-col gap-2 text-left", className)} {...(props as any)} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <NextUIModalFooter data-slot="dialog-footer" className={cn("flex flex-row justify-end gap-2", className)} {...(props as any)} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-slot="dialog-title" className={cn("text-lg leading-none font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function DialogBody({ className, ...props }: React.ComponentProps<typeof ModalBody>) {
  return <ModalBody data-slot="dialog-body" className={cn(className)} {...(props as any)} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, DialogBody };
