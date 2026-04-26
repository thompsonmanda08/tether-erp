"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  createRole,
  type Permission,
  type CreateRoleRequest,
} from "@/app/_actions/roles";
import { RolePermissionsPanel } from "./role-permissions-panel";

interface RoleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: Permission[];
  onRoleCreated: () => void;
}

export function RoleCreateDialog({
  open,
  onOpenChange,
  permissions,
  onRoleCreated,
}: RoleCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: "",
    display_name: "",
    description: "",
    permission_ids: [],
    is_active: true,
  });

  const handleInputChange = (field: keyof CreateRoleRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.display_name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.permission_ids.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createRole(formData);

      if (result.success) {
        toast.success("Role created successfully");
        onRoleCreated();
        handleClose();
      } else {
        toast.error(result.message || "Failed to create role");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      display_name: "",
      description: "",
      permission_ids: [],
      is_active: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a new role with specific permissions for users
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <Input
                name="name"
                label="Role Name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., content_manager"
                descriptionText="Internal name (lowercase, underscores only)"
              />

              <Input
                name="display_name"
                label="Display Name"
                required
                value={formData.display_name}
                onChange={(e) =>
                  handleInputChange("display_name", e.target.value)
                }
                placeholder="e.g., Content Manager"
              />

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe what this role can do..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_active", checked)
                  }
                />
                <Label htmlFor="is_active">Active Role</Label>
              </div>
            </div>

            {/* Permissions Selection */}
            <RolePermissionsPanel
              permissions={permissions}
              selectedIds={formData.permission_ids}
              onChange={(ids) => handleInputChange("permission_ids", ids)}
            />
          </div>

          <Separator />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Creating..."
            >
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
