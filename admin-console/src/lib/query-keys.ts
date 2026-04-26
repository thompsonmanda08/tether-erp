/**
 * Centralized React Query key factories.
 *
 * Usage:
 *   queryKey: queryKeys.adminUsers.list(filters)
 *   invalidateQueries({ queryKey: queryKeys.adminUsers.all })
 */

export const queryKeys = {
  // ── Admin Users ────────────────────────────────────────────────────────────
  adminUsers: {
    all: ["admin-users"] as const,
    list: (filters?: unknown) => ["admin-users", filters] as const,
    detail: (id: string) => ["admin-users", id] as const,
    stats: () => ["admin-users", "stats"] as const,
    roles: () => ["admin-users", "roles"] as const,
    activity: (userId: string, limit?: number) =>
      ["admin-users", userId, "activity", { limit }] as const,
    sessions: (userId: string) => ["admin-users", userId, "sessions"] as const,
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  analytics: {
    all: ["analytics"] as const,
    overview: (filters?: unknown) => ["analytics", "overview", filters] as const,
    users: (filters?: unknown) => ["analytics", "users", filters] as const,
    organizations: (filters?: unknown) =>
      ["analytics", "organizations", filters] as const,
    usage: (filters?: unknown) => ["analytics", "usage", filters] as const,
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: {
    all: ["dashboard"] as const,
    metrics: () => ["dashboard", "metrics"] as const,
  },

  // ── Organizations ──────────────────────────────────────────────────────────
  organizations: {
    all: ["organizations"] as const,
    list: (filters?: unknown) => ["organizations", filters] as const,
    detail: (id: string) => ["organizations", id] as const,
    stats: () => ["organizations", "statistics"] as const,
    users: (orgId: string, page?: number, limit?: number) =>
      ["organizations", orgId, "users", { page, limit }] as const,
    activity: (orgId: string, page?: number, limit?: number) =>
      ["organizations", orgId, "activity", { page, limit }] as const,
  },

  // ── Roles & Permissions ────────────────────────────────────────────────────
  roles: {
    all: ["roles"] as const,
    list: (filters?: unknown) => ["roles", filters] as const,
    detail: (id: string) => ["roles", id] as const,
    stats: () => ["roles", "stats"] as const,
    permissions: () => ["permissions"] as const,
    permissionsByCategory: () => ["permissions", "by-category"] as const,
    roleUsers: (roleId: string) => ["roles", roleId, "users"] as const,
    roleAudit: (roleId: string) => ["roles", roleId, "audit"] as const,
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    all: ["settings"] as const,
    list: (filters?: unknown) => ["settings", filters] as const,
    detail: (id: string) => ["settings", id] as const,
    stats: () => ["settings", "stats"] as const,
    envVariables: (environment?: unknown) =>
      ["settings", "env-variables", environment] as const,
  },

  // ── Users (platform users, not admin users) ────────────────────────────────
  users: {
    all: ["users"] as const,
    list: (filters?: unknown) => ["users", filters] as const,
    detail: (id: string) => ["users", id] as const,
    stats: () => ["users", "statistics"] as const,
    activity: (userId: string, page?: number, limit?: number) =>
      ["users", userId, "activity", { page, limit }] as const,
    sessions: (userId: string) => ["users", userId, "sessions"] as const,
    organizations: (userId: string) =>
      ["users", userId, "organizations"] as const,
  },
};
