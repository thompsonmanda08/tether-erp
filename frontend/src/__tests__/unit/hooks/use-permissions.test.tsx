/**
 * Unit Tests for usePermissions Hook
 *
 * Tests that the correct set of role-checking predicates and permission helpers
 * are returned for each canonical SystemRole: 'admin', 'approver', 'finance',
 * 'requester'.
 *
 * Strategy:
 *  - Mock useSession to return a synthetic user with the role under test.
 *  - Mock getMyPermissions (via @/app/_actions/roles-permissions) to return an
 *    empty success response so that the hook falls through to the fallback /
 *    cache path.  This isolates isAdmin/isApprover/isFinance/isRequester logic,
 *    which depends only on user.role — not on the permission list.
 *  - For hasPermission / hasAllPermissions / hasAnyPermission we supply
 *    permissions directly on the user object (highest-priority path) so we can
 *    test the parsing and lookup logic independently of the backend call.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import type { User } from '@/types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useSession so we control what user/role the hook sees
vi.mock('@/hooks/use-session', () => ({
  useSession: vi.fn(),
}));

// Mock the server action — default to "no backend permissions" so we test the
// fallback path; individual tests can override with vi.mocked().
vi.mock('@/app/_actions/roles-permissions', () => ({
  getMyPermissions: vi.fn().mockResolvedValue({ success: false, data: null }),
}));

// Silence console output from the hook's logging inside tests
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// ============================================================================
// HELPERS
// ============================================================================

import { useSession } from '@/hooks/use-session';
import { getMyPermissions } from '@/app/_actions/roles-permissions';

const mockUseSession = vi.mocked(useSession);

function buildUser(role: string, permissions?: string[]): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role,
    permissions,
    organizationId: 'org-1',
  } as unknown as User;
}

function sessionWith(role: string, permissions?: string[]) {
  mockUseSession.mockReturnValue({
    user: buildUser(role, permissions),
    isLoading: false,
    isAuthenticated: true,
    error: null,
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// ROLE PREDICATE TESTS
// ============================================================================

describe('usePermissions — role predicate functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('admin role', () => {
    it('should return isAdmin()=true and other predicates false', () => {
      sessionWith('admin');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAdmin()).toBe(true);
      expect(result.current.isApprover()).toBe(false);
      expect(result.current.isFinance()).toBe(false);
      expect(result.current.isRequester()).toBe(false);
    });

    it('should set userRole to "admin"', () => {
      sessionWith('admin');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userRole).toBe('admin');
    });

    it('should treat role case-insensitively — ADMIN should still pass isAdmin()', () => {
      sessionWith('ADMIN');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAdmin()).toBe(true);
    });
  });

  describe('approver role', () => {
    it('should return isApprover()=true and other predicates false', () => {
      sessionWith('approver');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isApprover()).toBe(true);
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isFinance()).toBe(false);
      expect(result.current.isRequester()).toBe(false);
    });

    it('should set userRole to "approver"', () => {
      sessionWith('approver');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userRole).toBe('approver');
    });

    it('should treat role case-insensitively — APPROVER should still pass isApprover()', () => {
      sessionWith('APPROVER');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isApprover()).toBe(true);
    });
  });

  describe('finance role', () => {
    it('should return isFinance()=true and other predicates false', () => {
      sessionWith('finance');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFinance()).toBe(true);
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isApprover()).toBe(false);
      expect(result.current.isRequester()).toBe(false);
    });

    it('should set userRole to "finance"', () => {
      sessionWith('finance');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userRole).toBe('finance');
    });

    it('should treat role case-insensitively — FINANCE should still pass isFinance()', () => {
      sessionWith('FINANCE');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFinance()).toBe(true);
    });
  });

  describe('requester role', () => {
    it('should return isRequester()=true and other predicates false', () => {
      sessionWith('requester');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRequester()).toBe(true);
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isApprover()).toBe(false);
      expect(result.current.isFinance()).toBe(false);
    });

    it('should set userRole to "requester"', () => {
      sessionWith('requester');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userRole).toBe('requester');
    });

    it('should treat role case-insensitively — REQUESTER should still pass isRequester()', () => {
      sessionWith('REQUESTER');

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRequester()).toBe(true);
    });
  });

  describe('unauthenticated / no user', () => {
    it('should return null userRole when there is no user', () => {
      mockUseSession.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userRole).toBeNull();
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isApprover()).toBe(false);
      expect(result.current.isFinance()).toBe(false);
      expect(result.current.isRequester()).toBe(false);
    });

    it('should return hasPermission()=false when there is no user', () => {
      mockUseSession.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasPermission('requisition', 'view')).toBe(false);
    });
  });
});

// ============================================================================
// hasPermission — COLON format (e.g. "requisition:view")
// ============================================================================

describe('usePermissions — hasPermission with colon-separated backend permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for a permission the user has (colon format)', () => {
    sessionWith('admin', ['requisition:view', 'requisition:create']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasPermission('requisition', 'view')).toBe(true);
    expect(result.current.hasPermission('requisition', 'create')).toBe(true);
  });

  it('should return false for a permission the user does not have', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasPermission('requisition', 'approve')).toBe(false);
  });

  it('should return false when the user has no permissions array', () => {
    sessionWith('requester', undefined);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    // No permissions in session — falls back to emergency fallback which includes view perms
    // We only assert that no non-existent permission is granted
    expect(result.current.hasPermission('budget', 'delete')).toBe(false);
  });
});

// ============================================================================
// hasPermission — DOT format (e.g. "purchase_order.approve")
// ============================================================================

describe('usePermissions — hasPermission with dot-separated backend permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should parse dot-separated permissions correctly', () => {
    sessionWith('finance', ['payment_voucher.view', 'payment_voucher.create']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasPermission('payment_voucher', 'view')).toBe(true);
    expect(result.current.hasPermission('payment_voucher', 'create')).toBe(true);
    expect(result.current.hasPermission('payment_voucher', 'approve')).toBe(false);
  });
});

// ============================================================================
// hasPermission — UNDERSCORE format (e.g. "view_requisition")
// ============================================================================

describe('usePermissions — hasPermission with underscore-prefixed backend permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should parse action_resource underscore format correctly', () => {
    // "view_requisition" → { resource: 'requisition', action: 'view' }
    sessionWith('requester', ['view_requisition', 'create_requisition']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasPermission('requisition', 'view')).toBe(true);
    expect(result.current.hasPermission('requisition', 'create')).toBe(true);
    expect(result.current.hasPermission('requisition', 'approve')).toBe(false);
  });
});

// ============================================================================
// hasAllPermissions and hasAnyPermission
// ============================================================================

describe('usePermissions — hasAllPermissions and hasAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hasAllPermissions should return true only when ALL required permissions are present', () => {
    sessionWith('approver', ['requisition:view', 'requisition:approve']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    // Both present
    expect(
      result.current.hasAllPermissions([
        { resource: 'requisition', action: 'view' },
        { resource: 'requisition', action: 'approve' },
      ]),
    ).toBe(true);

    // One missing
    expect(
      result.current.hasAllPermissions([
        { resource: 'requisition', action: 'view' },
        { resource: 'requisition', action: 'delete' },
      ]),
    ).toBe(false);
  });

  it('hasAllPermissions should return true for an empty array', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasAllPermissions([])).toBe(true);
  });

  it('hasAnyPermission should return true when at least one required permission is present', () => {
    sessionWith('finance', ['payment_voucher:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(
      result.current.hasAnyPermission([
        { resource: 'payment_voucher', action: 'view' },
        { resource: 'payment_voucher', action: 'approve' }, // not present
      ]),
    ).toBe(true);
  });

  it('hasAnyPermission should return false when none of the required permissions are present', () => {
    sessionWith('requester', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(
      result.current.hasAnyPermission([
        { resource: 'budget', action: 'approve' },
        { resource: 'purchase_order', action: 'approve' },
      ]),
    ).toBe(false);
  });

  it('hasAnyPermission should return false for an empty array', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasAnyPermission([])).toBe(false);
  });
});

// ============================================================================
// getPermissions
// ============================================================================

describe('usePermissions — getPermissions returns a copy of the internal list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return an array containing parsed permissions from user session', () => {
    sessionWith('admin', ['requisition:view', 'purchase_order:create']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    const perms = result.current.getPermissions();

    expect(Array.isArray(perms)).toBe(true);

    const viewReq = perms.find(
      (p) => p.resource === 'requisition' && p.action === 'view',
    );
    expect(viewReq).toBeDefined();

    const createPO = perms.find(
      (p) => p.resource === 'purchase_order' && p.action === 'create',
    );
    expect(createPO).toBeDefined();
  });

  it('should return a new array each call (defensive copy)', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    const perms1 = result.current.getPermissions();
    const perms2 = result.current.getPermissions();

    // Different array references
    expect(perms1).not.toBe(perms2);
    // But same content
    expect(perms1).toEqual(perms2);
  });
});

// ============================================================================
// Backend permissions via getMyPermissions (user_session NOT set)
// ============================================================================

describe('usePermissions — backend permissions source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use backend permissions when user has no session permissions and API succeeds', async () => {
    // User has no inline permissions — triggers API fetch
    mockUseSession.mockReturnValue({
      user: buildUser('finance', undefined),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    vi.mocked(getMyPermissions).mockResolvedValue({
      success: true,
      data: ['payment_voucher:approve', 'payment_voucher:view'] as any,
    });

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    // Wait for the query to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission('payment_voucher', 'approve')).toBe(true);
    expect(result.current.hasPermission('payment_voucher', 'view')).toBe(true);
    expect(result.current.hasPermission('requisition', 'delete')).toBe(false);
  });

  it('should report permissionSource as "backend" when loaded from API', async () => {
    mockUseSession.mockReturnValue({
      user: buildUser('approver', undefined),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    vi.mocked(getMyPermissions).mockResolvedValue({
      success: true,
      data: ['requisition:approve'] as any,
    });

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.permissionSource).toBe('backend');
    });
  });

  it('should report permissionSource as "user_session" when permissions come from session', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.permissionSource).toBe('user_session');
  });
});

// ============================================================================
// isLoading state
// ============================================================================

describe('usePermissions — isLoading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set isLoading=true while session is loading', () => {
    mockUseSession.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should set isLoading=false once session is ready and user has permissions', () => {
    sessionWith('admin', ['requisition:view']);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
  });
});
