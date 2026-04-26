/**
 * Property-Based Tests for Payment Voucher Detail Hook - Permission Calculations
 *
 * Verifies universal permission invariants that must hold across all random
 * combinations of userId, status, and role when using usePaymentVoucherDetail.
 *
 * The hook's permission logic (from use-payment-voucher-detail.ts):
 *   isCreator   = pv.createdBy === userId
 *   canEdit     = isCreator && (status === 'DRAFT' || status === 'REJECTED')
 *   canSubmit   = status === 'DRAFT' && isCreator
 *   canWithdraw = status === 'PENDING' && isCreator
 *
 * Finance-role note: The gateway's finance role does NOT bypass creator checks —
 * the permission logic uses only createdBy vs userId. Tests confirm this.
 *
 * **Validates: Requirements 4.1-4.10, 10.1-10.6, 16.1-16.8**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import { usePaymentVoucherDetail } from '@/hooks/use-payment-voucher-detail';
import { PaymentVoucher, PaymentVoucherStatus } from '@/types/payment-voucher';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/hooks/use-payment-voucher-queries', () => ({
  // Echo back initialDocument (2nd arg) so useDocumentDetail sees the document
  usePaymentVoucherById: vi.fn((_id, initialDocument) => ({
    data: initialDocument,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({ data: initialDocument }),
  })),
  usePaymentVoucherChain: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-payment-voucher-mutations', () => ({
  useSubmitPaymentVoucherForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useWithdrawPaymentVoucher: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useMarkPaymentVoucherAsPaid: vi.fn(() => ({
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

vi.mock('@/lib/pdf/pdf-export', () => ({
  exportPaymentVoucherPDF: vi.fn(),
  getPaymentVoucherPDFBlob: vi.fn(),
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

// Include both upper and lower case variants to exercise toUpperCase() path
const pvStatusArbitrary = fc.constantFrom<string>(
  'DRAFT',
  'draft',
  'IN_REVIEW',
  'in_review',
  'PENDING',
  'pending',
  'APPROVED',
  'approved',
  'REJECTED',
  'rejected',
  'PAID',
  'paid',
  'COMPLETED',
  'completed',
  'CANCELLED',
  'cancelled',
);

const userRoleArbitrary = fc.constantFrom(
  'admin',
  'approver',
  'finance',
  'requester',
);

/**
 * Build a minimal PaymentVoucher with only the fields touched by the
 * permission logic. createdBy is the controlling field.
 */
function makePV(
  id: string,
  organizationId: string,
  status: string,
  createdBy: string,
): PaymentVoucher {
  return {
    id,
    type: 'payment_voucher',
    organizationId,
    documentNumber: 'PV-001',
    vendorId: 'vendor-1',
    vendorName: 'Test Vendor',
    invoiceNumber: 'INV-001',
    status: status as PaymentVoucherStatus,
    amount: 1000,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    glCode: 'GL-001',
    description: 'Test PV',
    approvalStage: 0,
    approvalHistory: [],
    actionHistory: [],
    linkedPO: '',
    procurementFlow: 'payment_first',
    createdAt: new Date(),
    updatedAt: new Date(),
    bankDetails: null,
    requestedDate: new Date(),
    totalAmount: 1000,
    items: [],
    budgetCode: '',
    costCenter: '',
    projectCode: '',
    taxAmount: 0,
    withholdingTaxAmount: 0,
    paidAmount: 0,
    paidDate: new Date(),
    paymentDueDate: new Date(),
    requestedByName: 'Test User',
    title: 'Test Payment',
    department: 'Finance',
    departmentId: 'dept-1',
    priority: 'medium',
    submittedAt: new Date(),
    approvedAt: new Date(),
    createdBy,
    ownerId: createdBy,
  } as unknown as PaymentVoucher;
}

const pvArbitrary: fc.Arbitrary<PaymentVoucher> = fc
  .tuple(uuidArbitrary, uuidArbitrary, pvStatusArbitrary, uuidArbitrary)
  .map(([id, orgId, status, createdBy]) => makePV(id, orgId, status, createdBy));

// ============================================================================
// PROPERTY 1: isCreator — depends solely on createdBy === userId
// ============================================================================

describe('Property 1: isCreator depends only on createdBy field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set isCreator=true when userId matches createdBy', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        userRoleArbitrary,
        async (pv, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId: pv.createdBy,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.isCreator).toBe(true);
        },
      ),
      { numRuns: 60, verbose: true },
    );
  });

  it('should set isCreator=false when userId does not match createdBy', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, nonCreatorId, userRole) => {
          fc.pre(nonCreatorId !== pv.createdBy);

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId: nonCreatorId,
                userRole,
                initialPaymentVoucher: pv,
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
// PROPERTY 2: canSubmit — DRAFT status AND isCreator
// ============================================================================

describe('Property 2: canSubmit is true iff DRAFT status AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly compute canSubmit across all status/userId combos', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator = pv.createdBy === userId;
          const isDraft = pv.status?.toUpperCase() === 'DRAFT';
          const expectedCanSubmit = isDraft && isCreator;

          expect(permissions.canSubmit).toBe(expectedCanSubmit);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canSubmit=false for any non-DRAFT status', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary.filter((pv) => pv.status?.toUpperCase() !== 'DRAFT'),
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canSubmit).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('should set canSubmit equal to isCreator for any DRAFT payment voucher', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary.filter((pv) => pv.status?.toUpperCase() === 'DRAFT'),
        uuidArbitrary,
        userRoleArbitrary,
        async (draftPV, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: draftPV.id,
                userId,
                userRole,
                initialPaymentVoucher: draftPV,
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
// PROPERTY 3: canEdit — (DRAFT or REJECTED) AND isCreator
// ============================================================================

describe('Property 3: canEdit is true iff (DRAFT or REJECTED) AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly compute canEdit across all status/userId combos', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator = pv.createdBy === userId;
          const pvStatus = pv.status?.toUpperCase();
          const expectedCanEdit =
            isCreator && (pvStatus === 'DRAFT' || pvStatus === 'REJECTED');

          expect(permissions.canEdit).toBe(expectedCanEdit);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canEdit=false for non-creators regardless of status', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, creatorId, nonCreatorId, userRole) => {
          fc.pre(creatorId !== nonCreatorId);

          const modifiedPV = { ...pv, createdBy: creatorId, ownerId: creatorId };

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: modifiedPV.id,
                userId: nonCreatorId,
                userRole,
                initialPaymentVoucher: modifiedPV,
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
// PROPERTY 4: canWithdraw — PENDING status AND isCreator
// ============================================================================

describe('Property 4: canWithdraw is true iff PENDING status AND isCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly compute canWithdraw across all status/userId combos', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;
          const isCreator = pv.createdBy === userId;
          const isPending = pv.status?.toUpperCase() === 'PENDING';
          const expectedCanWithdraw = isPending && isCreator;

          expect(permissions.canWithdraw).toBe(expectedCanWithdraw);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should set canWithdraw=false for non-PENDING statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary.filter((pv) => pv.status?.toUpperCase() !== 'PENDING'),
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canWithdraw).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });
});

// ============================================================================
// PROPERTY 5: Finance role does NOT bypass creator checks
// ============================================================================

describe('Property 5: Finance role does not bypass creator-only permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should deny modification permissions to finance users who are not the creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        async (pv, creatorId, financeUserId) => {
          fc.pre(creatorId !== financeUserId);

          const modifiedPV = { ...pv, createdBy: creatorId, ownerId: creatorId };

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: modifiedPV.id,
                userId: financeUserId,
                userRole: 'finance',
                initialPaymentVoucher: modifiedPV,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;

          // Finance role alone does not grant creator permissions
          expect(permissions.isCreator).toBe(false);
          expect(permissions.canEdit).toBe(false);
          expect(permissions.canSubmit).toBe(false);
          expect(permissions.canWithdraw).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('should grant modification permissions to finance users who ARE the creator', async () => {
    // A finance user who created the PV should have the same permissions as any other creator
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        fc.constantFrom<string>('DRAFT', 'REJECTED', 'PENDING'),
        async (pvId, financeCreatorId, status) => {
          const pv = makePV(pvId, 'org-1', status, financeCreatorId);

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId: financeCreatorId,
                userRole: 'finance',
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          const { permissions } = result.current;

          // Must always be creator
          expect(permissions.isCreator).toBe(true);

          // canSubmit only for DRAFT
          if (status.toUpperCase() === 'DRAFT') {
            expect(permissions.canSubmit).toBe(true);
            expect(permissions.canEdit).toBe(true);
          }

          // canEdit for DRAFT or REJECTED
          if (status.toUpperCase() === 'REJECTED') {
            expect(permissions.canEdit).toBe(true);
          }

          // canWithdraw only for PENDING
          if (status.toUpperCase() === 'PENDING') {
            expect(permissions.canWithdraw).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// PROPERTY 6: Non-creator global exclusion (all roles)
// ============================================================================

describe('Property 6: Non-creators of all roles are denied all modification permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should deny canEdit, canSubmit, canWithdraw to non-creator regardless of role', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, creatorId, nonCreatorId, userRole) => {
          fc.pre(creatorId !== nonCreatorId);

          const modifiedPV = { ...pv, createdBy: creatorId, ownerId: creatorId };

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: modifiedPV.id,
                userId: nonCreatorId,
                userRole,
                initialPaymentVoucher: modifiedPV,
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
      { numRuns: 80 },
    );
  });
});

// ============================================================================
// PROPERTY 7: Consistency / Idempotency
// ============================================================================

describe('Property 7: Permission calculations are consistent for identical inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should produce identical permissions when rendered twice with the same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        pvArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (pv, userId, userRole) => {
          const { result: r1 } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          const { result: r2 } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId,
                userRole,
                initialPaymentVoucher: pv,
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
// PROPERTY 8: Status is treated case-insensitively
// ============================================================================

describe('Property 8: Status comparisons are case-insensitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should compute canSubmit=true for mixed-case draft status when user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        fc.constantFrom('draft', 'DRAFT', 'Draft', 'DraFt'),
        async (pvId, creatorId, userRole, statusVariant) => {
          const pv = makePV(pvId, 'org-1', statusVariant, creatorId);

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId: creatorId,
                userRole,
                initialPaymentVoucher: pv,
              }),
            { wrapper: createWrapper() },
          );

          expect(result.current.permissions.canSubmit).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('should compute canWithdraw=true for mixed-case pending status when user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        fc.constantFrom('pending', 'PENDING', 'Pending', 'PeNdInG'),
        async (pvId, creatorId, userRole, statusVariant) => {
          const pv = makePV(pvId, 'org-1', statusVariant, creatorId);

          const { result } = renderHook(
            () =>
              usePaymentVoucherDetail({
                pvId: pv.id,
                userId: creatorId,
                userRole,
                initialPaymentVoucher: pv,
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
