"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateWorkspace } from "@/app/(private)/welcome/_components/create-workspace";

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (organization: any) => void;
}

export function CreateOrganizationModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationModalProps) {
  const handleSuccess = (organization: any) => {
    onOpenChange(false);
    onSuccess?.(organization);
  };

  const handleBack = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="p-6">
          <CreateWorkspace
            onBack={handleBack}
            onSuccess={handleSuccess}
            isModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}