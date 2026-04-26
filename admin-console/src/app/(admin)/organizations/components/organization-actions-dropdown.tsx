"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import {
  MoreHorizontal,
  Edit,
  Building2,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateOrganizationStatus,
  deleteOrganization,
  type Organization,
} from "@/app/_actions/organizations";
import { OrganizationEditDialog } from "./organization-edit-dialog";

interface OrganizationActionsDropdownProps {
  organization: Organization;
  onStatusChange: (
    organizationId: string,
    status: "active" | "suspended" | "pending",
  ) => void;
  onOrganizationUpdated: () => void;
}

export function OrganizationActionsDropdown({
  organization,
  onStatusChange,
  onOrganizationUpdated,
}: OrganizationActionsDropdownProps) {
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuspendOrganization = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(organization.id, "suspended");
      setShowSuspendDialog(false);
    } catch (error) {
      toast.error("Failed to suspend organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateOrganization = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(organization.id, "active");
      setShowActivateDialog(false);
    } catch (error) {
      toast.error("Failed to activate organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    setIsLoading(true);
    try {
      const result = await deleteOrganization(organization.id);
      if (result.success) {
        toast.success("Organization deleted successfully");
        setShowDeleteDialog(false);
        onOrganizationUpdated();
      } else {
        toast.error(result.message || "Failed to delete organization");
      }
    } catch (error) {
      toast.error("Failed to delete organization");
    } finally {
      setIsLoading(false);
    }
  };

  const canSuspend = organization.status === "active";
  const canActivate =
    organization.status === "suspended" || organization.status === "pending";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Organization Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Organization
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {canActivate && (
            <DropdownMenuItem onClick={() => setShowActivateDialog(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate Organization
            </DropdownMenuItem>
          )}

          {canSuspend && (
            <DropdownMenuItem
              onClick={() => setShowSuspendDialog(true)}
              className="text-red-600"
            >
              <UserX className="mr-2 h-4 w-4" />
              Suspend Organization
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend Organization Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Suspend Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{organization.name}</strong>? This will prevent all users
              in this organization from accessing the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendOrganization}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Suspending..." : "Suspend Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Organization Dialog */}
      <AlertDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              Activate Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate{" "}
              <strong>{organization.name}</strong>? This will restore access for
              all users in this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivateOrganization}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Activating..." : "Activate Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Organization Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{organization.name}</strong>? This action cannot be undone
              and will remove all data associated with this organization.
              <br />
              <br />
              <strong>This will:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Delete all {organization.user_count} users in this
                  organization
                </li>
                <li>Remove all organization data and settings</li>
                <li>Permanently delete all associated records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Organization Edit Dialog */}
      <OrganizationEditDialog
        organization={organization}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onOrganizationUpdated={onOrganizationUpdated}
      />
    </>
  );
}
