"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  loginAction,
  createNewAccount,
  changePassword,
  sendResetEmail,
  resetPassword,
} from "@/app/_actions/auth";
import { startLoginTimer } from "@/lib/auth-monitoring";

/**
 * Hook for handling user login
 * Manages login flow with automatic redirect to welcome page on success
 *
 * @returns {Object} Object with login mutation, isPending state, and error
 *
 * @example
 * ```typescript
 * const { login, isPending, error } = useLoginMutation();
 *
 * const handleLogin = async () => {
 *   try {
 *     await login({ email: 'user@example.com', password: 'password' });
 *   } catch (error) {
 *     console.error('Login failed:', error);
 *   }
 * };
 * ```
 */
export function useLoginMutation() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      startLoginTimer();
      return await loginAction(email, password);
    },
    onSuccess: async (data) => {
      if (data.success) {
        setIsRedirecting(true);

        // Wait for session cookie to be readable before navigating
        let sessionReady = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!sessionReady && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          try {
            const { verifySession } = await import("@/lib/auth");
            const { isAuthenticated } = await verifySession();
            if (isAuthenticated) sessionReady = true;
          } catch {
            // not yet available, will retry
          }
          attempts++;
        }

        if (sessionReady) {
          router.push("/welcome");
        } else {
          setIsRedirecting(false);
          throw new Error("Session initialization failed");
        }
      }
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  return {
    login: mutation.mutateAsync,
    isPending: mutation.isPending || isRedirecting,
    error: mutation.error,
  };
}

/**
 * Hook for handling user signup
 * Manages signup flow with automatic redirect to home page on success
 *
 * @returns {Object} Object with signup mutation, isPending state, and error
 *
 * @example
 * ```typescript
 * const { signup, isPending, error } = useSignupMutation();
 *
 * const handleSignup = async () => {
 *   try {
 *     await signup({
 *       email: 'user@example.com',
 *       name: 'John Doe',
 *       password: 'password'
 *     });
 *   } catch (error) {
 *     console.error('Signup failed:', error);
 *   }
 * };
 * ```
 */
export function useSignupMutation() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: {
      email: string;
      name: string;
      password: string;
      role?: string;
      position?: string;
      manNumber?: string;
      nrcNumber?: string;
      contact?: string;
    }) => {
      return await createNewAccount(data);
    },
    onSuccess: async (data) => {
      if (data.success) {
        setIsRedirecting(true);

        // Add session verification for signup as well
        let sessionReady = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!sessionReady && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200));

          try {
            const { verifySession } = await import("@/lib/auth");
            const { isAuthenticated } = await verifySession();
            if (isAuthenticated) {
              sessionReady = true;
            }
          } catch {
            // Session not yet available, will retry
          }

          attempts++;
        }

        if (sessionReady) {
          router.push("/welcome");
        } else {
          setIsRedirecting(false);
          throw new Error("Session initialization failed after signup");
        }
      }
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  return {
    signup: mutation.mutateAsync,
    isPending: mutation.isPending || isRedirecting,
    error: mutation.error,
  };
}

/**
 * Hook for sending password reset email
 * Sends reset link to user's email address
 *
 * @returns {Object} Object with sendResetEmail mutation and loading state
 *
 * @example
 * ```typescript
 * const { sendResetEmail, isPending } = useSendResetEmailMutation();
 *
 * const handleForgotPassword = async () => {
 *   try {
 *     await sendResetEmail({ email: 'user@example.com' });
 *   } catch (error) {
 *     console.error('Failed to send reset email:', error);
 *   }
 * };
 * ```
 */
export function useSendResetEmailMutation() {
  const mutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      return await sendResetEmail(email);
    },
    onError: () => {},
  });

  return {
    sendResetEmail: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for resetting password with reset token
 * Completes the password reset flow
 *
 * @returns {Object} Object with resetPassword mutation and loading state
 *
 * @example
 * ```typescript
 * const { resetPassword, isPending } = useResetPasswordMutation();
 *
 * const handleResetPassword = async () => {
 *   try {
 *     await resetPassword({
 *       token: 'reset-token-from-email',
 *       newPassword: 'newPassword123'
 *     });
 *   } catch (error) {
 *     console.error('Password reset failed:', error);
 *   }
 * };
 * ```
 */
export function useResetPasswordMutation() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      return await resetPassword(token, newPassword);
    },
    onSuccess: (data) => {
      if (data.success) {
        router.push("/login?password_reset=true");
      }
    },
    onError: () => {},
  });

  return {
    resetPassword: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for changing user's password
 * Requires current password verification for security
 *
 * @returns {Object} Object with changePassword mutation and loading state
 *
 * @example
 * ```typescript
 * const { changePassword, isPending } = useChangePasswordMutation();
 *
 * const handleChangePassword = async () => {
 *   try {
 *     await changePassword({
 *       oldPassword: 'currentPassword123',
 *       newPassword: 'newPassword123'
 *     });
 *   } catch (error) {
 *     console.error('Failed to change password:', error);
 *   }
 * };
 * ```
 */
export function useChangePasswordMutation() {
  const mutation = useMutation({
    mutationFn: async ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => {
      return await changePassword(oldPassword, newPassword);
    },
    onError: () => {},
  });

  return {
    changePassword: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
