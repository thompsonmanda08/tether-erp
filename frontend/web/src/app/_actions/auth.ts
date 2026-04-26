"use server";

import { redirect } from "next/navigation";
import {
  hasRole as checkRole,
  isAdmin as checkAdmin,
  setScreenLockCookie,
  clearScreenLockCookie,
  getScreenLockState,
  deleteSession,
  updateAuthSession,
  createAuthSession,
  getCurrentUser,
  verifySession,
} from "@/lib/auth";
import { cache } from "react";

import { APIResponse } from "@/types";
import { checkIsAdminAction } from "./session";
import authenticatedApiClient, {
  axios,
  handleError,
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
} from "./api-config";

/**
 * Login with email and password using backend API
 */
export async function loginAction(
  email: string,
  password: string,
): Promise<APIResponse<any>> {
  const url = `/api/v1/auth/login`;
  try {
    const query = await axios.post(url, {
      email,
      password,
    });

    const response = query?.data;

    // Backend returns: { success, message, data: { accessToken, refreshToken, expiresIn, user, organization } }
    if (!response.success || !response.data?.accessToken) {
      return unauthorizedResponse(response.message || "Login failed");
    }

    // Extract avatar from preferences to top-level for easier component access
    const user = response.data.user;
    const avatarUrl = user.preferences?.avatar || null;

    // Create session with backend token and expiration
    await createAuthSession({
      access_token: response.data.accessToken,
      refresh_token: response.data.refreshToken,
      role: user.role,
      user_id: user.id,
      organization_id: response.data.organization?.id,
      expiresIn: response.data.expiresIn, // Use backend's expiration time
      change_password: user.mustChangePassword === true,
      user: {
        ...user,
        avatar: avatarUrl, // Set avatar at top level for easy access
      },
    });

    return successResponse(response.data.user, response.message);
  } catch (error: Error | any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Logout the current user
 */
export async function logoutAction(): Promise<APIResponse<null>> {
  try {
    await deleteSession();
    return successResponse(null, "Logged out successfully");
  } catch (error: any) {
    return handleError(error, "POST", "/api/v1/auth/logout");
  }
}

/**
 * Check if user has specific role
 */
export async function hasRoleAction(role: string | string[]): Promise<boolean> {
  try {
    return await checkRole(role as any);
  } catch {
    return false;
  }
}

/**
 * Check if user is admin
 */
export async function isAdminAction(): Promise<boolean> {
  try {
    return await checkAdmin();
  } catch {
    return false;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require specific role - redirect to workflows if user doesn't have role
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!allowedRoles.includes(user.role)) {
    redirect("/home");
  }
  return user;
}

/**
 * Lock screen on user idle
 * Sets screen lock cookie when user becomes idle
 * @param isLocked - true to lock, false to unlock
 * @returns true if successful, false otherwise
 */
export async function lockScreenOnUserIdle(
  isLocked: boolean,
): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    if (isLocked) {
      await setScreenLockCookie(true);
    } else {
      await clearScreenLockCookie();
    }

    return true;
  } catch (error: any) {
    console.error("Error locking screen on idle:", error);
    return false;
  }
}

/**
 * Check screen lock state from cookie
 * Returns true if screen is locked, false otherwise
 */
export async function checkScreenLockState(): Promise<boolean> {
  try {
    return await getScreenLockState();
  } catch (error: any) {
    console.error("Error checking screen lock state:", error);
    return false;
  }
}

/**
 * Log user out due to session timeout or inactivity
 * Deletes all session cookies and clears auth state
 * @param reason - reason for logout (e.g., "Session expired")
 * @returns success response
 */
export async function logUserOut(
  reason: string = "User logged out",
): Promise<APIResponse<null>> {
  try {
    // Delete JWT sessions and screen lock state
    await deleteSession();
    return successResponse(null, reason);
  } catch (error: any) {
    console.error("Error logging out user:", error);
    return handleError(error, "POST", "/api/v1/auth/logout");
  }
}

/**
 * Refresh user token to extend session
 * Called when user confirms they're still active
 * @returns success response with token info
 */
export async function getRefreshToken(): Promise<APIResponse<any>> {
  const url = `/api/v1/auth/refresh`;

  try {
    const { session } = await verifySession();

    if (!session?.refresh_token) {
      return unauthorizedResponse("No refresh token available");
    }

    // Call backend refresh endpoint with the stored refresh token
    const response = await authenticatedApiClient({
      url,
      method: "POST",
      data: { refreshToken: session.refresh_token },
    });

    // Backend returns: { success, message, data: { accessToken, expiresIn, refreshToken? } }
    const newToken = response.data.data?.accessToken;
    const expiresIn = response.data.data?.expiresIn;
    const newRefreshToken = response.data.data?.refreshToken;

    if (!newToken) {
      return unauthorizedResponse("Failed to refresh token");
    }

    // Calculate expiration time using backend's expiresIn value
    const expirationMs = expiresIn ? expiresIn * 1000 : 30 * 60 * 1000; // fallback to 30 minutes
    const newExpiresAt = new Date(Date.now() + expirationMs);

    // Update session with new tokens (both access and refresh if rotated)
    const sessionUpdate: any = {
      access_token: newToken,
      expiresAt: newExpiresAt,
      expiresIn,
    };

    if (newRefreshToken) {
      sessionUpdate.refresh_token = newRefreshToken;
    }

    await updateAuthSession(sessionUpdate);

    return successResponse(
      {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn,
        expiresAt: newExpiresAt,
      },
      "Token refreshed successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Change user password
 * @param oldPassword - Current password
 * @param newPassword - New password
 * @returns success response
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<APIResponse<null>> {
  const url = `/api/v1/auth/change-password`;

  try {
    await authenticatedApiClient({
      url,
      method: "POST",
      data: {
        currentPassword: oldPassword, // Match backend parameter name
        newPassword: newPassword,
      },
    });

    return successResponse(null, "Password changed successfully");
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Clear the must-change-password flag from the session cookie after a
 * successful first-login password change.
 */
export async function clearChangePasswordFlag(): Promise<void> {
  await updateAuthSession({ change_password: false });
}

/**
 * Verify admin role
 */
export const verifyAdminRole = cache(async (): Promise<APIResponse> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    const isAdminUser = await checkIsAdminAction();

    if (!isAdminUser) {
      return {
        success: false,
        message: "Admin access required",
        data: null,
        status: 403,
        statusText: "FORBIDDEN",
      } as APIResponse;
    }

    return successResponse(
      {
        user,
        role: user.role,
      },
      "Admin access verified",
    );
  } catch (error: any) {
    return handleError(error, "GET", "/api/v1/auth/admin/verify");
  }
});

/**
 * Send password reset email
 * Calls: POST /api/v1/auth/password-reset/request
 */
export async function sendResetEmail(email: string): Promise<APIResponse> {
  const url = "/api/v1/auth/password-reset/request";
  try {
    const response = await axios.post(url, { email });
    return successResponse(
      response.data?.data || { email },
      response.data?.message || "Password reset email sent successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Reset password with token
 * Calls: POST /api/v1/auth/password-reset/confirm
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<APIResponse> {
  const url = "/api/v1/auth/password-reset/confirm";
  try {
    const response = await axios.post(url, { token, newPassword });
    return successResponse(
      response.data?.data || {},
      response.data?.message || "Password reset successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Create new user account
 */
export async function createNewAccount(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
}): Promise<APIResponse<any>> {
  const url = `/api/v1/auth/register`;

  try {
    const response = await axios.post(url, {
      email: data.email,
      name: data.name,
      password: data.password,
      role: data.role || "admin", // Default to admin since users get their own organization
    });

    const responseData = response?.data;

    // Backend returns: { success, message, data: { token, accessToken, refreshToken, expiresIn, user, organization } }
    if (!responseData.success || !responseData.data?.accessToken) {
      return unauthorizedResponse(
        responseData.message || "Registration failed",
      );
    }

    // Extract avatar from preferences to top-level for easier component access
    const user = responseData.data.user;
    const avatarUrl = user.preferences?.avatar || null;

    // Create session with token AND org context
    await createAuthSession({
      access_token: responseData.data.accessToken,
      refresh_token: responseData.data.refreshToken,
      role: user.role,
      user_id: user.id,
      organization_id: responseData.data.organization?.id,
      expiresIn: responseData.data.expiresIn,
      user: {
        ...user,
        avatar: avatarUrl, // Set avatar at top level for easy access
      },
    });

    return successResponse(
      {
        user: responseData.data.user,
        organization: responseData.data.organization,
      },
      responseData.message,
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Check if user signup is available/enabled
 * This can be used to control registration availability
 */
export async function checkSignupAvailability(): Promise<
  APIResponse<{ enabled: boolean }>
> {
  try {
    // For now, always allow signups
    // In the future, this could check backend settings or environment variables
    return successResponse({ enabled: true }, "Signup availability checked");
  } catch (error: any) {
    return handleError(error, "GET", "/api/v1/auth/signup-availability");
  }
}

// ✅ Server action wrapper for getting server session
export const getServerSession = async () => await verifySession();
