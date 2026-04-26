"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "./use-session";
import { getMyPermissions } from "@/app/_actions/roles-permissions";
import type { User } from "@/types";

/**
 * Represents a permission as a resource-action pair
 * @example
 * ```typescript
 * const permission: PermissionCheck = { resource: "requisition", action: "approve" };
 * ```
 */
export interface PermissionCheck {
  resource: string;
  action: string;
}

/**
 * Data structure returned by usePermissions hook
 */
export interface PermissionsData {
  /** Check if user has a specific permission */
  hasPermission: (resource: string, action: string) => boolean;
  /** Check if user has ALL of the required permissions */
  hasAllPermissions: (permissions: PermissionCheck[]) => boolean;
  /** Check if user has ANY of the required permissions */
  hasAnyPermission: (permissions: PermissionCheck[]) => boolean;
  /** Get all permissions for the current user's role */
  getPermissions: () => PermissionCheck[];
  /** Check if user is an admin */
  isAdmin: () => boolean;
  /** Check if user is an approver */
  isApprover: () => boolean;
  /** Check if user is a requester */
  isRequester: () => boolean;
  /** Check if user is finance */
  isFinance: () => boolean;
  /** User's current role */
  userRole: string | null;
  /** Whether permissions are still loading */
  isLoading: boolean;
  /** Any errors encountered */
  error: Error | null;
  /** Raw permissions from backend (for debugging) */
  rawPermissions: string[];
  /** Permission source information */
  permissionSource: 'backend' | 'user_session' | 'cache' | 'fallback_builtin' | 'fallback_viewer';
}

/**
 * Emergency fallback permissions - ONLY used as absolute last resort
 * when both API and cache completely fail
 */
const EMERGENCY_FALLBACK_PERMISSIONS: PermissionCheck[] = [
  // Minimal safe permissions for emergency access
  { resource: "requisition", action: "view" },
  { resource: "budget", action: "view" },
  { resource: "purchase_order", action: "view" },
  { resource: "payment_voucher", action: "view" },
  { resource: "analytics", action: "view" },
];

/**
 * Enhanced cache configuration
 */
const CACHE_CONFIG = {
  PREFIX: '_role_permissions_',
  EXPIRY_SUFFIX: '_expiry',
  DURATION: 24 * 60 * 60 * 1000, // 24 hours
  BACKUP_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days for backup cache
};

/**
 * Hook for permission-based access control
 *
 * Provides methods to check if the current user has specific permissions
 * based on their role. Fetches permissions dynamically from the backend API
 * to support both built-in and custom roles.
 *
 * @returns {PermissionsData} Object with permission checking methods
 *
 * @example
 * ```typescript
 * const { hasPermission, isAdmin, isLoading } = usePermissions();
 *
 * if (isLoading) return <div>Loading permissions...</div>;
 *
 * return (
 *   <>
 *     {hasPermission("requisition", "approve") && (
 *       <button onClick={approve}>Approve</button>
 *     )}
 *     {isAdmin() && (
 *       <button onClick={manageUsers}>Manage Users</button>
 *     )}
 *   </>
 * );
 * ```
 */
export function usePermissions(): PermissionsData {
  const { user, isLoading: sessionLoading, error: sessionError } = useSession();

  // Check if user already has permissions in the session
  const hasUserPermissions = user?.permissions && user.permissions.length > 0;

  // Fetch current user's permissions from /me/permissions — works for all roles
  const {
    data: permissionsResponse,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: () => getMyPermissions(),
    enabled: !!user?.id && !hasUserPermissions,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Parse permissions from user object or backend response
  const permissions = useMemo(() => {
    let finalPermissions: PermissionCheck[] = [];
    let source: PermissionsData['permissionSource'] = 'fallback_viewer';
    
    // First priority: permissions already in user object
    if (hasUserPermissions) {
      finalPermissions = parseBackendPermissions(user.permissions!);
      source = 'user_session';
    }
    // Second priority: permissions from API response
    else if (permissionsResponse?.success && permissionsResponse.data) {
      const backendPermissions = permissionsResponse.data as string[];
      finalPermissions = parseBackendPermissions(backendPermissions);
      source = 'backend';
      
      // Cache ALL role permissions for offline use (both built-in and custom)
      if (user?.role) {
        cacheRolePermissions(user.role, backendPermissions);
      }
    }
    // Fallback: hardcoded permissions for built-in roles or cached custom roles
    else {
      const fallbackResult = getFallbackPermissions(user?.role);
      finalPermissions = fallbackResult.permissions;
      source = fallbackResult.source;
    }
    
    // Store the source for debugging
    (finalPermissions as any).__source = source;
    
    return finalPermissions;
  }, [user?.permissions, permissionsResponse, user?.role, hasUserPermissions]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    return permissions.some(
      (perm) => perm.resource === resource && perm.action === action
    );
  };

  const hasAllPermissions = (requiredPerms: PermissionCheck[]): boolean => {
    return requiredPerms.every((perm) =>
      hasPermission(perm.resource, perm.action)
    );
  };

  const hasAnyPermission = (requiredPerms: PermissionCheck[]): boolean => {
    return requiredPerms.some((perm) =>
      hasPermission(perm.resource, perm.action)
    );
  };

  const getPermissions = (): PermissionCheck[] => {
    return [...permissions];
  };

  const isAdmin = (): boolean => {
    return user?.role?.toLowerCase() === "admin";
  };

  const isApprover = (): boolean => {
    return user?.role?.toLowerCase() === "approver";
  };

  const isRequester = (): boolean => {
    return user?.role?.toLowerCase() === "requester";
  };

  const isFinance = (): boolean => {
    return user?.role?.toLowerCase() === "finance";
  };

  const isLoading = sessionLoading || (!hasUserPermissions && permissionsLoading);
  const error = sessionError || permissionsError;
  const permissionSource = (permissions as any).__source || 'fallback_viewer';

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getPermissions,
    isAdmin,
    isApprover,
    isRequester,
    isFinance,
    userRole: user?.role ?? null,
    isLoading,
    error: error as Error | null,
    rawPermissions: user?.permissions || (permissionsResponse?.data as string[]) || [],
    permissionSource,
  };
}

/**
 * Parse backend permissions (strings) into PermissionCheck format
 * Backend permissions might be in formats like:
 * - "requisition:view"
 * - "requisition.view" 
 * - "view_requisition"
 * - etc.
 */
function parseBackendPermissions(backendPermissions: string[]): PermissionCheck[] {
  return backendPermissions.map((permission) => {
    // Try different formats
    if (permission.includes(':')) {
      const [resource, action] = permission.split(':');
      return { resource: resource.trim(), action: action.trim() };
    }
    
    if (permission.includes('.')) {
      const [resource, action] = permission.split('.');
      return { resource: resource.trim(), action: action.trim() };
    }
    
    // Handle underscore format like "view_requisition"
    if (permission.includes('_')) {
      const parts = permission.split('_');
      if (parts.length >= 2) {
        const action = parts[0];
        const resource = parts.slice(1).join('_');
        return { resource, action };
      }
    }
    
    // Default: treat as resource with "access" action
    return { resource: permission, action: "access" };
  });
}

/**
 * Cache key prefix for role permissions in localStorage
 */
const CACHE_PREFIX = '_role_permissions_';
const CACHE_EXPIRY_KEY = '_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Cache role permissions in localStorage with expiry
 * This works for ALL roles (built-in and custom)
 */
function cacheRolePermissions(role: string, permissions: string[]): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${role.toLowerCase()}`;
    const expiryKey = `${cacheKey}${CACHE_EXPIRY_KEY}`;
    const expiryTime = Date.now() + CACHE_DURATION;
    
    localStorage.setItem(cacheKey, JSON.stringify(permissions));
    localStorage.setItem(expiryKey, expiryTime.toString());
    
    console.info(`✅ Cached permissions for role "${role}" (expires in 24h)`);
  } catch (error) {
    console.warn('❌ Failed to cache permissions:', error);
  }
}

/**
 * Get cached permissions for any role (built-in or custom)
 */
function getCachedPermissions(role: string): string[] | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${role.toLowerCase()}`;
    const expiryKey = `${cacheKey}${CACHE_EXPIRY_KEY}`;
    
    // Check if cache has expired
    const expiryTime = localStorage.getItem(expiryKey);
    if (expiryTime && Date.now() > parseInt(expiryTime)) {
      // Cache expired, clean it up
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(expiryKey);
      console.info(`🗑️ Expired cache cleaned for role "${role}"`);
      return null;
    }
    
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const permissions = JSON.parse(cachedData);
      if (Array.isArray(permissions) && permissions.length > 0) {
        console.info(`📦 Using cached permissions for role "${role}"`);
        return permissions;
      }
    }
  } catch (error) {
    console.warn('❌ Failed to load cached permissions:', error);
  }
  
  return null;
}

/**
 * Clear all cached role permissions (useful for logout or role changes)
 */
export function clearPermissionCache(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Find all permission cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all found keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.info(`🧹 Cleared ${keysToRemove.length} cached permission entries`);
  } catch (error) {
    console.warn('❌ Failed to clear permission cache:', error);
  }
}

/**
 * Check if a role is a built-in role (for logging purposes only)
 * Based on actual backend role definitions
 */
function isBuiltInRole(role: string): boolean {
  const builtInRoles = [
    'admin',
    'requester',
    'approver',
    'finance',
  ];
  return builtInRoles.includes(role.toLowerCase());
}

/**
 * Get permissions with cache-first approach for ALL roles
 * No distinction between built-in and custom roles
 */
function getFallbackPermissions(role?: string): { 
  permissions: PermissionCheck[], 
  source: PermissionsData['permissionSource'] 
} {
  if (!role) {
    return { 
      permissions: EMERGENCY_FALLBACK_PERMISSIONS, 
      source: 'fallback_viewer' 
    };
  }
  
  // Try to get cached permissions for ANY role (built-in or custom)
  const cachedPermissions = getCachedPermissions(role);
  if (cachedPermissions) {
    return { 
      permissions: parseBackendPermissions(cachedPermissions), 
      source: 'cache' 
    };
  }
  
  // If no cache exists, use emergency fallback permissions
  // This should rarely happen since we cache all successful API responses
  console.warn(`⚠️ No cached permissions found for role "${role}". Using emergency fallback.`);
  return { 
    permissions: EMERGENCY_FALLBACK_PERMISSIONS, 
    source: 'fallback_viewer' 
  };
}
