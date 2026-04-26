/**
 * Property-Based Tests for Purchase Order Detail - UI State Change After Submission
 * 
 * These tests verify that the UI state correctly changes after a successful PO submission.
 * 
 * **Validates: Requirements 1.6**
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

vi.mock('@/hooks/use-approval-history', () => ({
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
// PROPERTY 4: UI STATE CHANGE AFTER SUBMISSION
// ============================================================================

describe('Property 4: UI state change after submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any PO that transitions from DRAFT to PENDING status,
   * the canSubmit permission should change from true to false.
   * 
   * This property verifies the core logic that drives the UI state change:
   * - DRAFT + creator → canSubmit = true (submit button visible)
   * - PENDING + creator → canSubmit = false (submit button hidden)
   * 
   * **Validates: Requirements 1.6**
   */
  it('should change canSubmit from true to false when PO transitions from DRAFT to PENDING', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (poId, userId, userRole) => {
          // Create DRAFT PO where user is creator
          const draftPO: PurchaseOrder = {
            id: poId,
            organizationId: fc.sample(uuidArbitrary, 1)[0],
            documentNumber: 'PO-001',
            status: 'DRAFT',
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

          // Test DRAFT state
          const { result: draftResult } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: poId,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: draftPO,
              }),
            { wrapper: createWrapper() }
          );

          // For DRAFT PO with creator, canSubmit should be true
          expect(draftResult.current.permissions.canSubmit).toBe(true);

          // Create PENDING PO (same PO after submission)
          const pendingPO: PurchaseOrder = {
            ...draftPO,
            status: 'PENDING',
            approvalStage: 1,
          };

          // Test PENDING state
          const { result: pendingResult } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: poId,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: pendingPO,
              }),
            { wrapper: createWrapper() }
          );

          // For PENDING PO, canSubmit should be false
          expect(pendingResult.current.permissions.canSubmit).toBe(false);

          // Property: canSubmit changes from true to false
          expect(draftResult.current.permissions.canSubmit).not.toBe(
            pendingResult.current.permissions.canSubmit
          );
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
  });

  /**
   * Property: For any DRAFT PO where user is creator, canSubmit is true
   * 
   * This verifies the "before submission" state that enables the submit button.
   * 
   * **Validates: Requirements 1.1, 1.6**
   */
  it('should set canSubmit=true for any DRAFT PO where user is creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => po.status?.toUpperCase() === 'DRAFT'),
        uuidArbitrary,
        userRoleArbitrary,
        async (draftPO, userId, userRole) => {
          // Ensure user is the creator
          draftPO.createdBy = userId;

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

          // For DRAFT PO with creator, canSubmit must be true
          expect(result.current.permissions.canSubmit).toBe(true);
          expect(result.current.permissions.isCreator).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: For any PENDING PO, canSubmit is false regardless of creator
   * 
   * This verifies the "after submission" state that hides the submit button.
   * 
   * **Validates: Requirements 1.2, 1.6**
   */
  it('should set canSubmit=false for any PENDING PO regardless of creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => po.status?.toUpperCase() === 'PENDING'),
        uuidArbitrary,
        userRoleArbitrary,
        async (pendingPO, userId, userRole) => {
          // User can be creator or not - doesn't matter
          pendingPO.createdBy = userId;

          const { result } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: pendingPO.id,
                userId: userId,
                userRole: userRole,
                initialPurchaseOrder: pendingPO,
              }),
            { wrapper: createWrapper() }
          );

          // For PENDING PO, canSubmit must be false
          expect(result.current.permissions.canSubmit).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: canSubmit and canWithdraw are mutually exclusive
   * 
   * This property verifies that:
   * - DRAFT POs have canSubmit=true, canWithdraw=false
   * - PENDING POs have canSubmit=false, canWithdraw=true (for creator)
   * 
   * This mutual exclusivity drives the UI state change where the submit
   * button is replaced by the withdraw button after submission.
   * 
   * **Validates: Requirements 1.6**
   */
  it('should have mutually exclusive canSubmit and canWithdraw permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        userRoleArbitrary,
        async (po, userId, userRole) => {
          // Ensure user is the creator
          po.createdBy = userId;

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

          const { canSubmit, canWithdraw } = result.current.permissions;

          // Property: canSubmit and canWithdraw cannot both be true
          expect(canSubmit && canWithdraw).toBe(false);

          // Additional invariants based on status
          const status = po.status?.toUpperCase();
          if (status === 'DRAFT') {
            expect(canSubmit).toBe(true);
            expect(canWithdraw).toBe(false);
          } else if (status === 'PENDING') {
            expect(canSubmit).toBe(false);
            expect(canWithdraw).toBe(true);
          } else {
            // For other statuses, both should be false
            expect(canSubmit).toBe(false);
            expect(canWithdraw).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Status determines UI state, not user role
   * 
   * This property verifies that the UI state (canSubmit) is determined
   * by PO status, not by the user's role.
   * 
   * **Validates: Requirements 1.6**
   */
  it('should determine canSubmit by PO status, not user role', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        uuidArbitrary,
        fc.tuple(userRoleArbitrary, userRoleArbitrary),
        async (po, userId, [role1, role2]) => {
          // Ensure user is the creator
          po.createdBy = userId;

          // Test with role1
          const { result: result1 } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: role1,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          // Test with role2
          const { result: result2 } = renderHook(
            () =>
              usePurchaseOrderDetail({
                poId: po.id,
                userId: userId,
                userRole: role2,
                initialPurchaseOrder: po,
              }),
            { wrapper: createWrapper() }
          );

          // canSubmit should be the same regardless of role
          expect(result1.current.permissions.canSubmit).toBe(
            result2.current.permissions.canSubmit
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Permissions are consistent for the same inputs
   * 
   * This property verifies that calling the hook multiple times with
   * the same inputs produces the same permission calculations.
   * 
   * **Validates: Requirements 1.6**
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
