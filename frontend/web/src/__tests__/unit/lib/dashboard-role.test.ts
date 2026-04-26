import { describe, it, expect } from "vitest";
import { getDashboardVariant } from "@/lib/dashboard-role";

/**
 * getDashboardVariant(role, permissions) → DashboardVariant
 *
 * Priority order (highest → lowest):
 *   admin → approver → procurement → requester
 *
 * admin:       role === "admin"  OR  permissions includes "admin.view"
 * approver:    role in ["finance","approver"]  OR  any permission ends with ".approve"
 * procurement: permissions includes "purchase_order.create"
 * requester:   fallback
 */

describe("getDashboardVariant", () => {
  // ── admin ──────────────────────────────────────────────────────────────

  describe("admin variant", () => {
    it("returns 'admin' for role 'admin' with no permissions", () => {
      expect(getDashboardVariant("admin", [])).toBe("admin");
    });

    it("role check is case-insensitive ('ADMIN')", () => {
      expect(getDashboardVariant("ADMIN", [])).toBe("admin");
    });

    it("role check is case-insensitive ('Admin')", () => {
      expect(getDashboardVariant("Admin", [])).toBe("admin");
    });

    it("returns 'admin' when permissions include 'admin.view' regardless of role", () => {
      expect(getDashboardVariant("requester", ["admin.view"])).toBe("admin");
    });

    it("returns 'admin' when permissions include 'admin.view' and role is finance", () => {
      expect(getDashboardVariant("finance", ["admin.view"])).toBe("admin");
    });

    it("admin takes priority over approver role (finance with admin.view permission)", () => {
      expect(getDashboardVariant("finance", ["admin.view", "budget.approve"])).toBe(
        "admin"
      );
    });
  });

  // ── approver ───────────────────────────────────────────────────────────

  describe("approver variant", () => {
    it("returns 'approver' for role 'finance'", () => {
      expect(getDashboardVariant("finance", [])).toBe("approver");
    });

    it("returns 'approver' for role 'approver'", () => {
      expect(getDashboardVariant("approver", [])).toBe("approver");
    });

    it("role 'finance' check is case-insensitive ('FINANCE')", () => {
      expect(getDashboardVariant("FINANCE", [])).toBe("approver");
    });

    it("role 'approver' check is case-insensitive ('APPROVER')", () => {
      expect(getDashboardVariant("APPROVER", [])).toBe("approver");
    });

    it("returns 'approver' when any permission ends with '.approve'", () => {
      expect(getDashboardVariant("requester", ["budget.approve"])).toBe("approver");
    });

    it("returns 'approver' when permission is 'requisition.approve'", () => {
      expect(getDashboardVariant("requester", ["requisition.approve"])).toBe(
        "approver"
      );
    });

    it("returns 'approver' even when procurement permission is also present (approver wins)", () => {
      expect(
        getDashboardVariant("approver", ["purchase_order.create"])
      ).toBe("approver");
    });

    it("returns 'approver' for requester role with both .approve and purchase_order.create", () => {
      expect(
        getDashboardVariant("requester", [
          "budget.approve",
          "purchase_order.create",
        ])
      ).toBe("approver");
    });

    it("does not return 'approver' for a permission that contains 'approve' but not at end", () => {
      // "approve.something" does not end with ".approve"
      expect(getDashboardVariant("requester", ["approve.something"])).toBe(
        "requester"
      );
    });
  });

  // ── procurement ────────────────────────────────────────────────────────

  describe("procurement variant", () => {
    it("returns 'procurement' when permissions include 'purchase_order.create'", () => {
      expect(getDashboardVariant("requester", ["purchase_order.create"])).toBe(
        "procurement"
      );
    });

    it("returns 'procurement' for requester role with only purchase_order.create", () => {
      expect(getDashboardVariant("requester", ["purchase_order.create"])).toBe(
        "procurement"
      );
    });

    it("procurement does not trigger for admin role (admin wins)", () => {
      expect(getDashboardVariant("admin", ["purchase_order.create"])).toBe("admin");
    });
  });

  // ── requester (fallback) ───────────────────────────────────────────────

  describe("requester variant (fallback)", () => {
    it("returns 'requester' for role 'requester' with no permissions", () => {
      expect(getDashboardVariant("requester", [])).toBe("requester");
    });

    it("returns 'requester' for unknown role with no permissions", () => {
      expect(getDashboardVariant("viewer", [])).toBe("requester");
    });

    it("returns 'requester' for empty role string with no permissions", () => {
      expect(getDashboardVariant("", [])).toBe("requester");
    });

    it("returns 'requester' for empty permissions array and non-privileged role", () => {
      expect(getDashboardVariant("some_custom_role", [])).toBe("requester");
    });

    it("returns 'requester' when permissions exist but none match approver/procurement conditions", () => {
      expect(getDashboardVariant("requester", ["document.view", "grn.create"])).toBe(
        "requester"
      );
    });
  });

  // ── all system roles per memory ────────────────────────────────────────

  describe("canonical system roles from SystemRole type", () => {
    it("'admin' → admin", () => {
      expect(getDashboardVariant("admin", [])).toBe("admin");
    });

    it("'approver' → approver", () => {
      expect(getDashboardVariant("approver", [])).toBe("approver");
    });

    it("'finance' → approver", () => {
      expect(getDashboardVariant("finance", [])).toBe("approver");
    });

    it("'requester' → requester", () => {
      expect(getDashboardVariant("requester", [])).toBe("requester");
    });
  });
});
