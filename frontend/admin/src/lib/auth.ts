"use server";
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION,
  ADMIN_USER_SESSION,
  ADMIN_PERMISSIONS_SESSION,
  AdminRole,
} from "@/lib/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
  created_at: string;
  last_login?: string;
}

export interface AdminSession {
  access_token: string;
  refresh_token?: string;
  user_id: string;
  role: AdminRole;
  permissions: string[];
  expiresAt: Date;
  expiresIn?: number;
  user?: AdminUser;
}

// ============================================================================
// JWT ENCRYPTION/DECRYPTION
// ============================================================================

const getSecretKey = () => {
  const secretKey = process.env.AUTH_SECRET || process.env.JWT_SECRET;
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
    console.error(error);

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
// ADMIN AUTH FUNCTIONS
// ============================================================================

/**
 * Get the current authenticated admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const { session } = await verifyAdminSession();
  return session;
}

/**
 * Get current authenticated admin user
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const { session } = await verifyAdminSession();
  return session?.user || null;
}

/**
 * Create admin session
 */
export async function createAdminSession({
  access_token,
  refresh_token,
  user_id,
  role,
  permissions,
  expiresIn,
  user,
}: {
  access_token: string;
  refresh_token?: string;
  user_id: string;
  role: AdminRole;
  permissions: string[];
  expiresIn?: number;
  user?: AdminUser;
}): Promise<void> {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev)
    console.log("[createAdminSession] Creating admin session", {
      hasToken: !!access_token,
      userId: user_id,
      role,
      expiresIn,
    });

  // Default to 8 hours for admin sessions
  const expirationMs = expiresIn ? expiresIn * 1000 : 8 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expirationMs);

  const newSession: AdminSession = {
    access_token,
    refresh_token,
    user_id,
    role,
    permissions,
    expiresAt,
    expiresIn,
    user,
  };

  const expirationTime = `${Math.ceil(expirationMs / 1000)}s`;
  const token = await encrypt(newSession, expirationTime);

  if (token) {
    if (isDev)
      console.log("[createAdminSession] Setting admin session cookie", {
        expiresAt,
      });
    (await cookies()).set(ADMIN_SESSION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "strict",
      path: "/",
    });
    if (isDev)
      console.log("[createAdminSession] Admin session cookie set successfully");
  } else {
    console.error("[createAdminSession] Failed to create session token");
    throw new Error("Failed to create admin session token.");
  }
}

/**
 * Verify the current admin session is valid
 */
export async function verifyAdminSession(): Promise<{
  isAuthenticated: boolean;
  session: AdminSession | null;
  permissions?: string[];
  [key: string]: any;
}> {
  const isDev = process.env.NODE_ENV === "development";

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(ADMIN_SESSION)?.value;

    if (!cookie) {
      if (isDev)
        console.log("[verifyAdminSession] No admin session cookie found");
      return { isAuthenticated: false, session: null };
    }

    const decrypted = await decrypt(cookie);

    if (!decrypted || decrypted.success === false) {
      if (isDev)
        console.log(
          "[verifyAdminSession] Failed to decrypt admin session cookie",
        );
      await deleteAdminSession();
      return { isAuthenticated: false, session: null };
    }

    const session = decrypted as unknown as AdminSession;

    if (!session?.access_token) {
      if (isDev)
        console.log("[verifyAdminSession] No access token in admin session");
      return { isAuthenticated: false, session: null };
    }

    if (session?.expiresAt) {
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      if (expiresAt < now) {
        if (isDev)
          console.log("[verifyAdminSession] Admin session expired", {
            expiresAt,
            now,
          });
        await deleteAdminSession();
        return { isAuthenticated: false, session: null };
      }
    }

    if (isDev)
      console.log("[verifyAdminSession] Admin session valid", {
        hasToken: !!session.access_token,
        userId: session.user_id,
        role: session.role,
        expiresAt: session.expiresAt,
      });

    const isSuperAdmin = session.role === "super_admin";

    return {
      isAuthenticated: true,
      isSuperAdmin,
      session: session,
      role: session.role,
      permissions: session.permissions,
    };
  } catch (error) {
    console.error("[verifyAdminSession] Error:", error);
    return { isAuthenticated: false, session: null };
  }
}

/**
 * Check if admin has required role
 */
export async function hasAdminRole(
  requiredRole: AdminRole | AdminRole[],
): Promise<boolean> {
  const user = await getCurrentAdminUser();
  if (!user) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Check if admin has required permission
 */
export async function hasAdminPermission(permission: string): Promise<boolean> {
  const { session } = await verifyAdminSession();
  if (!session) return false;

  return session.permissions.includes(permission);
}

/**
 * Delete admin session cookies
 */
export async function deleteAdminSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION);
    cookieStore.delete(ADMIN_USER_SESSION);
    cookieStore.delete(ADMIN_PERMISSIONS_SESSION);

    return { success: true, message: "Admin logout success" };
  } catch (error: any) {
    console.error("Failed to delete admin session cookies:", error);
    return {
      success: false,
      message: "Failed to clear admin session cookies",
      error: error?.message || "Unknown error",
    };
  }
}
