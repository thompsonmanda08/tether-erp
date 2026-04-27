"use server";

import { verifySession } from "@/lib/auth";

/**
 * Debug function to check current session status
 * This helps diagnose session-related issues
 */
export async function debugSession() {
  try {
    const result = await verifySession();
    
    return {
      success: true,
      data: {
        isAuthenticated: result.isAuthenticated,
        hasSession: !!result.session,
        hasAccessToken: !!result.session?.access_token,
        userId: result.session?.user_id,
        organizationId: result.session?.organization_id,
        expiresAt: result.session?.expiresAt,
        role: result.session?.role,
        userEmail: result.session?.user?.email,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}