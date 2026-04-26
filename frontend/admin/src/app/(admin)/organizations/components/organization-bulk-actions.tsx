"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Building2,
  UserCheck,
  UserX,
  Download,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateOrganizationStatus,
  type Organization,
} from "@/app/_actions/organizations";

interface OrganizationBulkActionsProps {
  organizations: Organization[];
  selectedOrganizations: string[];
  onSelectionChange: (selectedOrganizations: string[]) => void;
  onOrganizationsUpdated: () => void;
}

export function OrganizationBulkActions({
  organizations,
  selectedOrganizations,
  onSelectionChange,
  onOrganizationsUpdated,
}: OrganizationBulkActionsProps) {
  const [showBulkSuspendDialog, setShowBulkSuspendDialog] = useState(false);
  const [showBulkActivateDialog, setShowBulkActivateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedOrganizationObjects = organizations.filter((org) =>
    selectedOrganizations.includes(org.id),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(organizations.map((org) => org.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBulkSuspend = async () => {
    setIsLoading(true);
    try {
      const promises = selectedOrganizations.map((orgId) =>
        updateOrganizationStatus(
          orgId,
          "suspended",
          "Bulk suspension by admin",
        ),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        toast.success(`Successfully suspended ${successful} organization(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to suspend ${failed} organization(s)`);
      }

      onOrganizationsUpdated();
      onSelectionChange([]);
      setShowBulkSuspendDialog(false);
    } catch (error) {
      toast.error("Failed to perform bulk suspension");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    setIsLoading(true);
    try {
      const promises = selectedOrganizations.map((orgId) =>
        updateOrganizationStatus(orgId, "active", "Bulk activation by admin"),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        toast.success(`Successfully activated ${successful} organization(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to activate ${failed} organization(s)`);
      }

      onOrganizationsUpdated();
      onSelectionChange([]);
      setShowBulkActivateDialog(false);
    } catch (error) {
      toast.error("Failed to perform bulk activation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportOrganizations = () => {
    const csvContent = [
      // CSV Header
      "Name,Domain,Status,Trial Status,User Count,Created At",
      // CSV Data
      ...selectedOrganizationObjects.map((org) =>
        [
          org.name,
          org.domain,
          org.status,
          org.trial_status,
          org.user_count,
          new Date(org.created_at).toISOString(),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizations-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(
      `Exported ${selectedOrganizations.length} organization(s) to CSV`,
    );
  };

  const isAllSelected =
    organizations.length > 0 &&
    selectedOrganizations.length === organizations.length;
  const isPartiallySelected =
    selectedOrganizations.length > 0 &&
    selectedOrganizations.length < organizations.length;

  return (
    <>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all organizations"
            className={
              isPartiallySelected ? "data-[state=checked]:bg-orange-500" : ""
            }
          />
          <span className="text-sm text-muted-foreground">
            {selectedOrganizations.length === 0
              ? `Select organizations (${organizations.length} total)`
              : `${selectedOrganizations.length} of ${organizations.length} selected`}
          </span>
          {selectedOrganizations.length > 0 && (
            <Badge variant="secondary">
              {selectedOrganizations.length} selected
            </Badge>
          )}
        </div>

        {selectedOrganizations.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportOrganizations}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Selected
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setShowBulkActivateDialog(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate Selected
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowBulkSuspendDialog(true)}
                  className="text-red-600"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Suspend Selected
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleExportOrganizations}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Bulk Suspend Dialog */}
      <AlertDialog
        open={showBulkSuspendDialog}
        onOpenChange={setShowBulkSuspendDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Suspend Multiple Organizations
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{selectedOrganizations.length}</strong> organization(s)?
              This will prevent all users in these organizations from accessing
              the platform.
              <div className="mt-4 max-h-32 overflow-y-auto">
                <div className="text-sm font-medium mb-2">
                  Organizations to be suspended:
                </div>
                <div className="space-y-1">
                  {selectedOrganizationObjects.slice(0, 10).map((org) => (
                    <div key={org.id} className="text-sm">
                      • {org.name} ({org.domain}) - {org.user_count} users
                    </div>
                  ))}
                  {selectedOrganizationObjects.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {selectedOrganizationObjects.length - 10} more
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium">
                  Total users affected:{" "}
                  {selectedOrganizationObjects.reduce(
                    (sum, org) => sum + org.user_count,
                    0,
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkSuspend}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading
                ? "Suspending..."
                : `Suspend ${selectedOrganizations.length} Organization(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Activate Dialog */}
      <AlertDialog
        open={showBulkActivateDialog}
        onOpenChange={setShowBulkActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              Activate Multiple Organizations
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate{" "}
              <strong>{selectedOrganizations.length}</strong> organization(s)?
              This will restore access for all users in these organizations.
              <div className="mt-4 max-h-32 overflow-y-auto">
                <div className="text-sm font-medium mb-2">
                  Organizations to be activated:
                </div>
                <div className="space-y-1">
                  {selectedOrganizationObjects.slice(0, 10).map((org) => (
                    <div key={org.id} className="text-sm">
                      • {org.name} ({org.domain}) - {org.user_count} users
                    </div>
                  ))}
                  {selectedOrganizationObjects.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {selectedOrganizationObjects.length - 10} more
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium">
                  Total users affected:{" "}
                  {selectedOrganizationObjects.reduce(
                    (sum, org) => sum + org.user_count,
                    0,
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkActivate}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading
                ? "Activating..."
                : `Activate ${selectedOrganizations.length} Organization(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
