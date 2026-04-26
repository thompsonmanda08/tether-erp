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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notify } from "@/lib/utils";
import {
  updateOrganization,
  type Organization,
  type UpdateOrganizationRequest,
} from "@/app/_actions/organizations";
import { Building2, Mail, Settings } from "lucide-react";

interface OrganizationEditDialogProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationUpdated: () => void;
}

export function OrganizationEditDialog({
  organization,
  open,
  onOpenChange,
  onOrganizationUpdated,
}: OrganizationEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({});

  useEffect(() => {
    if (organization && open) {
      setFormData({
        name: organization.name,
        domain: organization.domain,
        settings: {
          max_users: organization.settings?.max_users || 50,
          features_enabled: organization.settings?.features_enabled || [],
          custom_branding: organization.settings?.custom_branding || false,
          api_access: organization.settings?.api_access || false,
        },
        contact_info: {
          admin_name: organization.contact_info?.admin_name || "",
          admin_email: organization.contact_info?.admin_email || "",
          phone: organization.contact_info?.phone || "",
          address: organization.contact_info?.address || "",
        },
      });
    }
  }, [organization, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsLoading(true);
    try {
      const result = await updateOrganization(organization.id, formData);
      if (result.success) {
        notify({ title: "Organization updated successfully", type: "success" });
        onOrganizationUpdated();
        onOpenChange(false);
      } else {
        notify({ title: result.message || "Failed to update organization", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to update organization", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof UpdateOrganizationRequest,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const handleContactInfoChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value,
      },
    }));
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Organization: {organization.name}
          </DialogTitle>
          <DialogDescription>
            Update organization information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="name"
                  label="Organization Name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter organization name"
                />
                <Input
                  name="domain"
                  label="Domain"
                  value={formData.domain || ""}
                  onChange={(e) => handleInputChange("domain", e.target.value)}
                  placeholder="Enter domain"
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                name="max_users"
                label="Maximum Users"
                type="number"
                value={formData.settings?.max_users || ""}
                onChange={(e) =>
                  handleSettingsChange(
                    "max_users",
                    parseInt(e.target.value) || 0,
                  )
                }
                placeholder="Enter maximum number of users"
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="custom_branding">Custom Branding</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow organization to customize branding and appearance
                    </p>
                  </div>
                  <Switch
                    id="custom_branding"
                    checked={formData.settings?.custom_branding || false}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("custom_branding", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api_access">API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable API access for this organization
                    </p>
                  </div>
                  <Switch
                    id="api_access"
                    checked={formData.settings?.api_access || false}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("api_access", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="admin_name"
                  label="Admin Name"
                  value={formData.contact_info?.admin_name || ""}
                  onChange={(e) =>
                    handleContactInfoChange("admin_name", e.target.value)
                  }
                  placeholder="Enter admin name"
                />
                <Input
                  name="admin_email"
                  label="Admin Email"
                  type="email"
                  value={formData.contact_info?.admin_email || ""}
                  onChange={(e) =>
                    handleContactInfoChange("admin_email", e.target.value)
                  }
                  placeholder="Enter admin email"
                />
              </div>

              <Input
                name="phone"
                label="Phone Number"
                value={formData.contact_info?.phone || ""}
                onChange={(e) =>
                  handleContactInfoChange("phone", e.target.value)
                }
                placeholder="Enter phone number"
              />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.contact_info?.address || ""}
                  onChange={(e) =>
                    handleContactInfoChange("address", e.target.value)
                  }
                  placeholder="Enter organization address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

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
              Update Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
