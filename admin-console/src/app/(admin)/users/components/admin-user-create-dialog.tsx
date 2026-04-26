"use client";

import { useState } from "react";
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
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  Shield,
  Mail,
  Lock,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { notify } from "@/lib/utils";
import { type CreateAdminUserRequest } from "@/app/_actions/admin-users";
import { useCreateAdminUser } from "@/hooks/use-admin-users";

interface AdminUserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

const USER_TYPE_OPTIONS = [
  {
    value: "admin",
    label: "Platform Admin — frontend app access with personal organization",
  },
  {
    value: "super_admin",
    label: "Super Admin — full platform + admin console access",
  },
];

export function AdminUserCreateDialog({
  open,
  onOpenChange,
  onUserCreated,
}: AdminUserCreateDialogProps) {
  const createMutation = useCreateAdminUser();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateAdminUserRequest>({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_active: true,
    is_super_admin: false,
    send_welcome_email: true,
    require_password_change: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: (result) => {
        if (result.success) {
          notify({ title: "Admin user created successfully", type: "success" });
          onUserCreated();
          handleClose();
        } else {
          notify({
            title: result.message || "Failed to create admin user",
            type: "error",
          });
        }
      },
      onError: (error) => {
        console.error("Error creating admin user:", error);
        notify({ title: "Failed to create admin user", type: "error" });
      },
    });
  };

  const handleClose = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      is_active: true,
      is_super_admin: false,
      send_welcome_email: true,
      require_password_change: true,
    });
    setErrors({});
    setShowPassword(false);
    onOpenChange(false);
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Create Admin User
          </DialogTitle>
          <DialogDescription>
            Create a platform admin (frontend app) or a super admin (admin
            console access).
          </DialogDescription>
        </DialogHeader>

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
                  setFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                isInvalid={!!errors.first_name}
                errorText={errors.first_name}
              />
              <Input
                name="last_name"
                label="Last Name"
                required
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              isInvalid={!!errors.email}
              errorText={errors.email}
            />
          </div>

          <Separator />

          {/* Password */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Security & Password</h3>

            <div className="flex gap-2 items-end">
              <Input
                name="password"
                label="Password"
                required
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                startContent={
                  <Lock className="h-4 w-4 text-muted-foreground" />
                }
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                isInvalid={!!errors.password}
                errorText={errors.password}
                classNames={{ wrapper: "flex-1" }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
              >
                Generate
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="require_password_change"
                checked={formData.require_password_change}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    require_password_change: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="require_password_change" className="text-sm">
                Require password change on first login
              </Label>
            </div>
          </div>

          <Separator />

          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Account Settings</h3>

            <div className="space-y-4">
              {/* User Type — drives is_super_admin */}
              <SelectField
                name="user_type"
                label="User Type"
                value={formData.is_super_admin ? "super_admin" : "admin"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_super_admin: value === "super_admin",
                  }))
                }
                options={USER_TYPE_OPTIONS}
                classNames={{ wrapper: "max-w-full" }}
              />

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
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send Welcome Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Send login credentials via email
                  </p>
                </div>
                <Switch
                  checked={formData.send_welcome_email}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      send_welcome_email: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Contextual hint */}
          {formData.is_super_admin ? (
            <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                <p className="font-medium">Admin console access</p>
                <p className="text-muted-foreground">
                  This user will have full platform access and can log into the
                  admin console. No organization will be created.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-600 dark:text-blue-400">
                <p className="font-medium">Personal organization</p>
                <p className="text-muted-foreground">
                  A personal organization will automatically be created for this
                  user so they can start using the platform immediately.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              isLoading={createMutation.isPending}
              loadingText="Creating..."
            >
              Create Admin User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
