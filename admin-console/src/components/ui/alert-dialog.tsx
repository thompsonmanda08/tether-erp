"use client";

import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function AlertDialog({ open, onOpenChange, children, ...props }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  return <Modal data-slot="alert-dialog" isOpen={open} onOpenChange={onOpenChange} {...(props as any)}>{children}</Modal>;
}

function AlertDialogTrigger({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function AlertDialogPortal({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function AlertDialogOverlay({ className }: { className?: string }) { return null; }

function AlertDialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <ModalContent data-slot="alert-dialog-content" className={cn("sm:max-w-lg", className)} {...(props as any)}>{(onClose) => <>{children}</>}</ModalContent>;
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <ModalHeader data-slot="alert-dialog-header" className={cn("flex flex-col gap-2 text-left", className)} {...(props as any)} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <ModalFooter data-slot="alert-dialog-footer" className={cn("flex flex-row justify-end gap-2", className)} {...(props as any)} />;
}

function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-slot="alert-dialog-title" className={cn("text-lg font-semibold", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="alert-dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function AlertDialogAction({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return <Button data-slot="alert-dialog-action" className={cn(className)} onClick={onClick as any} {...(props as any)}>{children}</Button>;
}

function AlertDialogCancel({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return <Button data-slot="alert-dialog-cancel" variant="outline" className={cn(className)} onClick={onClick as any} {...(props as any)}>{children}</Button>;
}

export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
