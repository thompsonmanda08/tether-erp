"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, Mail, Users } from "lucide-react";
import { notify } from "@/lib/utils";
import {
  updateAdminUser,
  type UpdateAdminUserRequest,
  type AdminUser,
  type AdminRole,
} from "@/app/_actions/admin-users";

interface AdminUserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  roles: AdminRole[];
  onUserUpdated: () => void;
}

export function AdminUserEditDialog({
  open,
  onOpenChange,
  user,
  roles,
  onUserUpdated,
}: AdminUserEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateAdminUserRequest>({
    id: "",
    email: "",
    first_name: "",
    last_name: "",
    is_active: true,
    is_super_admin: false,
    role_ids: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user && open) {
      const initialData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        is_super_admin: user.is_super_admin,
        role_ids: user.roles.map((role) => role.id),
      };
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.first_name) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Last name is required";
    }

    if (formData.role_ids && formData.role_ids.length === 0) {
      newErrors.roles = "At least one role must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateAdminUser(formData);

      if (result.success) {
        notify({ title: "Admin user updated successfully", type: "success" });
        onUserUpdated();
        handleClose();
      } else {
        notify({ title: result.message || "Failed to update admin user", type: "error" });
      }
    } catch (error) {
      console.error("Error updating admin user:", error);
      notify({ title: "Failed to update admin user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleInputChange = (
    field: keyof UpdateAdminUserRequest,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const currentRoleIds = formData.role_ids || [];
    let newRoleIds: string[];

    if (checked) {
      newRoleIds = [...currentRoleIds, roleId];
    } else {
      newRoleIds = currentRoleIds.filter((id) => id !== roleId);
    }

    handleInputChange("role_ids", newRoleIds);
  };

  if (!user) {
    return null;
  }

  const selectedRoles = roles.filter((role) =>
    formData.role_ids?.includes(role.id),
  );

  const isCurrentUserSuperAdmin = user.is_super_admin;
  const hasActiveSessions = user.session_count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit Admin User
          </DialogTitle>
          <DialogDescription>
            Update admin user information, roles, and permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Warnings */}
        {(isCurrentUserSuperAdmin || hasActiveSessions) && (
          <div className="space-y-2">
            {isCurrentUserSuperAdmin && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  This is a super admin user. Changes will affect system-wide
                  access.
                </p>
              </div>
            )}
            {hasActiveSessions && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  User has {user.session_count} active session(s). Changes will
                  take effect immediately.
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="first_name"
                label="First Name"
                required
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                isInvalid={!!errors.first_name}
                errorText={errors.first_name}
              />
              <Input
                name="last_name"
                label="Last Name"
                required
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                isInvalid={!!errors.last_name}
                errorText={errors.last_name}
              />
            </div>

            <Input
              name="email"
              label="Email Address"
              required
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              isInvalid={!!errors.email}
              errorText={errors.email}
            />
          </div>

          <Separator />

          {/* Admin Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Admin Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    User can log in and access the system
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_active", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Super Admin</Label>
                  <p className="text-sm text-muted-foreground">
                    Full system access with all permissions
                  </p>
                </div>
                <Switch
                  checked={formData.is_super_admin}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_super_admin", checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Role Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Role Assignment <span className="text-red-500">*</span>
              </h3>
              {selectedRoles.length > 0 && (
                <Badge variant="outline">{selectedRoles.length} selected</Badge>
              )}
            </div>

            {errors.roles && (
              <p className="text-sm text-red-500">{errors.roles}</p>
            )}

            <div className="grid gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={formData.role_ids?.includes(role.id) || false}
                    onCheckedChange={(checked) =>
                      handleRoleToggle(role.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {role.display_name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                  {role.is_system_role && (
                    <Badge variant="destructive" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {selectedRoles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Selected Roles:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map((role) => (
                    <Badge key={role.id} variant="secondary">
                      {role.display_name}
                      <button
                        type="button"
                        onClick={() => handleRoleToggle(role.id, false)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Current Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Last Login</Label>
                <p>
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Active Sessions</Label>
                <p>{user.session_count}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Status</Label>
                <p>{user.is_locked ? "Locked" : "Unlocked"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Two-Factor Auth</Label>
                <p>{user.two_factor_enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              isLoading={isLoading}
              loadingText="Updating..."
            >
              Update Admin User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
