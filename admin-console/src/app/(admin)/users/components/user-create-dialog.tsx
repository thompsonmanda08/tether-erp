"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notify } from "@/lib/utils";
import { UserPlus, Mail, User, Shield, Building2 } from "lucide-react";
const ADMIN_ROLES = [
  { value: "admin", label: "Admin", description: "Full platform administration access" },
  { value: "super_admin", label: "Super Admin", description: "Unrestricted access to all platform features" },
];

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  send_invitation: boolean;
  phone?: string;
  profile?: {
    department?: string;
    job_title?: string;
  };
}

export function UserCreateDialog({
  open,
  onOpenChange,
  onUserCreated,
}: UserCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: "",
    email: "",
    role: "admin",
    send_invitation: true,
    phone: "",
    profile: {
      department: "",
      job_title: "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      notify({
        title: formData.send_invitation
          ? "User created and invitation sent successfully"
          : "User created successfully",
        type: "success",
      });

      onUserCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      notify({ title: "Failed to create user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "admin",
      send_invitation: true,
      phone: "",
      profile: {
        department: "",
        job_title: "",
      },
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof CreateUserRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const selectedRole = ADMIN_ROLES.find((role) => role.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the platform and send them an invitation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="name"
                  label="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  isInvalid={!!errors.name}
                  errorText={errors.name}
                />
                <Input
                  name="email"
                  label="Email Address"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                  isInvalid={!!errors.email}
                  errorText={errors.email}
                />
              </div>

              <Input
                name="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number (optional)"
              />
            </CardContent>
          </Card>

          {/* Role and Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role and Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectField
                name="role"
                label="User Role"
                required
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
                placeholder="Select user role"
                options={ADMIN_ROLES}
                isInvalid={!!errors.role}
                errorText={errors.role}
                classNames={{ wrapper: "max-w-full" }}
              />
              {selectedRole && (
                <p className="text-sm text-muted-foreground">
                  {selectedRole.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="department"
                  label="Department"
                  value={formData.profile?.department || ""}
                  onChange={(e) =>
                    handleProfileChange("department", e.target.value)
                  }
                  placeholder="Enter department (optional)"
                />
                <Input
                  name="job_title"
                  label="Job Title"
                  value={formData.profile?.job_title || ""}
                  onChange={(e) =>
                    handleProfileChange("job_title", e.target.value)
                  }
                  placeholder="Enter job title (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invitation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invitation Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="send_invitation">Send Invitation Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Send an email invitation to the user with login instructions
                  </p>
                </div>
                <Switch
                  id="send_invitation"
                  checked={formData.send_invitation}
                  onCheckedChange={(checked) =>
                    handleInputChange("send_invitation", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Creating..."
            >
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
