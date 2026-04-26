export type DashboardVariant = "requester" | "approver" | "procurement" | "admin";

/**
 * Determine which dashboard variant to render for the current user.
 *
 * Priority order (highest first):
 *   admin → approver → procurement → requester
 */
export function getDashboardVariant(
  role: string,
  permissions: string[]
): DashboardVariant {
  const r = role.toLowerCase();

  if (
    r === "admin" ||
    permissions.includes("admin.view")
  ) {
    return "admin";
  }

  if (
    ["finance", "approver"].includes(r) ||
    permissions.some((p) => p.endsWith(".approve"))
  ) {
    return "approver";
  }

  if (permissions.includes("purchase_order.create")) {
    return "procurement";
  }

  return "requester";
}
