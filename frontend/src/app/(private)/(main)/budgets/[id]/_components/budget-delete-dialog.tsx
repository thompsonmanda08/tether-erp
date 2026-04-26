"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";

interface BudgetDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetCode: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function BudgetDeleteDialog({
  open,
  onOpenChange,
  budgetCode,
  onConfirm,
  isDeleting,
}: BudgetDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete budget{" "}
              <strong>{budgetCode}</strong>?
            </p>
            <p className="text-red-600 font-medium">
              This action cannot be undone. All budget items and associated data
              will be permanently removed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Budget"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
