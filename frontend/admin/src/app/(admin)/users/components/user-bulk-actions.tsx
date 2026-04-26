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
  UserCheck,
  UserX,
  Mail,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { notify } from "@/lib/utils";
import { updateUserStatus, type PlatformUser } from "@/app/_actions/users";

interface UserBulkActionsProps {
  users: PlatformUser[];
  selectedUsers: string[];
  onSelectionChange: (selectedUsers: string[]) => void;
  onUsersUpdated: () => void;
}

export function UserBulkActions({
  users,
  selectedUsers,
  onSelectionChange,
  onUsersUpdated,
}: UserBulkActionsProps) {
  const [showBulkSuspendDialog, setShowBulkSuspendDialog] = useState(false);
  const [showBulkActivateDialog, setShowBulkActivateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedUserObjects = users.filter((user) =>
    selectedUsers.includes(user.id),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(users.map((user) => user.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBulkSuspend = async () => {
    setIsLoading(true);
    try {
      const promises = selectedUsers.map((userId) =>
        updateUserStatus(userId, "suspended", "Bulk suspension by admin"),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        notify({ title: `Successfully suspended ${successful} user(s)`, type: "success" });
      }
      if (failed > 0) {
        notify({ title: `Failed to suspend ${failed} user(s)`, type: "error" });
      }

      onUsersUpdated();
      onSelectionChange([]);
      setShowBulkSuspendDialog(false);
    } catch (error) {
      notify({ title: "Failed to perform bulk suspension", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    setIsLoading(true);
    try {
      const promises = selectedUsers.map((userId) =>
        updateUserStatus(userId, "active", "Bulk activation by admin"),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        notify({ title: `Successfully activated ${successful} user(s)`, type: "success" });
      }
      if (failed > 0) {
        notify({ title: `Failed to activate ${failed} user(s)`, type: "error" });
      }

      onUsersUpdated();
      onSelectionChange([]);
      setShowBulkActivateDialog(false);
    } catch (error) {
      notify({ title: "Failed to perform bulk activation", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportUsers = () => {
    const csvContent = [
      // CSV Header
      "Name,Email,Role,Status,Phone,Organizations,Created At,Last Login,Login Count",
      // CSV Data
      ...selectedUserObjects.map((user) =>
        [
          user.name,
          user.email,
          user.role,
          user.status,
          user.phone || "",
          user.organizations.map((org) => org.organization_name).join("; "),
          new Date(user.created_at).toISOString(),
          user.last_login ? new Date(user.last_login).toISOString() : "",
          user.login_count,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    notify({ title: `Exported ${selectedUsers.length} user(s) to CSV`, type: "success" });
  };

  const isAllSelected =
    users.length > 0 && selectedUsers.length === users.length;
  const isPartiallySelected =
    selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all users"
            className={
              isPartiallySelected ? "data-[state=checked]:bg-orange-500" : ""
            }
          />
          <span className="text-sm text-muted-foreground">
            {selectedUsers.length === 0
              ? `Select users (${users.length} total)`
              : `${selectedUsers.length} of ${users.length} selected`}
          </span>
          {selectedUsers.length > 0 && (
            <Badge variant="secondary">{selectedUsers.length} selected</Badge>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportUsers}>
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

                <DropdownMenuItem onClick={handleExportUsers}>
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
              Suspend Multiple Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{selectedUsers.length}</strong> user(s)? This will prevent
              them from accessing the platform and terminate all their active
              sessions.
              <div className="mt-4 max-h-32 overflow-y-auto">
                <div className="text-sm font-medium mb-2">
                  Users to be suspended:
                </div>
                <div className="space-y-1">
                  {selectedUserObjects.slice(0, 10).map((user) => (
                    <div key={user.id} className="text-sm">
                      • {user.name} ({user.email})
                    </div>
                  ))}
                  {selectedUserObjects.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {selectedUserObjects.length - 10} more
                    </div>
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
                : `Suspend ${selectedUsers.length} User(s)`}
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
              Activate Multiple Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate{" "}
              <strong>{selectedUsers.length}</strong> user(s)? This will restore
              their access to the platform.
              <div className="mt-4 max-h-32 overflow-y-auto">
                <div className="text-sm font-medium mb-2">
                  Users to be activated:
                </div>
                <div className="space-y-1">
                  {selectedUserObjects.slice(0, 10).map((user) => (
                    <div key={user.id} className="text-sm">
                      • {user.name} ({user.email})
                    </div>
                  ))}
                  {selectedUserObjects.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {selectedUserObjects.length - 10} more
                    </div>
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
                : `Activate ${selectedUsers.length} User(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
