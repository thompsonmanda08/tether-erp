"use server";

import { getCurrentUser, updateAuthSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { APIResponse } from "@/types";
import authenticatedApiClient from "./api-config";

/**
 * Get current user profile (full, including preferences)
 */
export async function getUserProfile(): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: "/api/v1/auth/profile",
      method: "GET",
    });

    const user = response.data.data;
    // Extract avatar from preferences to top-level for consistency
    const avatarUrl = user?.preferences?.avatar || null;

    return {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        ...user,
        avatar: avatarUrl,
      },
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve profile",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Update account settings — persists name, email, and all preferences to the DB.
 * Calls: PUT /api/v1/auth/profile
 */
export async function updateAccountSettings(data: {
  name: string;
  email: string;
  position?: string;
  manNumber?: string;
  nrcNumber?: string;
  contact?: string;
  preferences: {
    avatar?: string;
    department?: string;
    language?: string;
    theme?: string;
    timezone?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    activityNotifications?: boolean;
  };
}): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: "/api/v1/auth/profile",
      method: "PUT",
      data,
    });

    const updatedUser = response.data.data;

    // Sync the session cookie with the updated profile so page reloads
    // reflect the new name, email, and preferences without requiring re-login.
    const currentUser = await getCurrentUser();
    if (currentUser && updatedUser) {
      // Extract avatar from preferences to top-level for easier access
      const avatarUrl =
        updatedUser.preferences?.avatar || (currentUser as any).avatar;

      await updateAuthSession({
        user: {
          ...(currentUser as any),
          name: updatedUser.name ?? currentUser.name,
          email: updatedUser.email ?? currentUser.email,
          position: updatedUser.position,
          manNumber: updatedUser.manNumber,
          nrcNumber: updatedUser.nrcNumber,
          contact: updatedUser.contact,
          preferences: updatedUser.preferences,
          // Set avatar at top level for components to access easily
          avatar: avatarUrl,
        },
      });
      revalidatePath("/settings");
    }

    return {
      success: true,
      message: "Settings saved successfully",
      data: updatedUser,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to save settings",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<APIResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        message: "User not authenticated",
        data: null,
        status: 401,
        statusText: "UNAUTHORIZED",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        message: "Passwords do not match",
        data: null,
        status: 400,
        statusText: "BAD_REQUEST",
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long",
        data: null,
        status: 400,
        statusText: "BAD_REQUEST",
      };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        message: "New password must be different from current password",
        data: null,
        status: 400,
        statusText: "BAD_REQUEST",
      };
    }

    const response = await authenticatedApiClient({
      url: "/api/v1/auth/change-password",
      method: "POST",
      data: { currentPassword, newPassword, confirmPassword },
    });

    return {
      success: true,
      message: "Password changed successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to change password",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Get user sessions (active login sessions) — calls real backend endpoint
 */
export async function getUserSessions(): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: "/api/v1/auth/sessions",
      method: "GET",
    });

    return {
      success: true,
      message: "Sessions retrieved successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to retrieve sessions",
      data: null,
      status: 500,
      statusText: "ERROR",
    };
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<APIResponse> {
  try {
    const response = await authenticatedApiClient({
      url: `/api/v1/auth/sessions/${sessionId}`,
      method: "DELETE",
    });

    return {
      success: true,
      message: "Session revoked successfully",
      data: response.data.data,
      status: 200,
      statusText: "OK",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to revoke session",
      data: null,
      status: error.response?.status || 500,
      statusText: "ERROR",
    };
  }
}
