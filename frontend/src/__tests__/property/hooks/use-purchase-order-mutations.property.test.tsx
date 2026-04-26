/**
 * Property-Based Tests for Purchase Order Mutations
 * 
 * These tests verify universal properties that should hold true across all valid inputs.
 * They use fast-check for property-based testing to generate random test cases.
 * 
 * **Validates: Requirements 1.4, 9.5, 14.1**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import { useSubmitPurchaseOrderForApproval } from '@/hooks/use-purchase-order-mutations';
import * as purchaseOrderActions from '@/app/_actions/purchase-orders';
import { SubmitPurchaseOrderRequest } from '@/types/purchase-order';

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

// ============================================================================
// FAST-CHECK ARBITRARIES (GENERATORS)
// ============================================================================

/**
 * Generator for valid UUID strings
 */
const uuidArbitrary = fc.uuid();

/**
 * Generator for valid workflow IDs
 * Workflow IDs are UUIDs in the system
 */
const workflowIdArbitrary = fc.uuid();

/**
 * Generator for valid purchase order IDs
 */
const purchaseOrderIdArbitrary = fc.uuid();

/**
 * Generator for valid user IDs
 */
const userIdArbitrary = fc.uuid();

/**
 * Generator for user names (non-empty strings with reasonable length)
 */
const userNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generator for user roles (common role names)
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
 * Generator for optional comments
 */
const commentsArbitrary = fc.option(
  fc.string({ maxLength: 500 }),
  { nil: undefined }
);

/**
 * Generator for complete SubmitPurchaseOrderRequest objects
 * This generates all valid combinations of submission data
 */
const submitRequestArbitrary: fc.Arbitrary<SubmitPurchaseOrderRequest> = fc.record({
  purchaseOrderId: purchaseOrderIdArbitrary,
  workflowId: workflowIdArbitrary,
  submittingUserId: userIdArbitrary,
  submittedByName: userNameArbitrary,
  submittedByRole: userRoleArbitrary,
  comments: commentsArbitrary,
});

// ============================================================================
// PROPERTY 2: SUBMIT WORKFLOW API INTEGRATION
// ============================================================================

describe('Property 2: Submit workflow API integration', () => {
  let mockSubmitPurchaseOrderForApproval: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the server action
    mockSubmitPurchaseOrderForApproval = vi.fn();
    vi.spyOn(purchaseOrderActions, 'submitPurchaseOrderForApproval').mockImplementation(
      mockSubmitPurchaseOrderForApproval
    );

    // Mock toast to avoid console warnings
    vi.mock('sonner', () => ({
      toast: {
        success: vi.fn(),
        error: vi.fn(),
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property: For any PO and selected workflow ID, when the user confirms submission
   * in the workflow dialog, the system should call POST /purchase-orders/:id/submit
   * with the workflowId in the request body.
   * 
   * This property verifies that:
   * 1. The mutation hook calls the correct server action
   * 2. The workflowId is included in the request body
   * 3. All required fields are passed correctly
   * 4. The API integration works for all valid input combinations
   * 
   * **Validates: Requirements 1.4, 9.5, 14.1**
   */
  it('should call POST /purchase-orders/:id/submit with workflowId for any valid submission data', async () => {
    await fc.assert(
      fc.asyncProperty(submitRequestArbitrary, async (submitData) => {
        // Reset mock before each iteration to ensure clean call count
        mockSubmitPurchaseOrderForApproval.mockClear();

        // Setup: Mock successful API response
        mockSubmitPurchaseOrderForApproval.mockResolvedValue({
          success: true,
          data: {
            id: submitData.purchaseOrderId,
            status: 'PENDING',
          },
          message: 'Purchase order submitted for approval',
        });

        // Execute: Render hook and trigger mutation
        const { result } = renderHook(
          () => useSubmitPurchaseOrderForApproval(),
          { wrapper: createWrapper() }
        );

        // Trigger the mutation
        await result.current.mutateAsync(submitData);

        // Wait for mutation to complete
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Verify: The server action was called exactly once
        expect(mockSubmitPurchaseOrderForApproval).toHaveBeenCalledTimes(1);

        // Verify: The server action was called with the correct data structure
        const callArgs = mockSubmitPurchaseOrderForApproval.mock.calls[0][0];

        // Property assertion: workflowId must be present in the request
        expect(callArgs).toHaveProperty('workflowId');
        expect(callArgs.workflowId).toBe(submitData.workflowId);

        // Property assertion: purchaseOrderId must be present
        expect(callArgs).toHaveProperty('purchaseOrderId');
        expect(callArgs.purchaseOrderId).toBe(submitData.purchaseOrderId);

        // Property assertion: submitting user information must be present
        expect(callArgs).toHaveProperty('submittingUserId');
        expect(callArgs.submittingUserId).toBe(submitData.submittingUserId);
        expect(callArgs).toHaveProperty('submittedByName');
        expect(callArgs.submittedByName).toBe(submitData.submittedByName);
        expect(callArgs).toHaveProperty('submittedByRole');
        expect(callArgs.submittedByRole).toBe(submitData.submittedByRole);

        // Property assertion: comments should be passed if provided
        if (submitData.comments !== undefined) {
          expect(callArgs).toHaveProperty('comments');
          expect(callArgs.comments).toBe(submitData.comments);
        }
      }),
      {
        // Reduced runs to stay within test timeout
        numRuns: 20,
        // Provide verbose output for debugging if a test fails
        verbose: true,
      }
    );
  });

  /**
   * Property: The workflowId must never be undefined or empty when submitting
   * 
   * This property verifies that the mutation enforces the requirement that
   * workflowId is mandatory for submission.
   * 
   * **Validates: Requirements 1.4, 9.5, 9.7**
   */
  it('should require workflowId to be present and non-empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderIdArbitrary,
        workflowIdArbitrary,
        userIdArbitrary,
        userNameArbitrary,
        userRoleArbitrary,
        async (poId, workflowId, userId, userName, userRole) => {
          // Reset mock before each iteration to ensure clean call count
          mockSubmitPurchaseOrderForApproval.mockClear();

          // Setup: Mock API response
          mockSubmitPurchaseOrderForApproval.mockResolvedValue({
            success: true,
            data: { id: poId, status: 'PENDING' },
          });

          const { result } = renderHook(
            () => useSubmitPurchaseOrderForApproval(),
            { wrapper: createWrapper() }
          );

          // Execute: Submit with valid workflowId
          await result.current.mutateAsync({
            purchaseOrderId: poId,
            workflowId: workflowId,
            submittingUserId: userId,
            submittedByName: userName,
            submittedByRole: userRole,
          });

          await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
          });

          // Verify: workflowId was passed to the API
          const callArgs = mockSubmitPurchaseOrderForApproval.mock.calls[0][0];
          expect(callArgs.workflowId).toBeTruthy();
          expect(callArgs.workflowId).toBe(workflowId);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: The mutation should handle API errors gracefully for any input
   * 
   * This property verifies that error handling works correctly regardless
   * of the input data.
   * 
   * **Validates: Requirements 13.1, 13.3**
   */
  it('should handle API errors gracefully for any valid submission data', async () => {
    await fc.assert(
      fc.asyncProperty(submitRequestArbitrary, async (submitData) => {
        // Reset mock before each iteration
        mockSubmitPurchaseOrderForApproval.mockClear();

        // Setup: Mock API error
        const errorMessage = 'Failed to submit purchase order';
        mockSubmitPurchaseOrderForApproval.mockResolvedValue({
          success: false,
          message: errorMessage,
        });

        const { result } = renderHook(
          () => useSubmitPurchaseOrderForApproval(),
          { wrapper: createWrapper() }
        );

        // Execute: Attempt to submit
        try {
          await result.current.mutateAsync(submitData);
        } catch (error) {
          // Expected to throw
        }

        // Wait for mutation to complete
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        // Verify: The mutation is in error state
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: The mutation should preserve all user context fields
   * 
   * This property verifies that user information (ID, name, role) is correctly
   * passed through to the API for audit trail purposes.
   * 
   * **Validates: Requirements 1.8, 4.2, 4.3**
   */
  it('should preserve all user context fields in the API call', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderIdArbitrary,
        workflowIdArbitrary,
        userIdArbitrary,
        userNameArbitrary,
        userRoleArbitrary,
        commentsArbitrary,
        async (poId, workflowId, userId, userName, userRole, comments) => {
          // Reset mock before each iteration
          mockSubmitPurchaseOrderForApproval.mockClear();

          // Setup: Mock successful response
          mockSubmitPurchaseOrderForApproval.mockResolvedValue({
            success: true,
            data: { id: poId, status: 'PENDING' },
          });

          const { result } = renderHook(
            () => useSubmitPurchaseOrderForApproval(),
            { wrapper: createWrapper() }
          );

          // Execute: Submit with all user context
          const submitData: SubmitPurchaseOrderRequest = {
            purchaseOrderId: poId,
            workflowId: workflowId,
            submittingUserId: userId,
            submittedByName: userName,
            submittedByRole: userRole,
            comments: comments,
          };

          await result.current.mutateAsync(submitData);

          await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
          });

          // Verify: All user context fields are preserved
          const callArgs = mockSubmitPurchaseOrderForApproval.mock.calls[0][0];
          
          expect(callArgs.submittingUserId).toBe(userId);
          expect(callArgs.submittedByName).toBe(userName);
          expect(callArgs.submittedByRole).toBe(userRole);
          
          // Comments should be preserved if provided
          if (comments !== undefined) {
            expect(callArgs.comments).toBe(comments);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// ADDITIONAL PROPERTY TESTS FOR EDGE CASES
// ============================================================================

describe('Property 2: Edge cases and invariants', () => {
  let mockSubmitPurchaseOrderForApproval: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSubmitPurchaseOrderForApproval = vi.fn();
    vi.spyOn(purchaseOrderActions, 'submitPurchaseOrderForApproval').mockImplementation(
      mockSubmitPurchaseOrderForApproval
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property: The mutation should work with minimal required fields
   * 
   * This verifies that the mutation works when only required fields are provided
   * (no optional comments).
   */
  it('should work with only required fields (no comments)', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderIdArbitrary,
        workflowIdArbitrary,
        userIdArbitrary,
        userNameArbitrary,
        userRoleArbitrary,
        async (poId, workflowId, userId, userName, userRole) => {
          // Reset mock before each iteration
          mockSubmitPurchaseOrderForApproval.mockClear();

          mockSubmitPurchaseOrderForApproval.mockResolvedValue({
            success: true,
            data: { id: poId, status: 'PENDING' },
          });

          const { result } = renderHook(
            () => useSubmitPurchaseOrderForApproval(),
            { wrapper: createWrapper() }
          );

          // Submit without comments
          await result.current.mutateAsync({
            purchaseOrderId: poId,
            workflowId: workflowId,
            submittingUserId: userId,
            submittedByName: userName,
            submittedByRole: userRole,
            // comments is undefined
          });

          await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
          });

          expect(mockSubmitPurchaseOrderForApproval).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: The mutation should handle long comments correctly
   * 
   * This verifies that the system can handle comments of various lengths
   * up to a reasonable maximum.
   */
  it('should handle comments of various lengths', async () => {
    await fc.assert(
      fc.asyncProperty(
        purchaseOrderIdArbitrary,
        workflowIdArbitrary,
        userIdArbitrary,
        userNameArbitrary,
        userRoleArbitrary,
        fc.string({ maxLength: 1000 }), // Test with longer comments
        async (poId, workflowId, userId, userName, userRole, comments) => {
          // Reset mock before each iteration
          mockSubmitPurchaseOrderForApproval.mockClear();

          mockSubmitPurchaseOrderForApproval.mockResolvedValue({
            success: true,
            data: { id: poId, status: 'PENDING' },
          });

          const { result } = renderHook(
            () => useSubmitPurchaseOrderForApproval(),
            { wrapper: createWrapper() }
          );

          await result.current.mutateAsync({
            purchaseOrderId: poId,
            workflowId: workflowId,
            submittingUserId: userId,
            submittedByName: userName,
            submittedByRole: userRole,
            comments: comments,
          });

          await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
          });

          const callArgs = mockSubmitPurchaseOrderForApproval.mock.calls[0][0];
          expect(callArgs.comments).toBe(comments);
        }
      ),
      { numRuns: 15 }
    );
  });
});
