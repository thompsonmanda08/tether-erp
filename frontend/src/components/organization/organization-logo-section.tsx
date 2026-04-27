"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { OrganizationLogoUpload } from "@/components/ui/organization-logo-upload";
import { Button } from "@/components/ui/button";
import { useUpdateOrganizationMutation } from "@/hooks/use-organization-mutations";

interface OrganizationLogoSectionProps {
  organizationId: string;
  organizationName: string;
  currentLogoUrl?: string;
  onLogoUpdated?: (url: string) => void;
}

/**
 * Ready-to-use section for organization logo management
 * Includes upload component and save functionality
 */
export function OrganizationLogoSection({
  organizationId,
  organizationName,
  currentLogoUrl,
  onLogoUpdated,
}: OrganizationLogoSectionProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
  const [hasChanges, setHasChanges] = useState(false);
  const { updateOrganization, isPending } = useUpdateOrganizationMutation();

  useEffect(() => {
    setLogoUrl(currentLogoUrl || "");
  }, [currentLogoUrl]);

  const handleLogoChange = (url: string) => {
    setLogoUrl(url);
    setHasChanges(url !== currentLogoUrl);
  };

  const handleSave = async () => {
    try {
      await updateOrganization({
        id: organizationId,
        logoUrl: logoUrl,
      });

      setHasChanges(false);
      onLogoUpdated?.(logoUrl);
      toast.success("Organization logo updated successfully");
    } catch (error) {
      console.error("Failed to update logo:", error);
      toast.error("Failed to update logo");
    }
  };

  const handleCancel = () => {
    setLogoUrl(currentLogoUrl || "");
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Organization Logo</h3>
        <p className="text-sm text-muted-foreground">
          Upload a logo to represent your organization. This will be displayed
          throughout the application.
        </p>
      </div>

      <OrganizationLogoUpload
        currentLogoUrl={logoUrl}
        organizationName={organizationName}
        onLogoChange={handleLogoChange}
        disabled={isPending}
        size="lg"
      />

      {hasChanges && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isPending} isLoading={isPending} loadingText="Saving...">
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
