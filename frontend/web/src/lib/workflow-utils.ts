/**
 * Shared workflow utility functions
 * Centralises role-matching logic so all components behave consistently.
 */

/** Built-in system roles that have implicit approval permissions. */
const BUILT_IN_APPROVER_ROLES = [
  "admin",
  "approver",
  "finance",
];

/**
 * Determines whether the given user can act on (claim/approve/reject) a workflow task.
 *
 * Handles three cases for `task.assignedRole`:
 *  - Plain name string (system role, e.g. "approver") → compared against `user.role`
 *  - UUID (custom org role) → checked against `user.orgRoleIds`
 *  - Backend-resolved `task.assignedRoleName` used as secondary name-match for UUIDs
 *
 * Falls back to the built-in approver role list, mirroring backend behaviour.
 *
 * @param user  - Minimal user object from session (must have `id` and `role`)
 * @param task  - Minimal workflow task object
 */
export function canUserActOnWorkflowTask(
  user: {
    id: string;
    role?: string;
    orgRoleIds?: string[];
  } | null | undefined,
  task: {
    assignedRole?: string;
    assignedRoleName?: string;
    assignedUserId?: string;
    claimedBy?: string;
  }
): boolean {
  if (!user) return false;

  // Admin always has access
  if (user.role?.toLowerCase() === "admin") return true;

  // Specific user assignment — only that user can act
  if (task.assignedUserId) {
    return task.assignedUserId === user.id;
  }

  const userRole = user.role?.toLowerCase() ?? "";

  // No role restriction — any built-in approver may act
  if (!task.assignedRole) {
    return BUILT_IN_APPROVER_ROLES.includes(userRole);
  }

  // Direct name match (system roles stored as names after Phase A fix)
  if (userRole === task.assignedRole.toLowerCase()) return true;

  // Secondary name match via backend-resolved assignedRoleName (covers UUID roles)
  if (
    task.assignedRoleName &&
    userRole === task.assignedRoleName.toLowerCase()
  )
    return true;

  // UUID membership match for custom org roles
  if (user.orgRoleIds?.includes(task.assignedRole)) return true;

  // Built-in approver fallback (mirrors backend canUserActOnTask fallback)
  return BUILT_IN_APPROVER_ROLES.includes(userRole);
}

/**
 * Formats a role value (name or UUID) for display.
 * - If a resolved name is provided, use it.
 * - If the value looks like a UUID, show "Pending Resolution".
 * - Otherwise, capitalise and un-snake-case the name.
 */
export function formatRoleForDisplay(
  roleValue?: string | null,
  resolvedName?: string | null
): string {
  if (resolvedName) {
    return resolvedName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (!roleValue) return "Not Set";
  // Looks like a UUID (8-4-4-4-12)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roleValue
    )
  ) {
    return "Unknown Role";
  }
  return roleValue.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
