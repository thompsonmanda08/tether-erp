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
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Key,
  LogIn,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { notify } from "@/lib/utils";
import {
  resetUserPassword,
  impersonateUser,
  type PlatformUser,
} from "@/app/_actions/users";
import { UserEditDialog } from "./user-edit-dialog";

interface UserActionsDropdownProps {
  user: PlatformUser;
  onStatusChange: (
    userId: string,
    status: "active" | "suspended" | "inactive",
  ) => void;
  onUserUpdated: () => void;
}

export function UserActionsDropdown({
  user,
  onStatusChange,
  onUserUpdated,
}: UserActionsDropdownProps) {
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuspendUser = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(user.id, "suspended");
      setShowSuspendDialog(false);
    } catch (error) {
      notify({ title: "Failed to suspend user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateUser = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(user.id, "active");
      setShowActivateDialog(false);
    } catch (error) {
      notify({ title: "Failed to activate user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const result = await resetUserPassword(user.id, true);
      if (result.success) {
        notify({ title: "Password reset email sent to user", type: "success" });
        setShowResetPasswordDialog(false);
        onUserUpdated();
      } else {
        notify({ title: result.message || "Failed to reset password", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to reset password", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonateUser = async () => {
    setIsLoading(true);
    try {
      const result = await impersonateUser(user.id);
      if (result.success) {
        const data = (result as any).data;
        notify({ title: `Impersonation token generated. Token expires in ${data?.expires_in || 900} seconds.`, type: "success" });
        // Copy token to clipboard for use
        if (data?.token) {
          await navigator.clipboard.writeText(data.token);
          notify({ title: "Impersonation token copied to clipboard" });
        }
      } else {
        notify({ title: result.message || "Failed to impersonate user", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to impersonate user", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const canSuspend = user.status === "active";
  const canActivate = user.status === "suspended" || user.status === "inactive";
  const canImpersonate = user.status === "active" && user.email_verified;

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
          <DropdownMenuLabel>User Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowResetPasswordDialog(true)}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {canActivate && (
            <DropdownMenuItem onClick={() => setShowActivateDialog(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate User
            </DropdownMenuItem>
          )}

          {canSuspend && (
            <DropdownMenuItem
              onClick={() => setShowSuspendDialog(true)}
              className="text-red-600"
            >
              <UserX className="mr-2 h-4 w-4" />
              Suspend User
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {canImpersonate && (
            <DropdownMenuItem onClick={handleImpersonateUser}>
              <LogIn className="mr-2 h-4 w-4" />
              Impersonate User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend User Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Suspend User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{user.name}</strong>?
              This will prevent them from accessing the platform and terminate
              all their active sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Suspending..." : "Suspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate User Dialog */}
      <AlertDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              Activate User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate <strong>{user.name}</strong>?
              This will restore their access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivateUser}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Activating..." : "Activate User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              Reset Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for{" "}
              <strong>{user.name}</strong>? A password reset email will be sent
              to <strong>{user.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Edit Dialog */}
      <UserEditDialog
        user={user}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUserUpdated={onUserUpdated}
      />
    </>
  );
}
