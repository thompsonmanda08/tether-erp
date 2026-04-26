/**
 * Utility functions for clearing organizational data from localStorage
 * Used during logout to ensure clean state
 */

/**
 * Clear all organizational data from localStorage
 * This includes:
 * - Current organization ID
 * - All document storage (requisitions, POs, payment vouchers, GRNs, budgets)
 * - Permission cache
 * - Action history
 */
export function clearOrganizationalData(): void {
  if (typeof window === "undefined") return;

  try {
    // Clear organization-specific data
    localStorage.removeItem("current-organization-id");

    // Clear all document storage keys
    const storageKeys = [
      "tether-requisitions",
      "tether-purchase-orders",
      "tether-payment-vouchers",
      "tether-goods-received-notes",
      "tether-budgets",
      "tether-requisition-action-history",
    ];

    storageKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear permission cache
    const allKeys = Object.keys(localStorage);
    const permissionKeys = allKeys.filter(
      (key) =>
        key.startsWith("permissions_") || key.startsWith("permissions_expiry_"),
    );
    permissionKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

  } catch (error) {
    console.error(
      "Failed to clear organizational data from localStorage:",
      error,
    );
  }
}

/**
 * Clear only document storage (requisitions, POs, etc.)
 * Useful for organization switching without full logout
 */
export function clearDocumentStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const storageKeys = [
      "tether-requisitions",
      "tether-purchase-orders",
      "tether-payment-vouchers",
      "tether-goods-received-notes",
      "tether-budgets",
      "tether-requisition-action-history",
    ];

    storageKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

  } catch (error) {
    console.error("Failed to clear document storage:", error);
  }
}

/**
 * Clear permission cache
 * Useful when user role changes
 */
export function clearPermissionCache(): void {
  if (typeof window === "undefined") return;

  try {
    const allKeys = Object.keys(localStorage);
    const permissionKeys = allKeys.filter(
      (key) =>
        key.startsWith("permissions_") || key.startsWith("permissions_expiry_"),
    );
    permissionKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

  } catch (error) {
    console.error("Failed to clear permission cache:", error);
  }
}
