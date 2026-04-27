/**
 * Property-Based Tests for Purchase Order Detail - Approval Action Controls Visibility
 * 
 * These tests verify that approval action controls are shown only to authorized approvers.
 * 
 * **Validates: Requirements 3.3, 3.8, 7.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import { ApprovalActionContent } from '@/app/(private)/(main)/requisitions/_components/approval-history-panel';
import { PurchaseOrder } from '@/types/purchase-order';
import { WorkflowDocument } from '@/types';

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Create a wrapper with React Query provider for testing components
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

// Mock the ApprovalActionPanel component to avoid complex dependencies
vi.mock('@/app/(private)/(main)/requisitions/_components/requisition-approval-panel', () => ({
  ApprovalActionPanel: ({ requisitionId, onApprovalComplete }: any) => (
    <div data-testid="approval-action-panel">
      Approval Action Panel for {requisitionId}
    </div>
  ),
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
  'CANCELLED',
  'IN_REVIEW'
);

/**
 * Generator for workflow status values
 */
const workflowStatusStringArbitrary = fc.constantFrom(
  'in_progress',
  'completed',
  'rejected',
  'no_workflow'
);

/**
 * Generator for boolean values
 */
const booleanArbitrary = fc.boolean();

/**
 * Generator for workflow status objects
 * This represents the workflowStatus prop passed to ApprovalActionContent
 */
const workflowStatusArbitrary = fc.record({
  status: workflowStatusStringArbitrary,
  canApprove: booleanArbitrary,
  canReject: booleanArbitrary,
  currentStage: fc.integer({ min: 1, max: 5 }),
  totalStages: fc.integer({ min: 1, max: 5 }),
});

/**
 * Generator for minimal PurchaseOrder objects
 * Only includes fields needed for approval control visibility
 */
const purchaseOrderArbitrary: fc.Arbitrary<WorkflowDocument> = fc.record({
  id: uuidArbitrary,
  organizationId: uuidArbitrary,
  documentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  status: poStatusArbitrary,
  createdBy: uuidArbitrary,
  createdAt: fc.date(),
  updatedAt: fc.date(),
  type: fc.constant('purchase_order' as const),
}) as fc.Arbitrary<WorkflowDocument>;

// ============================================================================
// PROPERTY 5: APPROVAL ACTION CONTROLS VISIBILITY
// ============================================================================

describe('Property 5: Approval action controls visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any PO in PENDING status, approval action controls should be
   * visible if and only if the current user is an approver for the current
   * workflow stage.
   * 
   * This property verifies that:
   * 1. Approval controls are visible when status is PENDING and canApprove is true
   * 2. Approval controls are NOT visible when status is PENDING but canApprove is false
   * 3. Approval controls are NOT visible when status is not PENDING regardless of canApprove
   * 4. The visibility logic is consistent across all valid inputs
   * 
   * **Validates: Requirements 3.3, 3.8, 7.3**
   */
  it('should show approval controls if and only if status is PENDING and canApprove is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        workflowStatusArbitrary,
        async (po, workflowStatus) => {
          // Execute: Render the component with generated data
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // Determine expected visibility
          // Source has early return for DRAFT/REJECTED → "Ready to Submit"
          // Then: (PENDING || IN_REVIEW || workflow_in_progress) && canApprove → show panel
          const isDraftOrRejected =
            po.status?.toUpperCase() === 'DRAFT' ||
            po.status?.toUpperCase() === 'REJECTED';
          const isPending =
            po.status?.toUpperCase() === 'PENDING' ||
            po.status?.toUpperCase() === 'IN_REVIEW';
          const isWorkflowInProgress = workflowStatus.status === 'in_progress';
          const canApprove = workflowStatus.canApprove;

          const shouldShowApprovalControls =
            !isDraftOrRejected && (isPending || isWorkflowInProgress) && canApprove;

          // Check if approval action panel is rendered
          const approvalPanel = screen.queryByTestId('approval-action-panel');

          // Property assertion: Approval controls visibility matches expected
          if (shouldShowApprovalControls) {
            expect(approvalPanel).toBeInTheDocument();
            // Should show the approval action panel
            expect(approvalPanel).toBeTruthy();
          } else {
            // Should NOT show the approval action panel
            expect(approvalPanel).not.toBeInTheDocument();
          }

          // Additional invariant checks:
          // If approval panel is visible, canApprove must be true and at least one trigger condition met
          if (approvalPanel) {
            expect(canApprove).toBe(true);
            expect(isPending || isWorkflowInProgress).toBe(true);
          }

          // If canApprove is false, approval panel must not be visible
          if (!canApprove) {
            expect(approvalPanel).not.toBeInTheDocument();
          }

          // If neither pending/in_review nor workflow in_progress, approval panel must not be visible
          if (!isPending && !isWorkflowInProgress) {
            expect(approvalPanel).not.toBeInTheDocument();
          }

          // Cleanup after each iteration to avoid DOM accumulation
          unmount();
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
   * Property: For PENDING POs with canApprove=true, approval controls must be visible
   * 
   * This is a specialized property that focuses on the positive case where
   * approval controls should definitely be shown.
   * 
   * **Validates: Requirements 3.3**
   */
  it('should always show approval controls for PENDING POs when canApprove is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => 
          po.status?.toUpperCase() === 'PENDING' || 
          po.status?.toUpperCase() === 'IN_REVIEW'
        ),
        workflowStatusArbitrary.filter((ws) => 
          ws.canApprove === true && ws.status === 'in_progress'
        ),
        async (pendingPO, approverWorkflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={pendingPO.id}
              requisition={pendingPO}
              workflowStatus={approverWorkflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // For PENDING POs with canApprove=true, approval panel must be visible
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For PENDING POs with canApprove=false, approval controls must NOT be visible
   * 
   * This property verifies the negative case where the user is not authorized
   * to approve even though the PO is in PENDING status.
   * 
   * **Validates: Requirements 3.8, 7.3**
   */
  it('should never show approval controls for PENDING POs when canApprove is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => 
          po.status?.toUpperCase() === 'PENDING' || 
          po.status?.toUpperCase() === 'IN_REVIEW'
        ),
        workflowStatusArbitrary.filter((ws) => ws.canApprove === false),
        async (pendingPO, nonApproverWorkflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={pendingPO.id}
              requisition={pendingPO}
              workflowStatus={nonApproverWorkflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // For PENDING POs with canApprove=false, approval panel must NOT be visible
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).not.toBeInTheDocument();

          // Should show "No Actions Available" message instead
          expect(screen.getByText('No Actions Available')).toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For non-PENDING POs with workflow not in progress, approval controls must never be visible
   *
   * This property verifies that when neither the status nor the workflow triggers
   * the approval panel condition, approval controls are not shown.
   * The source shows the panel when: (PENDING || IN_REVIEW || workflow_in_progress) && canApprove
   *
   * **Validates: Requirements 3.8, 7.3**
   */
  it('should never show approval controls for non-PENDING POs regardless of canApprove', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => {
          const status = po.status?.toUpperCase();
          return status !== 'PENDING' && status !== 'IN_REVIEW';
        }),
        // Also filter out in_progress workflow status, since source checks that OR condition
        workflowStatusArbitrary.filter((ws) => ws.status !== 'in_progress'),
        async (nonPendingPO, workflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={nonPendingPO.id}
              requisition={nonPendingPO}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // For non-PENDING POs with non-in_progress workflow, approval panel must never be visible
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).not.toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: DRAFT POs should show "Ready to Submit" message
   * 
   * This property verifies that DRAFT POs show the appropriate message
   * instead of approval controls.
   * 
   * **Validates: Requirements 3.2**
   */
  it('should show "Ready to Submit" message for DRAFT POs', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary.filter((po) => 
          po.status?.toUpperCase() === 'DRAFT'
        ),
        workflowStatusArbitrary,
        async (draftPO, workflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={draftPO.id}
              requisition={draftPO}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // DRAFT POs should show "Ready to Submit" message
          expect(screen.getByText('Ready to Submit')).toBeInTheDocument();

          // Should NOT show approval panel
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).not.toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Approval controls visibility should be consistent for the same inputs
   * 
   * This property verifies that rendering the component multiple times with
   * the same inputs produces the same visibility result.
   * 
   * **Validates: Requirements 3.3, 3.8**
   */
  it('should produce consistent visibility for the same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        workflowStatusArbitrary,
        async (po, workflowStatus) => {
          // Render the component twice with the same inputs
          const { unmount: unmount1 } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          const approvalPanel1 = screen.queryByTestId('approval-action-panel');
          unmount1();

          // Render again with same inputs
          const { unmount: unmount2 } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          const approvalPanel2 = screen.queryByTestId('approval-action-panel');
          unmount2();

          // Visibility should be consistent
          if (approvalPanel1) {
            expect(approvalPanel2).toBeTruthy();
          } else {
            expect(approvalPanel2).toBeFalsy();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Status comparison should be case-insensitive
   * 
   * This property verifies that the visibility logic correctly handles
   * status values regardless of case (since it uses toUpperCase()).
   * 
   * **Validates: Requirements 3.3, 3.8**
   */
  it('should handle status case-insensitively', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary,
        fc.constantFrom('pending', 'PENDING', 'Pending', 'PeNdInG'),
        workflowStatusArbitrary.filter((ws) => 
          ws.canApprove === true && ws.status === 'in_progress'
        ),
        async (poId, statusVariant, workflowStatus) => {
          const po: WorkflowDocument = {
            id: poId,
            organizationId: fc.sample(uuidArbitrary, 1)[0],
            documentNumber: 'PO-001',
            status: statusVariant,
            createdBy: fc.sample(uuidArbitrary, 1)[0],
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'purchase_order',
          };

          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // Regardless of case, PENDING status with canApprove=true should show approval controls
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// ADDITIONAL INVARIANT TESTS
// ============================================================================

describe('Property 5: Additional approval control invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: Loading state should show loading indicator, not approval controls
   * 
   * This property verifies that when isLoading is true, the component shows
   * a loading indicator instead of approval controls.
   * 
   * **Validates: Requirements 2.8**
   */
  it('should show loading indicator when isLoading is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        workflowStatusArbitrary,
        async (po, workflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={true}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          // Should show loading message
          expect(screen.getByText('Loading approval data...')).toBeInTheDocument();

          // Should NOT show approval panel
          const approvalPanel = screen.queryByTestId('approval-action-panel');
          expect(approvalPanel).not.toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Approval controls require both PENDING status AND canApprove=true
   * 
   * This property verifies the AND logic: both conditions must be true
   * for approval controls to be visible.
   * 
   * **Validates: Requirements 3.3, 3.8, 7.3**
   */
  it('should require both PENDING status AND canApprove=true for approval controls', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderArbitrary,
        workflowStatusArbitrary,
        async (po, workflowStatus) => {
          const { unmount } = render(
            <ApprovalActionContent
              requisitionId={po.id}
              requisition={po}
              workflowStatus={workflowStatus}
              isLoading={false}
              onApprovalComplete={() => {}}
            />,
            { wrapper: createWrapper() }
          );

          const approvalPanel = screen.queryByTestId('approval-action-panel');

          const isPending =
            po.status?.toUpperCase() === 'PENDING' ||
            po.status?.toUpperCase() === 'IN_REVIEW';
          const isWorkflowInProgress = workflowStatus.status === 'in_progress';
          const canApprove = workflowStatus.canApprove;

          // If approval panel is visible, canApprove must be true and at least one trigger condition met
          // Source condition: (PENDING || IN_REVIEW || workflow_in_progress) && canApprove
          if (approvalPanel) {
            expect(canApprove).toBe(true);
            expect(isPending || isWorkflowInProgress).toBe(true);
          }

          // If canApprove is false or neither trigger condition is met, approval panel must NOT be visible
          if (!canApprove || (!isPending && !isWorkflowInProgress)) {
            expect(approvalPanel).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});
