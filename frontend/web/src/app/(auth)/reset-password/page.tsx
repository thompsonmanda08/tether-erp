"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/_actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import LoadingPage from "../register/loading";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  if (!token) {
    // If no token is provided, redirect to forgot password page
    router.push("/forgot-password");
    toast.error("No reset token provided.");
    return <LoadingPage />;
  }

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setMessage("Please enter both newPassword and password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const response = await resetPassword(token, newPassword);

    if (response.success) {
      const token = response.data.token;
      // Redirect to reset password page with token
      toast.success(response.message || "Password reset successfully!");
      setMessage("🎉 Password reset successfully! Redirecting...");
      router.push(`/login?password_reset=${true}`);
    } else {
      setMessage(`Error: ${response?.data?.message || response?.message}`);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-light text-black mb-2">
          Reset <span className="font-bold">Password</span>
        </h1>
        <p className="text-gray-600">Change your Password?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          id="newPassword"
          label="New Password"
          value={newPassword}
          isInvalid={newPassword.length < 6 && newPassword.length > 0}
          errorText="Password must be at least 6 characters."
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter your new password"
          disabled={isSubmitting}
        />
        <Input
          type="password"
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          isInvalid={
            confirmPassword !== newPassword && confirmPassword.length > 6
          }
          errorText="Passwords do not match."
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Enter your password again"
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          isLoading={isSubmitting}
        >
          Change Password
        </Button>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg text-center ${
              message.includes("🎉") || message.includes("successfully")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

export default function ResetForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
