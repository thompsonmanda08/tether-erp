"use server";
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { AuthSession, User, UserType, AuthUser, UserRole } from "@/types";
import { SESSION_CONFIG } from "@/lib/session-config";
import {
  AUTH_SESSION,
  USER_SESSION,
  PERMISSIONS_SESSION,
  SCREEN_LOCK_SESSION,
} from "@/lib/constants";

// ============================================================================
// TYPES
// ============================================================================

// Re-export AuthUser from types for backward compatibility
export type { AuthUser } from "@/types";

// ============================================================================
// JWT ENCRYPTION/DECRYPTION
// ============================================================================

const getSecretKey = () => {
  const secretKey = process.env.AUTH_SECRET;
  if (!secretKey || secretKey.length < 32) {
    throw new Error(
      "JWT_SECRET or AUTH_SECRET environment variable must be at least 32 characters",
    );
  }
  return secretKey;
};

const getKey = () => new TextEncoder().encode(getSecretKey());

/**
 * Encrypt payload into JWT token
 */
export async function encrypt(payload: any, expirationTime: string = "1h") {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be a non-empty object");
  }

  const key = getKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key);
}

/**
 * Decrypt JWT token
 */
export async function decrypt(token: any) {
  if (!token || typeof token !== "string") {
    return {
      success: false,
      message: "No session token provided",
      data: null,
      status: 500,
      statusText: "UNAUTHENTICATED",
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      success: false,
      message: "Invalid token format",
      data: null,
      status: 500,
      statusText: "INVALID_TOKEN_FORMAT",
    };
  }

  try {
    const key = getKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      clockTolerance: 15,
    });

    return payload;
  } catch (error: Error | any) {
    if (error.code === "ERR_JWS_INVALID") {
      return {
        success: false,
        message: "Invalid token signature",
        data: null,
        status: 500,
        statusText: "INVALID_TOKEN_SIGNATURE",
      };
    }

    if (error.code === "ERR_JWT_EXPIRED") {
      return {
        success: false,
        message: "Token expired",
        data: null,
        status: 500,
        statusText: "TOKEN_EXPIRED",
      };
    }

    return {
      success: false,
      message: "Failed to verify session",
      data: null,
      status: 500,
      statusText: "TOKEN_VERIFICATION_FAILED",
    };
  }
}

// ============================================================================
// BASIC AUTH FUNCTIONS (SIMULATED)
// ============================================================================

/**
 * Get the current authenticated session
 */
export async function getSession(): Promise<AuthSession | null> {
  const { session } = await verifySession();
  return session;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { session } = await verifySession();
  return (session?.user as AuthUser) || null;
}

export async function createAuthSession({
  access_token,
  refresh_token,
  role,
  user_id,
  change_password,
  mfa_required,
  organization_id,
  expiresIn,
  user, // Add user parameter
}: {
  access_token: string;
  refresh_token?: string;
  role: UserType;
  user_id?: string;
  change_password?: boolean;
  mfa_required?: boolean;
  organization_id?: string;
  expiresIn?: number; // Add expiresIn parameter (in seconds)
  user?: AuthUser; // Add user parameter
}): Promise<void> {
  // Use backend's expiresIn value if provided, otherwise fall back to session config
  const expirationMs = expiresIn
    ? expiresIn * 1000
    : SESSION_CONFIG.SESSION_TTL;
  const expiresAt = new Date(Date.now() + expirationMs);

  const newSession: AuthSession = {
    access_token: access_token || "",
    refresh_token: refresh_token,
    role,
    user_id,
    change_password,
    mfa_required,
    organization_id,
    expiresAt,
    expiresIn, // Add expiresIn to the session for token refresh logic
    user: user as any, // Add the user object to the session
  };

  // Use dynamic expiration time for JWT encryption
  const expirationTime = `${Math.ceil(expirationMs / 1000)}s`;
  const token = await encrypt(newSession, expirationTime);

  // Ensure `session` is successfully created before setting the cookie
  if (token) {
    (await cookies()).set(AUTH_SESSION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "strict",
      path: "/",
    });
  } else {
    throw new Error("Failed to create session token.");
  }
}

/**
 * Check if user has required role
 */
export async function hasRole(
  requiredRole: UserRole | UserRole[],
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Check if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

// ============================================================================
// JWT SESSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Update auth session with new fields
 */
export async function updateAuthSession(
  fields: any,
): Promise<AuthSession | undefined> {
  const { isAuthenticated: isLoggedIn, session: oldSession } =
    await verifySession();

  if (isLoggedIn && oldSession) {
    const cleanedOldSession = Object.fromEntries(
      Object.entries(oldSession).filter(([_, value]) => value !== null),
    ) as AuthSession;

    const newSession: AuthSession = {
      ...cleanedOldSession,
      ...fields,
    };

    const expiresAt = fields?.expiresAt
      ? new Date(fields.expiresAt)
      : oldSession?.expiresAt
        ? new Date(oldSession.expiresAt)
        : new Date(Date.now() + 30 * 60 * 1000);

    newSession.expiresAt = expiresAt;

    // Use dynamic expiration time for JWT encryption
    const expirationMs = expiresAt.getTime() - Date.now();
    const expirationTime = `${Math.ceil(expirationMs / 1000)}s`;

    const session = await encrypt(newSession, expirationTime);

    if (session) {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_SESSION, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        sameSite: "strict",
        path: "/",
      });

      return newSession;
    } else {
      throw new Error("Failed to update session token.");
    }
  }
  return;
}

/**
 * Verify the current session is valid
 */
export async function verifySession(): Promise<{
  isAuthenticated: boolean;
  session: AuthSession | null;
  permissions?: any[];
  [key: string]: any;
}> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(AUTH_SESSION)?.value;

    if (!cookie) {
      return { isAuthenticated: false, session: null };
    }

    const decrypted = await decrypt(cookie);

    if (!decrypted || decrypted.success === false) {
      await deleteSession();
      return { isAuthenticated: false, session: null };
    }

    const session = decrypted as unknown as AuthSession;

    if (!session?.access_token) {
      return { isAuthenticated: false, session: null };
    }

    if (session?.expiresAt) {
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      if (expiresAt < now) {
        await deleteSession();
        return { isAuthenticated: false, session: null };
      }
    }

    return {
      isAuthenticated: true,
      session: session,
      role: session.role,
    };
  } catch {
    return { isAuthenticated: false, session: null };
  }
}

/**
 * Delete all session cookies
 */
export async function deleteSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_SESSION);
    cookieStore.delete(USER_SESSION);
    cookieStore.delete(PERMISSIONS_SESSION);
    cookieStore.delete(SCREEN_LOCK_SESSION);

    return { success: true, message: "Logout Success" };
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to clear session cookies",
      error: error?.message || "Unknown error",
    };
  }
}

// ============================================================================
// SCREEN LOCK FUNCTIONS
// ============================================================================

/**
 * Set screen lock state cookie
 */
export async function setScreenLockCookie(isLocked: boolean): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_CONFIG.SCREEN_LOCK_COUNTDOWN);

  const lockState = {
    locked: isLocked,
    timestamp: new Date().toISOString(),
  };

  const token = await encrypt(lockState, "90s");

  if (token) {
    const cookieStore = await cookies();
    cookieStore.set(SCREEN_LOCK_SESSION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "strict",
      path: "/",
    });
  }
}

/**
 * Get screen lock state from cookie
 */
export async function getScreenLockState(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SCREEN_LOCK_SESSION)?.value;
  if (!cookie) return false;

  const lockState = await decrypt(cookie);

  if (!lockState || (lockState as any)?.success === false) {
    return false;
  }

  if ((lockState as any)?.locked !== true) {
    return false;
  }

  const timestamp = (lockState as any)?.timestamp;
  if (timestamp) {
    try {
      const lockTime = new Date(timestamp).getTime();
      const nowTime = Date.now();
      const ageMs = nowTime - lockTime;

      if (ageMs > 95000) {
        return false;
      }
    } catch (error) {
      // If timestamp parsing fails, still return true if locked flag is set
    }
  }

  return true;
}

/**
 * Clear screen lock cookie
 */
export async function clearScreenLockCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SCREEN_LOCK_SESSION);
}
