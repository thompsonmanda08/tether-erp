"use client";

import { ReactNode } from "react";
import { usePermissions, type PermissionCheck } from "@/hooks/use-permissions";

/**
 * Props for PermissionGuard component
 */
interface PermissionGuardProps {
  /** The permission to check (resource and action) */
  resource: string;
  action: string;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Content to render if user doesn't have permission (optional) */
  fallback?: ReactNode;
  /** Loading state content (optional) */
  loadingFallback?: ReactNode;
}

/**
 * Guard component that renders children only if user has a specific permission
 *
 * Useful for conditionally rendering UI elements based on permissions.
 *
 * @example
 * ```tsx
 * <PermissionGuard resource="requisition" action="approve">
 *   <button onClick={handleApprove}>Approve</button>
 * </PermissionGuard>
 *
 * // With fallback
 * <PermissionGuard
 *   resource="requisition"
 *   action="approve"
 *   fallback={<p>You don't have permission to approve</p>}
 * >
 *   <button onClick={handleApprove}>Approve</button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  resource,
  action,
  children,
  fallback,
  loadingFallback,
}: PermissionGuardProps): ReactNode {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? null;
  }

  if (hasPermission(resource, action)) {
    return children;
  }

  return fallback ?? null;
}

/**
 * Props for MultiPermissionGuard component
 */
interface MultiPermissionGuardProps {
  /** Array of permissions - user must have ALL of them */
  permissions: PermissionCheck[];
  /** Content to render if user has all permissions */
  children: ReactNode;
  /** Content to render if user doesn't have all permissions (optional) */
  fallback?: ReactNode;
  /** Loading state content (optional) */
  loadingFallback?: ReactNode;
}

/**
 * Guard component that renders children only if user has ALL specified permissions
 *
 * @example
 * ```tsx
 * <MultiPermissionGuard
 *   permissions={[
 *     { resource: "requisition", action: "approve" },
 *     { resource: "budget", action: "approve" }
 *   ]}
 * >
 *   <button onClick={approveAll}>Approve All</button>
 * </MultiPermissionGuard>
 * ```
 */
export function MultiPermissionGuard({
  permissions,
  children,
  fallback,
  loadingFallback,
}: MultiPermissionGuardProps): ReactNode {
  const { hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? null;
  }

  if (hasAllPermissions(permissions)) {
    return children;
  }

  return fallback ?? null;
}

/**
 * Props for AnyPermissionGuard component
 */
interface AnyPermissionGuardProps {
  /** Array of permissions - user must have ANY of them */
  permissions: PermissionCheck[];
  /** Content to render if user has any permission */
  children: ReactNode;
  /** Content to render if user doesn't have any of the permissions (optional) */
  fallback?: ReactNode;
  /** Loading state content (optional) */
  loadingFallback?: ReactNode;
}

/**
 * Guard component that renders children only if user has ANY of the specified permissions
 *
 * @example
 * ```tsx
 * <AnyPermissionGuard
 *   permissions={[
 *     { resource: "requisition", action: "approve" },
 *     { resource: "requisition", action: "reject" }
 *   ]}
 * >
 *   <button>Take Action</button>
 * </AnyPermissionGuard>
 * ```
 */
export function AnyPermissionGuard({
  permissions,
  children,
  fallback,
  loadingFallback,
}: AnyPermissionGuardProps): ReactNode {
  const { hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? null;
  }

  if (hasAnyPermission(permissions)) {
    return children;
  }

  return fallback ?? null;
}

/**
 * Props for RoleGuard component
 */
interface RoleGuardProps {
  /** Role to check for */
  role: "admin" | "approver" | "finance" | "requester";
  /** Content to render if user has the role */
  children: ReactNode;
  /** Content to render if user doesn't have the role (optional) */
  fallback?: ReactNode;
  /** Loading state content (optional) */
  loadingFallback?: ReactNode;
}

/**
 * Guard component for simple role-based access
 *
 * @example
 * ```tsx
 * <RoleGuard role="admin">
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  role,
  children,
  fallback,
  loadingFallback,
}: RoleGuardProps): ReactNode {
  const { userRole, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? null;
  }

  if (userRole?.toLowerCase() === role.toLowerCase()) {
    return children;
  }

  return fallback ?? null;
}

/**
 * Props for AdminGuard component
 */
interface AdminGuardProps {
  /** Content to render if user is admin */
  children: ReactNode;
  /** Content to render if user is not admin (optional) */
  fallback?: ReactNode;
  /** Loading state content (optional) */
  loadingFallback?: ReactNode;
}

/**
 * Convenience guard for admin-only content
 *
 * @example
 * ```tsx
 * <AdminGuard>
 *   <AdminSettings />
 * </AdminGuard>
 * ```
 */
export function AdminGuard({
  children,
  fallback,
  loadingFallback,
}: AdminGuardProps): ReactNode {
  const { isAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return loadingFallback ?? null;
  }

  if (isAdmin()) {
    return children;
  }

  return fallback ?? null;
}
