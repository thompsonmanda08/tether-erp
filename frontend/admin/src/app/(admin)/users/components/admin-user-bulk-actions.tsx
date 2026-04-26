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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  UserCheck,
  UserX,
  Unlock,
  Key,
  Shield,
  Trash2,
  ChevronDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkUpdateAdminUsers,
  type AdminRole,
} from "@/app/_actions/admin-users";

interface AdminUserBulkActionsProps {
  selectedUsers: string[];
  onActionComplete: () => void;
  roles?: AdminRole[];
}

interface BulkActionProgress {
  total: number;
  completed: number;
  failed: number;
  isRunning: boolean;
}

export function AdminUserBulkActions({
  selectedUsers,
  onActionComplete,
  roles = [],
}: AdminUserBulkActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [progress, setProgress] = useState<BulkActionProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    isRunning: false,
  });

  const bulkActions = [
    {
      id: "activate",
      label: "Activate Users",
      icon: UserCheck,
      description: "Activate selected admin users",
      variant: "default" as const,
    },
    {
      id: "deactivate",
      label: "Deactivate Users",
      icon: UserX,
      description: "Deactivate selected admin users",
      variant: "secondary" as const,
    },
    {
      id: "unlock",
      label: "Unlock Accounts",
      icon: Unlock,
      description: "Unlock selected admin user accounts",
      variant: "default" as const,
    },
    {
      id: "reset_password",
      label: "Reset Passwords",
      icon: Key,
      description: "Reset passwords for selected admin users",
      variant: "secondary" as const,
    },
    {
      id: "add_roles",
      label: "Add Roles",
      icon: Shield,
      description: "Add roles to selected admin users",
      variant: "default" as const,
      requiresRoles: true,
    },
    {
      id: "remove_roles",
      label: "Remove Roles",
      icon: Shield,
      description: "Remove roles from selected admin users",
      variant: "secondary" as const,
      requiresRoles: true,
    },
  ];

  const handleActionSelect = (actionId: string) => {
    setSelectedAction(actionId);
    setSelectedRoles([]);
    setShowDialog(true);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, roleId]);
    } else {
      setSelectedRoles((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const executeBulkAction = async () => {
    const action = bulkActions.find((a) => a.id === selectedAction);
    if (!action) return;

    setProgress({
      total: selectedUsers.length,
      completed: 0,
      failed: 0,
      isRunning: true,
    });

    try {
      let updates: any = {};

      switch (selectedAction) {
        case "activate":
          updates.is_active = true;
          break;
        case "deactivate":
          updates.is_active = false;
          break;
        case "unlock":
          updates.unlock = true;
          break;
        case "reset_password":
          updates.reset_password = true;
          break;
        case "add_roles":
          if (selectedRoles.length === 0) {
            toast.error("Please select at least one role to add");
            return;
          }
          updates.add_roles = selectedRoles;
          break;
        case "remove_roles":
          if (selectedRoles.length === 0) {
            toast.error("Please select at least one role to remove");
            return;
          }
          updates.remove_roles = selectedRoles;
          break;
      }

      const result = await bulkUpdateAdminUsers(selectedUsers, updates);

      if (result.success) {
        setProgress((prev) => ({
          ...prev,
          completed: selectedUsers.length,
          isRunning: false,
        }));
        toast.success(`${action.label} completed successfully`);
        onActionComplete();
        setTimeout(() => setShowDialog(false), 2000);
      } else {
        setProgress((prev) => ({
          ...prev,
          failed: selectedUsers.length,
          isRunning: false,
        }));
        toast.error(`Failed to ${action.label.toLowerCase()}`);
      }
    } catch (error) {
      console.error("Error executing bulk action:", error);
      setProgress((prev) => ({
        ...prev,
        failed: selectedUsers.length,
        isRunning: false,
      }));
      toast.error(`Failed to ${action.label.toLowerCase()}`);
    }
  };

  const selectedAction_obj = bulkActions.find((a) => a.id === selectedAction);
  const progressPercentage =
    progress.total > 0
      ? ((progress.completed + progress.failed) / progress.total) * 100
      : 0;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{selectedUsers.length} selected</Badge>
          <span className="text-sm text-muted-foreground">
            Bulk actions for admin users
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Select Action</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {bulkActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleActionSelect(action.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={onActionComplete}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction_obj && (
                <selectedAction_obj.icon className="h-5 w-5" />
              )}
              {selectedAction_obj?.label}
            </DialogTitle>
            <DialogDescription>
              {selectedAction_obj?.description} for {selectedUsers.length}{" "}
              selected admin users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning for destructive actions */}
            {["deactivate", "remove_roles"].includes(selectedAction) && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  This action will affect {selectedUsers.length} admin users and
                  may impact their access.
                </p>
              </div>
            )}

            {/* Role Selection */}
            {selectedAction_obj?.requiresRoles && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select Roles{" "}
                  {selectedAction === "add_roles" ? "to Add" : "to Remove"}
                </Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        id={`bulk-role-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={(checked) =>
                          handleRoleToggle(role.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`bulk-role-${role.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {role.display_name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                      {role.is_system_role && (
                        <Badge variant="destructive" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {selectedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedRoles.map((roleId) => {
                      const role = roles.find((r) => r.id === roleId);
                      return (
                        <Badge
                          key={roleId}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role?.display_name}
                          <button
                            onClick={() => handleRoleToggle(roleId, false)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {progress.isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>
                    {progress.completed + progress.failed} / {progress.total}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            {/* Results */}
            {!progress.isRunning &&
              (progress.completed > 0 || progress.failed > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Results:</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      ✓ {progress.completed} successful
                    </span>
                    {progress.failed > 0 && (
                      <span className="text-red-600">
                        ✗ {progress.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={progress.isRunning}
            >
              {progress.isRunning ? "Processing..." : "Cancel"}
            </Button>
            <Button
              onClick={executeBulkAction}
              disabled={
                progress.isRunning ||
                (selectedAction_obj?.requiresRoles &&
                  selectedRoles.length === 0)
              }
              variant={selectedAction_obj?.variant}
              isLoading={progress.isRunning}
              loadingText="Processing..."
            >
              {selectedAction_obj?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
