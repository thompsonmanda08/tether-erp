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
import {
  MoreHorizontal,
  Edit,
  Eye,
  UserX,
  UserCheck,
  Lock,
  Unlock,
  Key,
  Shield,
  Trash2,
  LogOut,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  activateAdminUser,
  deactivateAdminUser,
  unlockAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
  terminateAllAdminUserSessions,
  impersonateAdminUser,
  toggleTwoFactor,
  type AdminUser,
} from "@/app/_actions/admin-users";

interface AdminUserActionsDropdownProps {
  user: AdminUser;
  onAction: (action: string, user: AdminUser) => void;
  onUserUpdated: () => void;
  currentUserId?: string;
}

export function AdminUserActionsDropdown({
  user,
  onAction,
  onUserUpdated,
  currentUserId,
}: AdminUserActionsDropdownProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTerminateSessionsDialog, setShowTerminateSessionsDialog] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentUser = currentUserId === user.id;
  const canDelete = !user.is_super_admin && !isCurrentUser;
  const canImpersonate = !isCurrentUser;

  const handleActivateUser = async () => {
    setIsLoading(true);
    try {
      const result = await activateAdminUser(user.id);
      if (result.success) {
        toast.success("Admin user activated successfully");
        onUserUpdated();
      } else {
        toast.error("Failed to activate admin user");
      }
    } catch (error) {
      console.error("Error activating user:", error);
      toast.error("Failed to activate admin user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (isCurrentUser) {
      toast.error("Cannot deactivate your own account");
      return;
    }

    setIsLoading(true);
    try {
      const result = await deactivateAdminUser(user.id);
      if (result.success) {
        toast.success("Admin user deactivated successfully");
        onUserUpdated();
      } else {
        toast.error("Failed to deactivate admin user");
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("Failed to deactivate admin user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    setIsLoading(true);
    try {
      const result = await unlockAdminUser(user.id);
      if (result.success) {
        toast.success("Admin user unlocked successfully");
        onUserUpdated();
      } else {
        toast.error("Failed to unlock admin user");
      }
    } catch (error) {
      console.error("Error unlocking user:", error);
      toast.error("Failed to unlock admin user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const result = await resetAdminUserPassword(user.id, true);
      if (result.success) {
        toast.success("Password reset email sent successfully");
        onUserUpdated();
      } else {
        toast.error("Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    setIsLoading(true);
    try {
      const result = await toggleTwoFactor(user.id, !user.two_factor_enabled);
      if (result.success) {
        toast.success(
          `Two-factor authentication ${user.two_factor_enabled ? "disabled" : "enabled"} for user`,
        );
        onUserUpdated();
      } else {
        toast.error(result.message || "Failed to toggle 2FA");
      }
    } catch (error) {
      toast.error("Failed to toggle two-factor authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsLoading(true);
    try {
      const result = await deleteAdminUser(user.id);
      if (result.success) {
        toast.success("Admin user deleted successfully");
        onUserUpdated();
        setShowDeleteDialog(false);
      } else {
        toast.error("Failed to delete admin user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete admin user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateAllSessions = async () => {
    setIsLoading(true);
    try {
      const result = await terminateAllAdminUserSessions(user.id);
      if (result.success) {
        toast.success("All sessions terminated successfully");
        onUserUpdated();
        setShowTerminateSessionsDialog(false);
      } else {
        toast.error("Failed to terminate sessions");
      }
    } catch (error) {
      console.error("Error terminating sessions:", error);
      toast.error("Failed to terminate sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonateUser = async () => {
    setIsLoading(true);
    try {
      const result = await impersonateAdminUser(user.id);
      if (result.success) {
        const data = (result as any).data;
        toast.success(
          `Impersonation token generated. Token expires in ${data?.expires_in || 900} seconds.`,
        );
        if (data?.impersonation_token) {
          await navigator.clipboard.writeText(data.impersonation_token);
          toast.info("Impersonation token copied to clipboard");
        }
      } else {
        toast.error(result.message || "Failed to impersonate admin user");
      }
    } catch (error) {
      toast.error("Failed to impersonate admin user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => onAction("view", user)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => onAction("edit", user)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Status Actions */}
          {user.is_active ? (
            <DropdownMenuItem
              onClick={handleDeactivateUser}
              disabled={isCurrentUser}
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleActivateUser}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </DropdownMenuItem>
          )}

          {/* Unlock Account */}
          {user.is_locked && (
            <DropdownMenuItem onClick={handleUnlockUser}>
              <Unlock className="mr-2 h-4 w-4" />
              Unlock Account
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Security Actions */}
          <DropdownMenuItem onClick={handleResetPassword}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>

          {/* Session Management */}
          {user.session_count > 0 && (
            <DropdownMenuItem
              onClick={() => setShowTerminateSessionsDialog(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Terminate Sessions
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Impersonation (Super Admin only) */}
          {canImpersonate && (
            <DropdownMenuItem onClick={handleImpersonateUser}>
              <Shield className="mr-2 h-4 w-4" />
              Impersonate User
            </DropdownMenuItem>
          )}

          {/* Delete User */}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin user "{user.full_name}"?
              This action cannot be undone and will permanently remove the user
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Sessions Confirmation Dialog */}
      <AlertDialog
        open={showTerminateSessionsDialog}
        onOpenChange={setShowTerminateSessionsDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate All Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate all active sessions for "
              {user.full_name}"? They will be logged out immediately from all
              devices and will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateAllSessions}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Terminating..." : "Terminate Sessions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
