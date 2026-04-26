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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { SearchSelectField } from "@/components/ui/search-select-field";
import { toast } from "sonner";
import {
  createOrganization,
  type CreateOrganizationRequest,
} from "@/app/_actions/organizations";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { Building2, User, Settings, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/app/_actions/admin-users";

interface OrganizationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationCreated: () => void;
}

const TRIAL_DURATIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

const emptyForm = (): CreateOrganizationRequest => ({
  name: "",
  domain: "",
  description: "",
  admin_user_id: "",
  trial_days: 30,
  max_users: 50,
});

export function OrganizationCreateDialog({
  open,
  onOpenChange,
  onOrganizationCreated,
}: OrganizationCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] =
    useState<CreateOrganizationRequest>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: adminUsers, isLoading: usersLoading } = useAdminUsers({});

  const userOptions =
    adminUsers?.map((u) => ({
      id: u.id,
      name: u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.email,
      email: u.email,
      is_super_admin: u.is_super_admin,
    })) ?? [];

  const renderUserOption = (item: any, isSelected: boolean) => (
    <div className="flex items-center gap-3 py-1 w-full">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
        {(item.name || item.email || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {item.email}
        </div>
      </div>
      {item.is_super_admin && (
        <Badge variant="secondary" className="text-xs shrink-0">
          Super Admin
        </Badge>
      )}
      <Check
        className={cn(
          "h-4 w-4 shrink-0 ml-1",
          isSelected ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );

  const renderUserSelected = (item: any) => (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
        {(item.name || item.email || "?").charAt(0).toUpperCase()}
      </div>
      <span className="truncate">{item.name}</span>
      {item.email && (
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
          · {item.email}
        </span>
      )}
    </div>
  );

  const tierOptions =
    tiers?.map((t) => ({
      value: t.name,
      label: `${t.displayName} — $${t.priceMonthly}/mo`,
    })) ?? [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Organization name is required";
    if (!formData.domain.trim()) {
      newErrors.domain = "Domain is required";
    } else if (
      !/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(
        formData.domain,
      )
    ) {
      newErrors.domain = "Please enter a valid domain (e.g., company.com)";
    }
    if (!formData.admin_user_id)
      newErrors.admin_user_id = "Please select an admin user";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await createOrganization(formData);
      if (result.success) {
        toast.success("Organization created successfully");
        onOrganizationCreated();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(result.message || "Failed to create organization");
      }
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setErrors({});
  };

  const handleField = (field: keyof CreateOrganizationRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Organization
          </DialogTitle>
          <DialogDescription asChild>
            <p>Set up a new organization and attach an existing admin user.</p>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin User */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Admin User <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select an existing admin user to manage this organization.
              </p>
              <SearchSelectField
                label=""
                name="admin_user_id"
                placeholder="Search and select an admin user..."
                value={formData.admin_user_id}
                onValueChange={(v) => handleField("admin_user_id", v)}
                options={userOptions}
                isLoading={usersLoading}
                isInvalid={!!errors.admin_user_id}
                errorText={errors.admin_user_id}
                onModal
                renderOption={renderUserOption}
                renderSelected={renderUserSelected}
                classNames={{ wrapper: "max-w-full" }}
              />
            </CardContent>
          </Card>

          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="name"
                  label="Organization Name"
                  required
                  value={formData.name}
                  onChange={(e) => handleField("name", e.target.value)}
                  placeholder="Enter organization name"
                  isInvalid={!!errors.name}
                  errorText={errors.name}
                />
                <Input
                  name="domain"
                  label="Domain"
                  required
                  value={formData.domain}
                  onChange={(e) => handleField("domain", e.target.value)}
                  placeholder="company.com"
                  isInvalid={!!errors.domain}
                  errorText={errors.domain}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ""}
                  onChange={(e) => handleField("description", e.target.value)}
                  placeholder="Brief description of this organization..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectField
                label="Trial Duration"
                value={formData.trial_days?.toString()}
                onValueChange={(v) => handleField("trial_days", parseInt(v))}
                options={TRIAL_DURATIONS}
                placeholder="Select duration"
                classNames={{ wrapper: "max-w-full" }}
              />

              <Input
                name="max_users"
                label="Maximum Users"
                type="number"
                value={formData.max_users ?? ""}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) handleField("max_users", v);
                }}
                placeholder="50"
              />
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
              Create Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
