/**
 * Property-Based Tests for Requisition Detail Hook - Permission Calculations
 *
 * Verifies universal permission invariants that must hold across all random
 * combinations of userId, status, and role when using useRequisitionDetail.
 *
 * The hook's permission logic (from use-requisition-detail.ts):
 *   isCreator  = requisition.requestedBy === userId || requisition.requesterId === userId
 *   canEdit    = isCreator && (status === 'DRAFT' || status === 'REJECTED')
 *   canSubmit  = status === 'DRAFT' && isCreator
 *   canWithdraw = status === 'PENDING' && isCreator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import { useRequisitionDetail } from '@/hooks/use-requisition-detail';
import { Requisition } from '@/types/requisition';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/hooks/use-requisition-queries', () => ({
  // Echo back initialDocument (2nd arg) so useDocumentDetail sees the document
  useRequisitionById: vi.fn((_id, initialDocument) => ({
    data: initialDocument,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({ data: initialDocument }),
  })),
  useRequisitionChain: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
  useSubmitRequisitionForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/use-requisition-mutations', () => ({
  useWithdrawRequisition: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/use-approval-history', () => ({
  useApprovalPanelData: vi.fn(() => ({
    approvalHistory: [],
    availableApprovers: [],
    workflowStatus: null,
    isLoading: false,
    hasError: false,
    refetchAll: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-requisition-storage', () => ({
  useRequisitionStorage: vi.fn(() => ({
    saveToStorage: vi.fn(),
  })),
}));

vi.mock('@/lib/pdf/pdf-export', () => ({
  exportRequisitionPDF: vi.fn(),
  getRequisitionPDFBlob: vi.fn(),
}));

vi.mock('@/hooks/use-organization', () => ({
  useOrganizationContext: vi.fn(() => ({
    currentOrganization: null,
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================================
// TEST SETUP
// ============================================================================

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
// FAST-CHECK ARBITRARIES
// ============================================================================

const uuidArbitrary = fc.uuid();

const requisitionStatusArbitrary = fc.constantFrom(
  'draft',
  'DRAFT',
  'pending',
  'PENDING',
  'approved',
  'APPROVED',
  'rejected',
  'REJECTED',
  'completed',
  'COMPLETED',
  'cancelled',
  'CANCELLED',
);

const userRoleArbitrary = fc.constantFrom(
  'admin',
  'approver',
  'finance',
  'requester',
);

/**
 * Builds a minimal Requisition with only the fields needed for permission checks.
 * Both requestedBy and requesterId are set to the same value (creatorId) since the
 * hook checks either field.
 */
function makeRequisition(
  id: string,
  organizationId: string,
  status: string,
  creatorId: string,
): Requisition {
  return {
    id,
    organizationId,
    documentNumber: 'REQ-001',
    requesterId: creatorId,
    requestedBy: creatorId,
    requesterName: 'Test User',
    title: 'Test Requisition',
    description: '',
    department: 'Test Dept',
    departmentId: 'dept-1',
    status: status as any,
    priority: 'medium' as any,
    items: [],
    totalAmount: 0,
    currency: 'USD',
    approvalStage: 0,
    approvalHistory: [],
    categoryId: undefined,
    category: undefined,
    categoryName: '',
    preferredVendorId: undefined,
    preferredVendor: undefined,
    preferredVendorName: '',
    automationUsed: false,
    autoCreatedPO: false,
    isEstimate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    budgetCode: '',
    requestedByName: 'Test User',
    requestedByRole: 'requester',
    totalApprovalStages: 1,
    requestedDate: new Date(),
    requiredByDate: new Date(),
    costCenter: '',
    projectCode: '',
    createdBy: creatorId,
    createdByName: 'Test User',
    createdByRole: 'requester',
  } as unknown as Requisition;
}

const requisitionArbitrary: fc.Arbitrary<Requisition> = fc
  .tuple(uuidArbitrary, uuidArbitrary, requisitionStatusArbitrary, uuidArbitrary)
  .map(([id, orgId, status, creatorId]) =>
    makeRequisition(id, orgId, status, creatorId),
  );

// ============================================================================
// PROPERTY 1: isCreator flag correctness
// ============================================================================

describe('Property 1: isCreator flag is independent of status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set isCreator=true when userId matches requestedBy or requesterId', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        userRoleArbitrary,
        async (req, userRole) => {
          // Use the creator's own ID — isCreator must be true
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId: req.requestedBy as string,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.isCreator).toBe(true);
        },
      ),
      { numRuns: 60, verbose: true },
    );
  });

  it('should set isCreator=false when userId does not match either creator field', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, nonCreatorId, userRole) => {
          // Precondition: nonCreatorId must differ from both creator fields
          fc.pre(nonCreatorId !== req.requestedBy);
          fc.pre(nonCreatorId !== req.requesterId);

          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId: nonCreatorId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.isCreator).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });
});

// ============================================================================
// PROPERTY 2: canSubmit invariants
// ============================================================================

describe('Property 2: canSubmit is true iff DRAFT status AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set canSubmit=true only when status is DRAFT and user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator =
            req.requestedBy === userId || req.requesterId === userId;
          const isDraft = req.status?.toUpperCase() === 'DRAFT';
          const expectedCanSubmit = isDraft && isCreator;

          expect(permissions.canSubmit).toBe(expectedCanSubmit);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canSubmit=false for any non-DRAFT status regardless of user', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary.filter(
          (r) => r.status?.toUpperCase() !== 'DRAFT',
        ),
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canSubmit).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('should set canSubmit equal to isCreator for any DRAFT requisition', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary.filter(
          (r) => r.status?.toUpperCase() === 'DRAFT',
        ),
        uuidArbitrary,
        userRoleArbitrary,
        async (draftReq, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: draftReq.id,
                userId,
                userRole,
                initialRequisition: draftReq,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canSubmit).toBe(
            result.current.permissions.isCreator,
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// PROPERTY 3: canEdit invariants
// ============================================================================

describe('Property 3: canEdit is true iff (DRAFT or REJECTED) AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set canEdit=true only for creator in DRAFT or REJECTED status', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator =
            req.requestedBy === userId || req.requesterId === userId;
          const status = req.status?.toUpperCase();
          const expectedCanEdit =
            isCreator && (status === 'DRAFT' || status === 'REJECTED');

          expect(permissions.canEdit).toBe(expectedCanEdit);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canEdit=false for non-creators regardless of status', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, creatorId, nonCreatorId, userRole) => {
          fc.pre(creatorId !== nonCreatorId);

          const modifiedReq = {
            ...req,
            requestedBy: creatorId,
            requesterId: creatorId,
            createdBy: creatorId,
          };

          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: modifiedReq.id,
                userId: nonCreatorId,
                userRole,
                initialRequisition: modifiedReq,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canEdit).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// PROPERTY 4: canWithdraw invariants
// ============================================================================

describe('Property 4: canWithdraw is true iff PENDING status AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set canWithdraw=true only for creator in PENDING status', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator =
            req.requestedBy === userId || req.requesterId === userId;
          const isPending = req.status?.toUpperCase() === 'PENDING';
          const expectedCanWithdraw = isPending && isCreator;

          expect(permissions.canWithdraw).toBe(expectedCanWithdraw);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canWithdraw=false for any non-PENDING status', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary.filter(
          (r) => r.status?.toUpperCase() !== 'PENDING',
        ),
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canWithdraw).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// PROPERTY 5: Non-creator global exclusion
// ============================================================================

describe('Property 5: Non-creators are denied all modification permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should deny canEdit, canSubmit, canWithdraw to any non-creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, creatorId, nonCreatorId, userRole) => {
          fc.pre(creatorId !== nonCreatorId);

          const modifiedReq: Requisition = {
            ...req,
            requestedBy: creatorId,
            requesterId: creatorId,
            createdBy: creatorId,
          };

          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: modifiedReq.id,
                userId: nonCreatorId,
                userRole,
                initialRequisition: modifiedReq,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;

          expect(permissions.isCreator).toBe(false);
          expect(permissions.canEdit).toBe(false);
          expect(permissions.canSubmit).toBe(false);
          expect(permissions.canWithdraw).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });
});

// ============================================================================
// PROPERTY 6: Idempotency / Consistency
// ============================================================================

describe('Property 6: Permissions are consistent for identical inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should produce identical permissions when rendered twice with the same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        requisitionArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (req, userId, userRole) => {
          const { result: r1 } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          const { result: r2 } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(r1.current.permissions).toEqual(r2.current.permissions);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ============================================================================
// PROPERTY 7: Status is treated case-insensitively
// ============================================================================

describe('Property 7: Status comparisons are case-insensitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow canSubmit for draft regardless of case when user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        fc.constantFrom('draft', 'DRAFT', 'Draft', 'DraFt'),
        async (reqId, creatorId, userRole, statusVariant) => {
          const req = makeRequisition(reqId, 'org-1', statusVariant, creatorId);

          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId: creatorId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canSubmit).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('should allow canWithdraw for pending regardless of case when user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        fc.constantFrom('pending', 'PENDING', 'Pending', 'PeNdInG'),
        async (reqId, creatorId, userRole, statusVariant) => {
          const req = makeRequisition(reqId, 'org-1', statusVariant, creatorId);

          const { result } = renderHook(
            () =>
              useRequisitionDetail({
                requisitionId: req.id,
                userId: creatorId,
                userRole,
                initialRequisition: req,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canWithdraw).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});
