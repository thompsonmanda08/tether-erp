"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cloneRole, type Role } from "@/app/_actions/roles";

interface RoleCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onRoleCloned: () => void;
}

export function RoleCloneDialog({
  open,
  onOpenChange,
  role,
  onRoleCloned,
}: RoleCloneDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !newName.trim() || !newDisplayName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await cloneRole(role.id, newName, newDisplayName);

      if (result.success) {
        toast.success("Role cloned successfully");
        onRoleCloned();
        handleClose();
      } else {
        toast.error(result.message || "Failed to clone role");
      }
    } catch (error) {
      console.error("Error cloning role:", error);
      toast.error("Failed to clone role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewName("");
    setNewDisplayName("");
    onOpenChange(false);
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Role</DialogTitle>
          <DialogDescription>
            Create a copy of "{role.display_name}" with the same permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="new_name"
            label="New Role Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., content_manager_copy"
            descriptionText="Internal name (lowercase, underscores only)"
          />

          <Input
            name="new_display_name"
            label="New Display Name"
            required
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="e.g., Content Manager Copy"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              loadingText="Cloning..."
            >
              Clone Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
