"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  updateRole,
  type Role,
  type Permission,
  type UpdateRoleRequest,
} from "@/app/_actions/roles";
import { RolePermissionsPanel } from "./role-permissions-panel";

interface RoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  permissions: Permission[];
  onRoleUpdated: () => void;
  isSuperAdmin?: boolean;
}

export function RoleEditDialog({
  open,
  onOpenChange,
  role,
  permissions,
  onRoleUpdated,
  isSuperAdmin = false,
}: RoleEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateRoleRequest>({
    id: "",
    name: "",
    display_name: "",
    description: "",
    permission_ids: [],
    is_active: true,
  });

  useEffect(() => {
    if (role && open) {
      setFormData({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        permission_ids: role.permissions.map((p) => p.id),
        is_active: role.is_active,
      });
    }
  }, [role, open]);

  const handleInputChange = (field: keyof UpdateRoleRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.display_name?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.permission_ids || formData.permission_ids.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateRole(formData);

      if (result.success) {
        toast.success("Role updated successfully");
        onRoleUpdated();
      } else {
        toast.error(result.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {role.is_system_role ? "Edit System Role" : "Edit Role"}
          </DialogTitle>
          <DialogDescription>
            {role.is_system_role
              ? "Update system role permissions (name cannot be changed)"
              : "Update role information and permissions"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <Input
                name="name"
                label="Role Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={role.is_system_role}
                placeholder="e.g., content_manager"
                descriptionText={
                  role.is_system_role
                    ? "System role names cannot be changed"
                    : undefined
                }
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
                  disabled={role.is_system_role && !isSuperAdmin}
                />
                <Label htmlFor="is_active">Active Role</Label>
                {role.is_system_role && (
                  <Badge variant="outline" className="text-xs">
                    System Role
                  </Badge>
                )}
              </div>

              {role.user_count > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This role is assigned to{" "}
                    {role.user_count} user(s). Changes will affect their
                    permissions immediately.
                  </p>
                </div>
              )}
            </div>

            {/* Permissions Selection */}
            <RolePermissionsPanel
              permissions={permissions}
              selectedIds={formData.permission_ids ?? []}
              onChange={(ids) => handleInputChange("permission_ids", ids)}
            />
          </div>

          <Separator />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Updating..."
            >
              Update Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
