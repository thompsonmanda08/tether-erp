import { describe, it, expect } from "vitest";
import {
  canUserActOnWorkflowTask,
  formatRoleForDisplay,
} from "@/lib/workflow-utils";

// ---------------------------------------------------------------------------
// canUserActOnWorkflowTask
// ---------------------------------------------------------------------------

describe("canUserActOnWorkflowTask", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

  // ── Null / undefined user ──────────────────────────────────────────────

  it("returns false when user is null", () => {
    expect(canUserActOnWorkflowTask(null, {})).toBe(false);
  });

  it("returns false when user is undefined", () => {
    expect(canUserActOnWorkflowTask(undefined, {})).toBe(false);
  });

  // ── Admin always wins ──────────────────────────────────────────────────

  it("returns true for admin regardless of task settings", () => {
    const user = { id: "u1", role: "admin" };
    const task = { assignedRole: "finance", assignedUserId: "u99" };
    // Note: assignedUserId check comes after admin check — admin still wins
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("admin role check is case-insensitive", () => {
    expect(canUserActOnWorkflowTask({ id: "u1", role: "ADMIN" }, {})).toBe(true);
    expect(canUserActOnWorkflowTask({ id: "u1", role: "Admin" }, {})).toBe(true);
  });

  // ── Specific user assignment ───────────────────────────────────────────

  it("allows the specifically assigned user", () => {
    const user = { id: "u1", role: "requester" };
    const task = { assignedUserId: "u1" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("rejects a different user when task has assignedUserId", () => {
    const user = { id: "u2", role: "approver" };
    const task = { assignedUserId: "u1" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(false);
  });

  // ── No assignedRole — built-in approver fallback ───────────────────────

  it("allows finance role when no assignedRole is set", () => {
    const user = { id: "u1", role: "finance" };
    expect(canUserActOnWorkflowTask(user, {})).toBe(true);
  });

  it("allows approver role when no assignedRole is set", () => {
    const user = { id: "u1", role: "approver" };
    expect(canUserActOnWorkflowTask(user, {})).toBe(true);
  });

  it("rejects requester role when no assignedRole is set (not a built-in approver)", () => {
    const user = { id: "u1", role: "requester" };
    expect(canUserActOnWorkflowTask(user, {})).toBe(false);
  });

  it("rejects procurement role when no assignedRole is set", () => {
    const user = { id: "u1", role: "procurement" };
    expect(canUserActOnWorkflowTask(user, {})).toBe(false);
  });

  it("allows admin role (via built-in approver list) when no assignedRole set", () => {
    // Admin check is earlier and returns true — consistent either way
    const user = { id: "u1", role: "admin" };
    expect(canUserActOnWorkflowTask(user, {})).toBe(true);
  });

  it("returns false for user with undefined role when no assignedRole", () => {
    const user = { id: "u1", role: undefined };
    expect(canUserActOnWorkflowTask(user, {})).toBe(false);
  });

  // ── Direct name match ──────────────────────────────────────────────────

  it("allows user whose role matches assignedRole by name", () => {
    const user = { id: "u1", role: "finance" };
    const task = { assignedRole: "finance" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("role name match is case-insensitive", () => {
    const user = { id: "u1", role: "Finance" };
    const task = { assignedRole: "finance" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("rejects user whose role does not match assignedRole (non-built-in-approver)", () => {
    // role=requester, assignedRole=finance, requester is not in BUILT_IN_APPROVER_ROLES
    const user = { id: "u1", role: "requester" };
    const task = { assignedRole: "finance" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(false);
  });

  // ── assignedRoleName secondary match ──────────────────────────────────

  it("allows user whose role matches assignedRoleName (UUID role with resolved name)", () => {
    const user = { id: "u1", role: "finance" };
    const task = { assignedRole: VALID_UUID, assignedRoleName: "finance" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("assignedRoleName match is case-insensitive", () => {
    const user = { id: "u1", role: "approver" };
    const task = { assignedRole: VALID_UUID, assignedRoleName: "APPROVER" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  // ── UUID org role membership ───────────────────────────────────────────

  it("allows user who has the UUID in orgRoleIds", () => {
    const user = { id: "u1", role: "requester", orgRoleIds: [VALID_UUID] };
    const task = { assignedRole: VALID_UUID };
    // requester is not built-in approver, but orgRoleIds match
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  it("rejects user without matching orgRoleId for UUID role (and not a built-in approver)", () => {
    const user = {
      id: "u1",
      role: "requester",
      orgRoleIds: ["another-uuid-0000-0000-000000000000"],
    };
    const task = { assignedRole: VALID_UUID };
    expect(canUserActOnWorkflowTask(user, task)).toBe(false);
  });

  it("returns true for approver with UUID assignedRole via built-in fallback", () => {
    // assignedRole is a UUID that is not in orgRoleIds, but user is built-in approver
    const user = { id: "u1", role: "approver", orgRoleIds: [] };
    const task = { assignedRole: VALID_UUID };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });

  // ── claimedBy field has no effect on canUserActOnWorkflowTask ─────────

  it("ignores claimedBy field — does not block or grant access", () => {
    const user = { id: "u1", role: "approver" };
    const task = { claimedBy: "u99", assignedRole: "approver" };
    expect(canUserActOnWorkflowTask(user, task)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatRoleForDisplay
// ---------------------------------------------------------------------------

describe("formatRoleForDisplay", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

  // ── resolvedName takes priority ────────────────────────────────────────

  it("uses resolvedName when provided, capitalising and replacing underscores", () => {
    expect(formatRoleForDisplay("some_role", "finance_manager")).toBe(
      "Finance Manager"
    );
  });

  it("uses resolvedName even when roleValue is also provided", () => {
    expect(formatRoleForDisplay(VALID_UUID, "department_head")).toBe(
      "Department Head"
    );
  });

  it("capitalises each word in resolvedName", () => {
    expect(formatRoleForDisplay(undefined, "procurement_officer")).toBe(
      "Procurement Officer"
    );
  });

  // ── No resolvedName — roleValue processing ─────────────────────────────

  it("returns 'Not Set' when both roleValue and resolvedName are absent", () => {
    expect(formatRoleForDisplay()).toBe("Not Set");
  });

  it("returns 'Not Set' when roleValue is null and no resolvedName", () => {
    expect(formatRoleForDisplay(null)).toBe("Not Set");
  });

  it("returns 'Not Set' when roleValue is empty string and no resolvedName", () => {
    expect(formatRoleForDisplay("")).toBe("Not Set");
  });

  it("returns 'Unknown Role' for a UUID-shaped roleValue", () => {
    expect(formatRoleForDisplay(VALID_UUID)).toBe("Unknown Role");
  });

  it("UUID detection is case-insensitive (uppercase hex)", () => {
    const upperUUID = "550E8400-E29B-41D4-A716-446655440000";
    expect(formatRoleForDisplay(upperUUID)).toBe("Unknown Role");
  });

  it("does not treat a non-UUID string as a UUID", () => {
    expect(formatRoleForDisplay("not-a-uuid")).not.toBe("Unknown Role");
  });

  it("capitalises and un-snake-cases a plain role name", () => {
    expect(formatRoleForDisplay("finance_manager")).toBe("Finance Manager");
  });

  it("capitalises a single-word role name", () => {
    expect(formatRoleForDisplay("approver")).toBe("Approver");
  });

  it("capitalises multi-word role with multiple underscores", () => {
    expect(formatRoleForDisplay("department_finance_head")).toBe(
      "Department Finance Head"
    );
  });

  it("handles resolvedName that is null (falls through to roleValue logic)", () => {
    expect(formatRoleForDisplay("approver", null)).toBe("Approver");
  });
});
