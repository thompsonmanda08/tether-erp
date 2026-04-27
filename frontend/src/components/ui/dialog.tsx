"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader as NextUIModalHeader,
  ModalBody,
  ModalFooter as NextUIModalFooter,
} from "@heroui/react";
import { cn } from "@/lib/utils";

// Dialog maps to NextUI Modal
function Dialog({
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
      isOpen={open}
      onOpenChange={onOpenChange}
      data-slot="dialog"
      {...props}
    >
      {children}
    </Modal>
  );
}

// DialogTrigger - NextUI handles this differently, so we provide a wrapper
function DialogTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  // In NextUI, triggers are handled by the parent component
  // This is a compatibility wrapper
  return <>{children}</>;
}

// DialogPortal - Not needed in NextUI
function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// DialogClose - Handled by NextUI Modal's onClose
function DialogClose({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// DialogOverlay - Handled automatically by NextUI Modal
function DialogOverlay({ className }: { className?: string }) {
  return null;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof ModalContent> & {
  showCloseButton?: boolean;
}) {
  return (
    <ModalContent
      className={cn("sm:max-w-lg", className)}
      data-slot="dialog-content"
      {...props}
    >
      {(onClose) => <>{children}</>}
    </ModalContent>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <NextUIModalHeader
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <NextUIModalFooter
      data-slot="dialog-footer"
      className={cn("flex flex-row justify-end gap-2", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// DialogBody - Maps to NextUI ModalBody
function DialogBody({
  className,
  ...props
}: React.ComponentProps<typeof ModalBody>) {
  return (
    <ModalBody
      data-slot="dialog-body"
      className={cn(className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogBody,
};
