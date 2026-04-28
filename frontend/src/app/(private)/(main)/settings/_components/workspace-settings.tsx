"use client";

import { useState, useEffect } from "react";
import { useOrganizationContext } from "@/hooks/use-organization";
import {
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useUpdateSettingsMutation,
} from "@/hooks/use-organization-mutations";
import { useOrganizationSettingsQuery } from "@/hooks/use-organization-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationLogoUpload } from "@/components/ui/organization-logo-upload";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Trash2,
  Save,
  Building2,
  FileText,
  ArrowDownUp,
} from "lucide-react";
import { toast } from "sonner";

export function WorkspaceSettings() {
  const { currentOrganization } = useOrganizationContext();
  const { updateOrganization, isPending: isUpdating } =
    useUpdateOrganizationMutation();
  const { deleteOrganization, isPending: isDeleting } =
    useDeleteOrganizationMutation();
  const { updateSettings, isPending: isSavingSettings } =
    useUpdateSettingsMutation();
  const { data: settingsData } = useOrganizationSettingsQuery();

  const [formData, setFormData] = useState({
    name: currentOrganization?.name || "",
    description: currentOrganization?.description || "",
    logoUrl: currentOrganization?.logoUrl || "",
    tagline: currentOrganization?.tagline || "",
  });

  const [hasChanges, setHasChanges] = useState(false);

  const [procurementFlow, setProcurementFlow] = useState<
    "goods_first" | "payment_first"
  >("goods_first");

  // Sync form data when currentOrganization changes
  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || "",
        description: currentOrganization.description || "",
        logoUrl: currentOrganization.logoUrl || "",
        tagline: currentOrganization.tagline || "",
      });
      setHasChanges(false);
    }
  }, [currentOrganization]);

  // Sync procurement flow when settings load
  useEffect(() => {
    if (settingsData?.procurementFlow) {
      setProcurementFlow(settingsData.procurementFlow);
    }
  }, [settingsData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoChange = (url: string) => {
    setFormData((prev) => ({ ...prev, logoUrl: url }));
    setHasChanges(true);
  };

  const handleUpdateWorkspace = async () => {
    if (!currentOrganization) {
      toast.error("No workspace selected");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    try {
      await updateOrganization({
        id: currentOrganization.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        logoUrl: formData.logoUrl,
        tagline: formData.tagline.trim(),
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update workspace:", error);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentOrganization) {
      toast.error("No workspace selected");
      return;
    }

    try {
      await deleteOrganization(currentOrganization.id);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const handleSaveProcurementFlow = async () => {
    if (!settingsData) return;
    try {
      await updateSettings({ ...settingsData, procurementFlow });
    } catch (error) {
      console.error("Failed to update procurement flow:", error);
    }
  };

  if (!currentOrganization) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No workspace selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Settings — Logo, Document Header, Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace Settings
          </CardTitle>
          <CardDescription>
            Manage your workspace branding, document header, and details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Responsive two-column layout on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
            {/* Left — Logo */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Workspace Logo</p>
                <p className="text-sm text-muted-foreground">
                  Upload a logo to represent your workspace
                </p>
              </div>
              <OrganizationLogoUpload
                currentLogoUrl={formData.logoUrl}
                organizationName={formData.name || "Workspace"}
                onLogoChange={handleLogoChange}
                disabled={isUpdating}
                size="lg"
              />{" "}
              {/* Header Preview */}
              <div className="space-y-1.5 mt-8">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="border rounded-md p-4 bg-card flex flex-row items-center gap-3">
                  {formData.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div className="w-14 h-14 rounded-xl overflow-clip">
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain shrink-0"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-bold leading-tight">
                      {formData.name || "Organization Name"}
                    </p>
                    {
                      <p className="text-xs  text-left text-muted-foreground leading-tight mt-0.5">
                        {formData.tagline || "[Organization Tagline]"}
                      </p>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile separator between logo and fields */}
            <Separator className="lg:hidden my-6" />

            {/* Right — Document Header + Description */}
            <div className="space-y-6">
              {/* Document Header */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Document Header
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Appears on all generated PDFs (Requisition, PO, Payment
                    Voucher, GRN)
                  </p>
                </div>

                <Input
                  label="Organization Name"
                  id="doc-header-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter organization name"
                  disabled={isUpdating}
                />
                <Input
                  label="Tagline"
                  id="doc-header-tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange("tagline", e.target.value)}
                  placeholder="e.g. Ministry of Finance — Procurement Division"
                  disabled={isUpdating}
                />
              </div>

              {/* Description */}
              <Textarea
                label="Description"
                id="workspace-description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Enter workspace description (optional)"
                rows={3}
                disabled={isUpdating}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdateWorkspace}
              disabled={!hasChanges || isUpdating || !formData.name.trim()}
              isLoading={isUpdating}
              loadingText="Saving..."
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Information */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
          <CardDescription>
            Read-only information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Workspace ID
              </Label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                {currentOrganization.id}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Slug
              </Label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                {currentOrganization.slug}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Tier
              </Label>
              <p className="text-sm capitalize bg-muted px-2 py-1 rounded mt-1">
                {(currentOrganization as any).tier ?? "—"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Created
              </Label>
              <p className="text-sm bg-muted px-2 py-1 rounded mt-1">
                {new Date(currentOrganization.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procurement Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            Procurement Flow
          </CardTitle>
          <CardDescription>
            Set the default document ordering for all purchase orders in this
            workspace. Individual POs can override this setting at creation
            time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={procurementFlow}
            onValueChange={(v) =>
              setProcurementFlow(v as "goods_first" | "payment_first")
            }
            className="space-y-3"
          >
            <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem
                value="goods_first"
                id="flow-goods-first"
                className="mt-0.5"
              />
              <Label
                htmlFor="flow-goods-first"
                className="cursor-pointer space-y-1"
              >
                <span className="font-medium">
                  Goods-First (Recommended for government)
                </span>
                <p className="text-sm text-muted-foreground font-normal">
                  Goods must be received and the GRN approved before a payment
                  voucher can be created. Flow: REQ → PO → GRN → PV → Payment
                </p>
              </Label>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem
                value="payment_first"
                id="flow-payment-first"
                className="mt-0.5"
              />
              <Label
                htmlFor="flow-payment-first"
                className="cursor-pointer space-y-1"
              >
                <span className="font-medium">
                  Payment-First (Commercial / upfront payment)
                </span>
                <p className="text-sm text-muted-foreground font-normal">
                  Payment is processed before goods are delivered. A GRN is
                  created after delivery to confirm receipt. Flow: REQ → PO → PV
                  → Payment → GRN
                </p>
              </Label>
            </div>
          </RadioGroup>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveProcurementFlow}
              disabled={
                isSavingSettings ||
                !settingsData ||
                procurementFlow === settingsData.procurementFlow
              }
              isLoading={isSavingSettings}
              loadingText="Saving..."
            >
              <Save className="h-4 w-4" />
              Save Flow Setting
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will affect your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isDeleting}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                <Trash2 className="h-4 w-4" />
                Delete Workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This action will permanently delete the workspace{" "}
                    <strong>"{currentOrganization.name}"</strong> and all
                    associated data.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This includes all workflows, requests, users, and settings.
                    This action cannot be undone.
                  </p>
                  <p className="text-sm font-medium">
                    You will be redirected to the workspace selection screen
                    after deletion.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteWorkspace}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Workspace"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
