/**
 * Unit Tests for Permission Guard Components
 *
 * Tests cover: PermissionGuard, MultiPermissionGuard, AnyPermissionGuard,
 * RoleGuard, and AdminGuard.
 *
 * Each guard is tested for:
 * - Rendering children when the condition is met
 * - Rendering fallback (or null) when denied
 * - Loading state handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PermissionGuard,
  MultiPermissionGuard,
  AnyPermissionGuard,
  RoleGuard,
  AdminGuard,
} from "@/components/auth/permission-guard";

// ============================================================================
// MOCK — usePermissions
// ============================================================================

// We control the hook's return value per test via `mockPermissionsData`
const mockPermissionsData = {
  hasPermission: vi.fn(),
  hasAllPermissions: vi.fn(),
  hasAnyPermission: vi.fn(),
  isAdmin: vi.fn(),
  isLoading: false,
  userRole: "approver" as string | null,
  error: null,
};

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => mockPermissionsData,
}));

// ============================================================================
// HELPERS
// ============================================================================

function resetMocks() {
  mockPermissionsData.hasPermission.mockReset();
  mockPermissionsData.hasAllPermissions.mockReset();
  mockPermissionsData.hasAnyPermission.mockReset();
  mockPermissionsData.isAdmin.mockReset();
  mockPermissionsData.isLoading = false;
  mockPermissionsData.userRole = "approver";
}

// ============================================================================
// TESTS — PermissionGuard
// ============================================================================

describe("PermissionGuard", () => {
  beforeEach(resetMocks);

  it("renders children when user has the required permission", () => {
    mockPermissionsData.hasPermission.mockReturnValue(true);

    render(
      <PermissionGuard resource="requisition" action="approve">
        <button>Approve</button>
      </PermissionGuard>,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("renders nothing when user lacks the required permission (no fallback)", () => {
    mockPermissionsData.hasPermission.mockReturnValue(false);

    render(
      <PermissionGuard resource="requisition" action="approve">
        <button>Approve</button>
      </PermissionGuard>,
    );

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("renders fallback when user lacks permission", () => {
    mockPermissionsData.hasPermission.mockReturnValue(false);

    render(
      <PermissionGuard
        resource="requisition"
        action="approve"
        fallback={<p>Access denied</p>}
      >
        <button>Approve</button>
      </PermissionGuard>,
    );

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("renders loadingFallback while loading", () => {
    mockPermissionsData.isLoading = true;

    render(
      <PermissionGuard
        resource="requisition"
        action="approve"
        loadingFallback={<p>Loading...</p>}
      >
        <button>Approve</button>
      </PermissionGuard>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("renders null (not loadingFallback) when loading and no loadingFallback provided", () => {
    mockPermissionsData.isLoading = true;

    render(
      <PermissionGuard resource="requisition" action="approve">
        <button>Approve</button>
      </PermissionGuard>,
    );

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("calls hasPermission with the correct resource and action", () => {
    mockPermissionsData.hasPermission.mockReturnValue(true);

    render(
      <PermissionGuard resource="budget" action="delete">
        <span>Delete Budget</span>
      </PermissionGuard>,
    );

    expect(mockPermissionsData.hasPermission).toHaveBeenCalledWith("budget", "delete");
  });
});

// ============================================================================
// TESTS — MultiPermissionGuard (AND logic)
// ============================================================================

describe("MultiPermissionGuard", () => {
  beforeEach(resetMocks);

  const permissions = [
    { resource: "requisition", action: "approve" },
    { resource: "budget", action: "approve" },
  ];

  it("renders children when user has ALL required permissions", () => {
    mockPermissionsData.hasAllPermissions.mockReturnValue(true);

    render(
      <MultiPermissionGuard permissions={permissions}>
        <button>Approve All</button>
      </MultiPermissionGuard>,
    );

    expect(screen.getByRole("button", { name: "Approve All" })).toBeInTheDocument();
  });

  it("renders nothing when user is missing at least one permission", () => {
    mockPermissionsData.hasAllPermissions.mockReturnValue(false);

    render(
      <MultiPermissionGuard permissions={permissions}>
        <button>Approve All</button>
      </MultiPermissionGuard>,
    );

    expect(screen.queryByRole("button", { name: "Approve All" })).not.toBeInTheDocument();
  });

  it("renders fallback when permission check fails", () => {
    mockPermissionsData.hasAllPermissions.mockReturnValue(false);

    render(
      <MultiPermissionGuard
        permissions={permissions}
        fallback={<p>Insufficient permissions</p>}
      >
        <button>Approve All</button>
      </MultiPermissionGuard>,
    );

    expect(screen.getByText("Insufficient permissions")).toBeInTheDocument();
  });

  it("renders loadingFallback while loading", () => {
    mockPermissionsData.isLoading = true;

    render(
      <MultiPermissionGuard
        permissions={permissions}
        loadingFallback={<span>Checking...</span>}
      >
        <button>Approve All</button>
      </MultiPermissionGuard>,
    );

    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("passes the permissions array to hasAllPermissions", () => {
    mockPermissionsData.hasAllPermissions.mockReturnValue(true);

    render(
      <MultiPermissionGuard permissions={permissions}>
        <span>content</span>
      </MultiPermissionGuard>,
    );

    expect(mockPermissionsData.hasAllPermissions).toHaveBeenCalledWith(permissions);
  });
});

// ============================================================================
// TESTS — AnyPermissionGuard (OR logic)
// ============================================================================

describe("AnyPermissionGuard", () => {
  beforeEach(resetMocks);

  const permissions = [
    { resource: "requisition", action: "approve" },
    { resource: "requisition", action: "reject" },
  ];

  it("renders children when user has at least one permission", () => {
    mockPermissionsData.hasAnyPermission.mockReturnValue(true);

    render(
      <AnyPermissionGuard permissions={permissions}>
        <button>Take Action</button>
      </AnyPermissionGuard>,
    );

    expect(screen.getByRole("button", { name: "Take Action" })).toBeInTheDocument();
  });

  it("renders fallback when user has none of the permissions", () => {
    mockPermissionsData.hasAnyPermission.mockReturnValue(false);

    render(
      <AnyPermissionGuard
        permissions={permissions}
        fallback={<p>No action available</p>}
      >
        <button>Take Action</button>
      </AnyPermissionGuard>,
    );

    expect(screen.getByText("No action available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take Action" })).not.toBeInTheDocument();
  });

  it("renders null when denied and no fallback provided", () => {
    mockPermissionsData.hasAnyPermission.mockReturnValue(false);

    render(
      <AnyPermissionGuard permissions={permissions}>
        <button>Take Action</button>
      </AnyPermissionGuard>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders loadingFallback while loading", () => {
    mockPermissionsData.isLoading = true;

    render(
      <AnyPermissionGuard
        permissions={permissions}
        loadingFallback={<span>Loading...</span>}
      >
        <button>Take Action</button>
      </AnyPermissionGuard>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — RoleGuard
// ============================================================================

describe("RoleGuard", () => {
  beforeEach(resetMocks);

  it("renders children when user has the correct role", () => {
    mockPermissionsData.userRole = "admin";

    render(
      <RoleGuard role="admin">
        <p>Admin Content</p>
      </RoleGuard>,
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("renders nothing when user has a different role", () => {
    mockPermissionsData.userRole = "requester";

    render(
      <RoleGuard role="admin">
        <p>Admin Content</p>
      </RoleGuard>,
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders fallback when user has wrong role", () => {
    mockPermissionsData.userRole = "requester";

    render(
      <RoleGuard role="approver" fallback={<p>Not an approver</p>}>
        <p>Approver Content</p>
      </RoleGuard>,
    );

    expect(screen.getByText("Not an approver")).toBeInTheDocument();
  });

  it("is case-insensitive for role comparison", () => {
    mockPermissionsData.userRole = "FINANCE";

    render(
      <RoleGuard role="finance">
        <p>Finance Content</p>
      </RoleGuard>,
    );

    expect(screen.getByText("Finance Content")).toBeInTheDocument();
  });

  it("renders loadingFallback while loading", () => {
    mockPermissionsData.isLoading = true;

    render(
      <RoleGuard role="admin" loadingFallback={<span>Checking role...</span>}>
        <p>Admin Content</p>
      </RoleGuard>,
    );

    expect(screen.getByText("Checking role...")).toBeInTheDocument();
  });

  it("renders null when loading and no loadingFallback", () => {
    mockPermissionsData.isLoading = true;

    render(
      <RoleGuard role="admin">
        <p>Admin Content</p>
      </RoleGuard>,
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — AdminGuard
// ============================================================================

describe("AdminGuard", () => {
  beforeEach(resetMocks);

  it("renders children when user is admin", () => {
    mockPermissionsData.isAdmin.mockReturnValue(true);

    render(
      <AdminGuard>
        <p>Admin Panel</p>
      </AdminGuard>,
    );

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("renders nothing when user is not admin", () => {
    mockPermissionsData.isAdmin.mockReturnValue(false);

    render(
      <AdminGuard>
        <p>Admin Panel</p>
      </AdminGuard>,
    );

    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("renders fallback when user is not admin", () => {
    mockPermissionsData.isAdmin.mockReturnValue(false);

    render(
      <AdminGuard fallback={<p>Admins only</p>}>
        <p>Admin Panel</p>
      </AdminGuard>,
    );

    expect(screen.getByText("Admins only")).toBeInTheDocument();
  });

  it("renders loadingFallback while loading", () => {
    mockPermissionsData.isLoading = true;

    render(
      <AdminGuard loadingFallback={<span>Verifying admin status...</span>}>
        <p>Admin Panel</p>
      </AdminGuard>,
    );

    expect(screen.getByText("Verifying admin status...")).toBeInTheDocument();
  });

  it("renders null when loading and no loadingFallback provided", () => {
    mockPermissionsData.isLoading = true;

    render(
      <AdminGuard>
        <p>Admin Panel</p>
      </AdminGuard>,
    );

    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });
});
