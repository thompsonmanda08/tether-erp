"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PASSWORD_PATTERN } from "@/lib/constants";
import { ChangePassword, ErrorState } from "@/types";
import CustomAlert from "../ui/custom-alert";
import { cn, notify } from "@/lib/utils";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { changePassword, clearChangePasswordFlag } from "@/app/_actions/auth";
import { Eye, EyeOff, LockIcon } from "lucide-react";

export default function FirstLogin({ open }: { open?: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<ErrorState>({
    status: false,
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ChangePassword>({
    currentPassword: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    password: false,
    newPassword: false,
    confirmPassword: false,
  });

  const togglePassword = (
    type: "password" | "newPassword" | "confirmPassword"
  ) => {
    setShowPassword((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const updatePasswordField = (fields: Partial<ChangePassword>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  async function handlePasswordChange() {
    setIsLoading(true);

    if (
      formData?.newPassword?.length < 8 ||
      !PASSWORD_PATTERN.test(formData?.newPassword)
    ) {
      notify({
        title: "Error", // This will be replaced by sonner.toast
        type: "error",
        description: "Operation Failed! Try again",
      });
      setIsLoading(false);
      setError({
        status: true,
        onConfirmPassword: true,
        message:
          "Passwords needs to contain at least 8 characters (consisting of lowercase, uppercase, symbols) and have no spaces",
      });

      return;
    }

    // Send New password details to the backend
    const res = await changePassword(
      formData.oldPassword || formData.currentPassword,
      formData.newPassword
    );

    // If password change success - clear the must-change-password flag, invalidate caches
    if (res.success) {
      await clearChangePasswordFlag();
      notify({
        type: "success",
        description: "Password Changed Successfully",
      });
      queryClient.invalidateQueries();
      setIsLoading(false);

      return;
    }

    setIsLoading(false);
    notify({
      type: "error",
      description: res.message,
    });
  }

  useEffect(() => {
    setError({ message: "", status: false });
  }, [formData]);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription className="text-foreground/70 text-sm leading-6 font-medium italic">
            Your login was successful. As a security measure, we require all
            users to change their password on their first login.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-y-2 py-2">
          <div className="relative">
            <LockIcon className="text-foreground/50 absolute top-2/3 left-3 h-5 w-5 -translate-y-1/2" />
            <Input
              id="password"
              autoFocus
              required
              label="Old Password"
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              type={showPassword.password ? "text" : "password"}
              className={cn("pl-10", !showPassword.password && "text-2xl!")}
              value={formData?.oldPassword}
              onChange={(e) =>
                updatePasswordField({ oldPassword: e.target.value })
              }
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => togglePassword("password")}
              className="absolute top-2/3 right-3 -translate-y-1/3 text-muted-foreground transition-colors hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword.password ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <LockIcon className="text-foreground/50 absolute top-2/3 left-3 h-5 w-5 -translate-y-1/2" />
            <Input
              id="password"
              autoFocus
              required
              disabled={isLoading}
              label="New Password"
              className={cn("pl-10", !showPassword.newPassword && "text-2xl!")}
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              type={showPassword.newPassword ? "text" : "password"}
              value={formData?.newPassword}
              onChange={(e) =>
                updatePasswordField({ newPassword: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => togglePassword("newPassword")}
              className="absolute top-2/3 right-3 -translate-y-1/3 text-muted-foreground transition-colors hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword.newPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <LockIcon className="text-foreground/50 absolute top-2/3 left-3 h-5 w-5 -translate-y-1/2" />
            <Input
              id="password"
              autoFocus
              required
              disabled={isLoading}
              className={cn(
                "pl-10",
                !showPassword.confirmPassword && "text-2xl!"
              )}
              errorText={"Passwords do not match"}
              isInvalid={
                (formData?.confirmPassword !== formData?.newPassword &&
                  String(formData?.confirmPassword)?.length > 6) ||
                Boolean(error?.onConfirmPassword)
              }
              label="Confirm New Password"
              type={showPassword.confirmPassword ? "text" : "password"}
              value={formData?.confirmPassword}
              onChange={(e) =>
                updatePasswordField({ confirmPassword: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => togglePassword("confirmPassword")}
              className="absolute top-2/3 right-3 -translate-y-1/3 text-muted-foreground transition-colors hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword.confirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {error?.status && (
            <div className="mx-auto mt-2 flex w-full flex-col items-center justify-center gap-4">
              <CustomAlert type="error" message={error.message} />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col items-center sm:flex-col sm:items-center sm:justify-center">
          <Button
            className="w-full"
            disabled={
              !formData?.oldPassword ||
              formData?.newPassword.length < 8 ||
              isLoading
            }
            isLoading={isLoading}
            onClick={handlePasswordChange}
          >
            Change Password
          </Button>
          <p className="text-primary-800 text-center text-sm leading-6 font-medium italic">
            Your new password needs to contain at least 8 characters which
            contains at least one uppercase, lowercase and symbol.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
