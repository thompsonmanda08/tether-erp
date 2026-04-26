"use client";

import { useState, useEffect } from "react";
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
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/utils";
import {
  updateUser,
  type PlatformUser,
  type UpdateUserRequest,
} from "@/app/_actions/users";
import { User, Building2, Shield } from "lucide-react";
const ADMIN_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

interface UserEditDialogProps {
  user: PlatformUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const USER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
];

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateUserRequest>({});

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone || "",
        profile: {
          department: user.profile?.department || "",
          job_title: user.profile?.job_title || "",
          phone: user.profile?.phone || user.phone || "",
        },
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await updateUser(user.id, formData);
      if (result.success) {
        notify({ title: "User updated successfully", type: "success" });
        onUserUpdated();
        onOpenChange(false);
      } else {
        notify({ title: result.message || "Failed to update user", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to update user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateUserRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User: {user.name}
          </DialogTitle>
          <DialogDescription>
            Update user information and permissions
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
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                />
                <Input
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="phone"
                  label="Phone Number"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 pl-1">
                    Email Verified
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={user.email_verified ? "default" : "secondary"}
                    >
                      {user.email_verified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role and Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role and Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="role"
                  label="Role"
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                  placeholder="Select role"
                  options={ADMIN_ROLES}
                  classNames={{ wrapper: "max-w-full" }}
                />
                <SelectField
                  name="status"
                  label="Status"
                  value={formData.status}
                  onValueChange={(value) =>
                    handleInputChange("status", value as any)
                  }
                  placeholder="Select status"
                  options={USER_STATUSES}
                  classNames={{ wrapper: "max-w-full" }}
                />
              </div>
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
                  placeholder="Enter department"
                />
                <Input
                  name="job_title"
                  label="Job Title"
                  value={formData.profile?.job_title || ""}
                  onChange={(e) =>
                    handleProfileChange("job_title", e.target.value)
                  }
                  placeholder="Enter job title"
                />
              </div>
            </CardContent>
          </Card>

          {/* Organization Memberships */}
          {user.organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Memberships ({user.organizations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.organizations.map((org) => (
                    <div
                      key={org.organization_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {org.organization_name}
                          </span>
                          {org.is_primary && (
                            <Badge variant="default" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Role: {org.role} • Status: {org.status}
                        </div>
                      </div>
                      <Badge
                        variant={
                          org.status === "active" ? "default" : "secondary"
                        }
                      >
                        {org.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
              Update User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
