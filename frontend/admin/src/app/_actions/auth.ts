"use server";

import {
  createAdminSession,
  deleteAdminSession,
  verifyAdminSession,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { axios, handleError } from "./api-config";

// Helper function for unauthenticated requests (login, register, etc.)
const unauthenticatedRequest = async (config: any) => {
  return await axios(config);
};

// ============================================================================
// TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

// ============================================================================
// AUTH ACTIONS
// ============================================================================

/**
 * Login admin user
 */
export async function loginAdmin(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await unauthenticatedRequest({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      data,
    });

    const result = response.data;

    // The backend wraps responses in { success, message, data }
    const apiResponse = result;
    const loginData = result.data; // The actual LoginResponse is in the data field

    if (!apiResponse.success) {
      return {
        success: false,
        message: apiResponse.message || "Login failed",
      };
    }

    if (!loginData || !loginData.user || !loginData.user.id) {
      console.error(
        "Invalid response structure - missing user data:",
        loginData,
      );
      return {
        success: false,
        message: "Invalid response from server - missing user data",
      };
    }

    // Only super_admin users are allowed to access the admin console
    if (loginData.user.role !== "super_admin") {
      return {
        success: false,
        message: "Access denied. Only super administrators can access the admin console.",
      };
    }

    // Create admin session with the response data
    await createAdminSession({
      access_token: loginData.accessToken,
      refresh_token: loginData.refreshToken,
      user_id: loginData.user.id,
      role: loginData.user.role,
      permissions: loginData.user.permissions || [],
      expiresIn: loginData.expiresIn,
      user: loginData.user,
    });

    return {
      success: true,
      message: apiResponse.message || "Login successful",
      data: loginData,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return handleError(error);
  }
}

/**
 * Logout admin user
 */
export async function logoutAdmin(): Promise<AuthResponse> {
  try {
    // Get current session to get the access token
    const { session } = await verifyAdminSession();

    if (session?.access_token) {
      // Call backend logout endpoint
      try {
        await unauthenticatedRequest({
          method: "POST",
          url: "/api/v1/admin/auth/logout",
          data: {
            refreshToken: session.refresh_token, // Use refresh token for logout
          },
        });
      } catch (error) {
        // Continue with local logout even if backend call fails
        console.warn("Backend logout failed:", error);
      }
    }

    // Delete local session
    await deleteAdminSession();

    return {
      success: true,
      message: "Logout successful",
    };
  } catch (error: any) {
    console.error("Logout error:", error);
    // Still delete local session even if there's an error
    await deleteAdminSession();
    return {
      success: true,
      message: "Logout completed",
    };
  }
}

/**
 * Forgot password request
 */
export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<AuthResponse> {
  try {
    const response = await unauthenticatedRequest({
      method: "POST",
      url: "/api/v1/auth/password-reset/request",
      data,
    });

    const apiResponse = response.data;

    return {
      success: apiResponse.success,
      message: apiResponse.message || "Password reset email sent successfully",
      data: apiResponse.data,
    };
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return handleError(error);
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  data: ResetPasswordRequest,
): Promise<AuthResponse> {
  try {
    const response = await unauthenticatedRequest({
      method: "POST",
      url: "/api/v1/auth/password-reset/confirm",
      data,
    });

    const apiResponse = response.data;

    return {
      success: apiResponse.success,
      message: apiResponse.message || "Password reset successfully",
      data: apiResponse.data,
    };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return handleError(error);
  }
}

/**
 * Refresh admin session
 */
export async function refreshAdminSession(): Promise<AuthResponse> {
  try {
    const { session } = await verifyAdminSession();

    if (!session?.refresh_token) {
      return {
        success: false,
        message: "No refresh token available",
      };
    }

    const response = await unauthenticatedRequest({
      method: "POST",
      url: "/api/v1/admin/auth/refresh",
      data: {
        refreshToken: session.refresh_token,
      },
    });

    const apiResponse = response.data;
    const result = apiResponse.data; // The actual TokenResponse is in the data field

    if (!apiResponse.success) {
      await deleteAdminSession();
      return {
        success: false,
        message: apiResponse.message || "Session refresh failed",
      };
    }

    // Update session with new tokens
    await createAdminSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user_id: session.user_id,
      role: session.role,
      permissions: session.permissions,
      expiresIn: result.expiresIn,
      user: session.user,
    });

    return {
      success: true,
      message: apiResponse.message || "Session refreshed successfully",
      data: result,
    };
  } catch (error: any) {
    console.error("Refresh session error:", error);
    await deleteAdminSession();
    return handleError(error);
  }
}

/**
 * Get current admin session status
 */
export async function getAdminSessionStatus() {
  try {
    const { isAuthenticated, session } = await verifyAdminSession();

    return {
      isAuthenticated,
      user: session?.user || null,
      role: session?.role || null,
      permissions: session?.permissions || [],
    };
  } catch (error) {
    console.error("Get session status error:", error);
    return {
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
    };
  }
}

/**
 * Logout and redirect to login page
 */
export async function logoutAndRedirect() {
  await logoutAdmin();
  redirect("/login");
}
