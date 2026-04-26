"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, X, Edit, Send, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmationType = "delete" | "close" | "edit" | "submit" | "withdraw" | "default";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  isLoading?: boolean;
}

const typeConfig = {
  delete: {
    icon: Trash2,
    title: "Confirm Deletion?",
    description:
      "Are you sure you want to perform a delete action on this entry? This action cannot be undone.",
    confirmText: "Confirm",
    variant: "destructive" as const,
    iconColor: "text-destructive bg-destructive/10 p-1"
  },
  close: {
    icon: X,
    title: "Confirm Close",
    description: "Are you sure you want to close? Any unsaved changes will be lost.",
    confirmText: "Close",
    variant: "destructive" as const,
    iconColor: "text-destructive"
  },
  edit: {
    icon: Edit,
    title: "Confirm Edit",
    description: "Are you sure you want to make these changes?",
    confirmText: "Confirm",
    variant: "default" as const,
    iconColor: "text-primary "
  },
  submit: {
    icon: Send,
    title: "Submit for Approval",
    description: "Are you sure you want to submit this requisition for approval? Once submitted, it will be sent to the appropriate approvers for review.",
    confirmText: "Submit",
    variant: "default" as const,
    iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/30"
  },
  withdraw: {
    icon: Undo2,
    title: "Withdraw Requisition",
    description: "Are you sure you want to withdraw this requisition? It will be reverted to draft status and you can edit and re-submit it later.",
    confirmText: "Withdraw",
    variant: "default" as const,
    iconColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
  },
  default: {
    icon: AlertTriangle,
    title: "Confirm Action",
    description: "Are you sure you want to proceed?",
    confirmText: "Confirm",
    variant: "default" as const,
    iconColor: "text-primary bg-primary/10"
  }
};

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  type = "default",
  isLoading = false
}: ConfirmationModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                config.iconColor
              )}>
              <Icon className="h-4 w-4" />
            </div>
            <DialogTitle className="tracking-tight">{title || config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs font-medium sm:text-sm">
            {description || config.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 space-x-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={config.variant}
            onClick={handleConfirm}
            loadingText=""
            isLoading={isLoading}
            disabled={isLoading}>
            {confirmText || config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
