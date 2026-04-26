/**
 * Property-Based Tests for Purchase Order Detail Hook - Permission Calculations
 * 
 * These tests verify universal properties that should hold true for permission
 * calculations in the usePurchaseOrderDetail hook.
 * 
 * **Validates: Requirements 1.1, 1.2, 7.1, 7.2**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import { usePurchaseOrderDetail } from '@/hooks/use-purchase-order-detail';
import { PurchaseOrder } from '@/types/purchase-order';

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Create a wrapper with React Query provider for testing hooks
 */
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

// Mock the dependencies
vi.mock('@/hooks/use-purchase-order-queries', () => ({
  usePurchaseOrderById: vi.fn((_id, initialDocument) => ({
    data: initialDocument,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  usePurchaseOrderChain: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-purchase-order-mutations', () => ({
  useSubmitPurchaseOrderForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useWithdrawPurchaseOrder: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../use-approval-history', () => ({
  useApprovalPanelData: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock('@/lib/pdf/pdf-export', () => ({
  exportPurchaseOrderPDF: vi.fn(),
  getPurchaseOrderPDFBlob: vi.fn(),
}));

// ============================================================================
// FAST-CHECK ARBITRARIES (GENERATORS)
// ============================================================================

/**
 * Generator for valid UUID strings
 */
const uuidArbitrary = fc.uuid();

/**
 * Generator for PO status values
 */
const poStatusArbitrary = fc.constantFrom(
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FULFILLED',
  'COMPLETED',
  'CANCELLED'
);

/**
 * Generator for user roles
 */
const userRoleArbitrary = fc.constantFrom(
  'PROCUREMENT_OFFICER',
  'REQUESTER',
  'APPROVER',
  'ADMIN',
  'FINANCE_OFFICER',
  'DEPARTMENT_HEAD'
);

/**
 * Generator for minimal PurchaseOrder objects
 * Only includes fields needed for permission calculations
 */
const purchaseOrderArbitrary: fc.Arbitrary<PurchaseOrder> = fc.record({
  id: uuidArbitrary,
  organizationId: uuidArbitrary,
  documentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  status: poStatusArbitrary,
  createdBy: uuidArbitrary,
  items: fc.constant([]),
  totalAmount: fc.double({ min: 0, max: 1000000 }),
  currency: fc.constant('USD'),
  deliveryDate: fc.date(),
  approvalStage: fc.integer({ min: 0, max: 5 }),
  approvalHistory: fc.constant([]),
  actionHistory: fc.constant([]),
  createdAt: fc.date(),
  updatedAt: fc.date(),
}) as fc.Arbitrary<PurchaseOrder>;

// ============================================================================
// PROPERTY 1: SUBMIT BUTTON VISIBILITY FOR DRAFT POS
// ============================================================================

describe('Property 1: Submit button visibility for draft POs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any PO in DRAFT status where the current user is the creator,
   * the submit button should be visible (canSubmit = true); for any PO not in
   * DRAFT status or where the current user is not the creator, the submit button
   * should not be visible (canSubmit = false).
   * 
   * This property verifies that:
   * 1. canSubmit is true if and only if status is DRAFT AND user is creator
   * 2. canSubmit is false for all non-DRAFT statuses regardless of creator
   * 3. canSubmit is false for DRAFT POs where user is not the creator
   * 4. The permission calculation is consistent across all valid inputs
   * 
   * **Validates: Requirements 1.1, 1.2, 7.1, 7.2**
   */
  it('should set canSubmit=true only for creator in DRAFT status, false otherwise', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          // Execute: Render hook with the generated PO and user
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          // Get the calculated permissions
          const { permissions } = result.current;

          // Determine expected values
          const isCreator = po.createdBy === userId;
          const isDraft = po.status?.toUpperCase() === 'DRAFT';
          const expectedCanSubmit = isDraft && isCreator;

          // Property assertion: canSubmit should match expected value
          expect(permissions.canSubmit).toBe(expectedCanSubmit);

          // Additional invariant checks:
          // If canSubmit is true, then status must be DRAFT and user must be creator
          if (permissions.canSubmit) {
            expect(po.status?.toUpperCase()).toBe('DRAFT');
            expect(po.createdBy).toBe(userId);
          }

          // If status is not DRAFT, canSubmit must be false
          if (po.status?.toUpperCase() !== 'DRAFT') {
            expect(permissions.canSubmit).toBe(false);
          }

          // If user is not creator, canSubmit must be false
          if (po.createdBy !== userId) {
            expect(permissions.canSubmit).toBe(false);
          }
        }
      ),
      {
        // Run 100 random test cases to ensure property holds
        numRuns: 100,
        // Provide verbose output for debugging if a test fails
        verbose: true,
      }
    );
  });

  /**
   * Property: For DRAFT POs, canSubmit should always equal isCreator
   * 
   * This is a specialized property that focuses on DRAFT status POs.
   * It verifies that for any DRAFT PO, the canSubmit permission is
   * determined solely by whether the user is the creator.
   * 
   * **Validates: Requirements 1.1, 7.1**
   */
  it('should set canSubmit equal to isCreator for any DRAFT PO', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => po.status?.toUpperCase() === 'DRAFT'),
        uuidArbitrary,
        userRoleArbitrary,
        async (draftPO, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: draftPO.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: draftPO,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          // For DRAFT POs, canSubmit should equal isCreator
          expect(permissions.canSubmit).toBe(permissions.isCreator);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For non-DRAFT POs, canSubmit should always be false
   * 
   * This property verifies that regardless of who the user is,
   * if the PO is not in DRAFT status, canSubmit must be false.
   * 
   * **Validates: Requirements 1.2, 7.2**
   */
  it('should set canSubmit=false for any non-DRAFT PO regardless of user', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => po.status?.toUpperCase() !== 'DRAFT'),
        uuidArbitrary,
        userRoleArbitrary,
        async (nonDraftPO, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: nonDraftPO.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: nonDraftPO,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          // For non-DRAFT POs, canSubmit must always be false
          expect(permissions.canSubmit).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: isCreator should be independent of PO status
   * 
   * This property verifies that the isCreator flag is calculated
   * correctly regardless of the PO status. It should only depend
   * on whether createdBy matches userId.
   * 
   * **Validates: Requirements 7.1, 7.2**
   */
  it('should calculate isCreator independently of PO status', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          // isCreator should only depend on createdBy === userId
          const expectedIsCreator = po.createdBy === userId;
          expect(permissions.isCreator).toBe(expectedIsCreator);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Permissions should be consistent for the same inputs
   * 
   * This property verifies that calling the hook multiple times with
   * the same inputs produces the same permission calculations.
   * 
   * **Validates: Requirements 7.1, 7.2**
   */
  it('should produce consistent permissions for the same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          // Render the hook twice with the same inputs
          const { result: result1 } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          const { result: result2 } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          // Permissions should be identical
          expect(result1.current.permissions).toEqual(result2.current.permissions);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// ADDITIONAL PERMISSION PROPERTIES
// ============================================================================

describe('Property 1: Additional permission invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: canEdit should be true only for creator in DRAFT or REJECTED status
   * 
   * This property verifies the canEdit permission calculation.
   * 
   * **Validates: Requirements 7.5, 7.6**
   */
  it('should set canEdit=true only for creator in DRAFT or REJECTED status', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          const isCreator = po.createdBy === userId;
          const poStatus = po.status?.toUpperCase();
          const expectedCanEdit =
            isCreator && (poStatus === 'DRAFT' || poStatus === 'REJECTED');

          expect(permissions.canEdit).toBe(expectedCanEdit);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: canWithdraw should be true only for creator in PENDING status
   * 
   * This property verifies the canWithdraw permission calculation.
   * 
   * **Validates: Requirements 7.5, 7.6**
   */
  it('should set canWithdraw=true only for creator in PENDING status', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          const isCreator = po.createdBy === userId;
          const poStatus = po.status?.toUpperCase();
          const expectedCanWithdraw = poStatus === 'PENDING' && isCreator;

          expect(permissions.canWithdraw).toBe(expectedCanWithdraw);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Non-creators should never have edit, submit, or withdraw permissions
   * 
   * This property verifies that users who are not the creator cannot
   * perform any modification actions on the PO.
   * 
   * **Validates: Requirements 7.1, 7.2, 7.5, 7.6**
   */
  it('should deny all modification permissions to non-creators', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, creatorId, nonCreatorId, userRole) => {
          // Ensure the user is NOT the creator
          fc.pre(creatorId !== nonCreatorId);

          // Set the PO creator
          const poWithCreator = { ...po, createdBy: creatorId };

          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: poWithCreator.id,
                userId: nonCreatorId,
                userRole: userRole,
                initialPurchaseOrder: poWithCreator,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          // Non-creators should have no modification permissions
          expect(permissions.isCreator).toBe(false);
          expect(permissions.canEdit).toBe(false);
          expect(permissions.canSubmit).toBe(false);
          expect(permissions.canWithdraw).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Status should be case-insensitive for permission calculations
   * 
   * This property verifies that the permission logic correctly handles
   * status values regardless of case (since it uses toUpperCase()).
   * 
   * **Validates: Requirements 7.1, 7.2**
   */
  it('should handle status case-insensitively', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        fc.constantFrom('draft', 'DRAFT', 'Draft', 'DraFt'),
        async (poId, userId, userRole, statusVariant) => {
          const po: PurchaseOrder = {
            id: poId,
            organizationId: fc.sample(uuidArbitrary, 1)[0],
            documentNumber: 'PO-001',
            status: statusVariant,
            createdBy: userId,
            items: [],
            totalAmount: 1000,
            currency: 'USD',
            deliveryDate: new Date(),
            approvalStage: 0,
            approvalHistory: [],
            actionHistory: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as PurchaseOrder;

          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          const { permissions } = result.current;

          // Regardless of case, DRAFT status with creator should allow submit
          expect(permissions.canSubmit).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });
});
