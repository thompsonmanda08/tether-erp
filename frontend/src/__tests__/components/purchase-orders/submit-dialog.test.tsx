/**
 * Unit Tests for PurchaseOrderSubmitDialog Component
 *
 * These tests verify the validation logic and dialog behavior for the
 * PurchaseOrderSubmitDialog component.
 *
 * **Validates: Requirements 9.7**
 *
 * Test Coverage:
 * - Workflow selection validation
 * - Dialog open/close behavior
 * - Submit button state based on validation
 * - Error message display
 * - Form reset on close
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PurchaseOrderSubmitDialog } from "@/app/(private)/(main)/purchase-orders/_components/purchase-order-submit-dialog";
import { PurchaseOrder } from "@/types/purchase-order";

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Create a mock PurchaseOrder for testing
 */
function createMockPurchaseOrder(
  overrides?: Partial<PurchaseOrder>,
): PurchaseOrder {
  return {
    id: "po-123",
    organizationId: "org-456",
    documentNumber: "PO-2024-001",
    status: "DRAFT",
    vendorId: "vendor-789",
    vendorName: "Test Vendor Inc.",
    department: "IT",
    title: "Office Supplies",
    items: [
      {
        id: "item-1",
        description: "Laptop",
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
      },
    ],
    totalAmount: 1000,
    currency: "USD",
    deliveryDate: new Date("2024-12-31"),
    approvalStage: 0,
    approvalHistory: [],
    actionHistory: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    createdBy: "user-123",
    ...overrides,
  } as PurchaseOrder;
}

// Mock the WorkflowSelector component
vi.mock("@/components/workflows/workflow-selector", () => ({
  WorkflowSelector: ({
    value,
    onChange,
    error,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="workflow-selector">
      <label htmlFor="workflow-select">Select Workflow</label>
      <select
        id="workflow-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? "workflow-error" : undefined}
      >
        <option value="">-- Select a workflow --</option>
        <option value="workflow-1">Standard Approval</option>
        <option value="workflow-2">Fast Track</option>
      </select>
      {error && (
        <span id="workflow-error" role="alert" className="error-message">
          {error}
        </span>
      )}
    </div>
  ),
}));

// Mock the WorkflowRequirementBanner component
vi.mock("@/components/ui/workflow-requirement-banner", () => ({
  WorkflowRequirementBanner: () => null,
}));

// ============================================================================
// UNIT TESTS
// ============================================================================

describe("PurchaseOrderSubmitDialog - Workflow Selection Validation", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockPurchaseOrder: PurchaseOrder;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    mockPurchaseOrder = createMockPurchaseOrder();
    vi.clearAllMocks();
  });

  /**
   * Test: Workflow selection is required before submission
   *
   * Validates that the dialog prevents submission when no workflow is selected.
   *
   * **Validates: Requirement 9.7**
   */
  it("should prevent submission when no workflow is selected", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Find and click the submit button without selecting a workflow
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });

    // Submit button should be disabled when no workflow is selected
    expect(submitButton).toBeDisabled();

    // Verify onSubmit was not called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  /**
   * Test: Workflow selection enables submission
   *
   * Validates that selecting a workflow enables the submit button.
   *
   * **Validates: Requirement 9.7**
   */
  it("should enable submit button when workflow is selected", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Initially disabled (no workflow selected)
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    expect(submitButton).toBeDisabled();

    // Select a workflow
    const workflowSelect = screen.getByLabelText(/select workflow/i);
    await user.selectOptions(workflowSelect, "workflow-1");

    // Should now be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  /**
   * Test: Submission succeeds when workflow is selected
   *
   * Validates that when a workflow is selected, the submission proceeds
   * and calls onSubmit with the correct workflowId.
   *
   * **Validates: Requirement 9.7**
   */
  it("should allow submission when workflow is selected", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Select a workflow
    const workflowSelect = screen.getByLabelText(/select workflow/i);
    await user.selectOptions(workflowSelect, "workflow-1");

    // Submit the form
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    await user.click(submitButton);

    // Verify onSubmit was called with the correct workflowId
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith("workflow-1", "");
    });
  });

  /**
   * Test: Submit button is disabled when PO has no items
   *
   * Validates that the submit button is disabled when the PO has no items,
   * preventing invalid submissions.
   *
   * **Validates: Requirement 9.7 (validation logic)**
   */
  it("should disable submit button when PO has no items", () => {
    const poWithoutItems = createMockPurchaseOrder({ items: [] });

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={poWithoutItems}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test: Submit button is disabled when PO has no vendor
   *
   * Validates that the submit button is disabled when the PO has no vendor,
   * preventing invalid submissions.
   *
   * **Validates: Requirement 9.7 (validation logic)**
   */
  it("should disable submit button when PO has no vendor", () => {
    const poWithoutVendor = createMockPurchaseOrder({
      vendorId: undefined,
      vendorName: undefined,
    });

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={poWithoutVendor}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test: Submit button is enabled when all validations pass
   *
   * Validates that the submit button is enabled when the PO has items,
   * vendor, and a workflow is selected.
   *
   * **Validates: Requirement 9.7 (validation logic)**
   */
  it("should enable submit button when all validations pass", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Initially disabled (no workflow selected)
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    expect(submitButton).toBeDisabled();

    // Select a workflow
    const workflowSelect = screen.getByLabelText(/select workflow/i);
    await user.selectOptions(workflowSelect, "workflow-1");

    // Should now be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

describe("PurchaseOrderSubmitDialog - Dialog Open/Close Behavior", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockPurchaseOrder: PurchaseOrder;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    mockPurchaseOrder = createMockPurchaseOrder();
    vi.clearAllMocks();
  });

  /**
   * Test: Dialog renders when open prop is true
   *
   * Validates that the dialog is visible when the open prop is true.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should render dialog when open is true", () => {
    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/submit purchase order for approval/i),
    ).toBeInTheDocument();
  });

  /**
   * Test: Dialog does not render when open prop is false
   *
   * Validates that the dialog is not visible when the open prop is false.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should not render dialog when open is false", () => {
    render(
      <PurchaseOrderSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test: Cancel button closes the dialog
   *
   * Validates that clicking the cancel button calls onOpenChange with false.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should call onOpenChange with false when cancel button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test: Dialog state resets when closed
   *
   * Validates that when the dialog is closed, the form state (comments,
   * workflow selection, errors) is reset.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should reset form state when dialog is closed", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Select a workflow and add comments
    const workflowSelect = screen.getByLabelText(/select workflow/i);
    await user.selectOptions(workflowSelect, "workflow-1");

    const commentsField = screen.getByPlaceholderText(/add any comments/i);
    await user.type(commentsField, "Test comments");

    // Trigger validation error by selecting empty option
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    await user.selectOptions(workflowSelect, "");
    await user.click(submitButton);

    // Close the dialog
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Reopen the dialog
    rerender(
      <PurchaseOrderSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    rerender(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Verify form is reset
    const reopenedWorkflowSelect = screen.getByLabelText(/select workflow/i);
    const reopenedCommentsField =
      screen.getByPlaceholderText(/add any comments/i);

    expect(reopenedWorkflowSelect).toHaveValue("");
    expect(reopenedCommentsField).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /**
   * Test: Dialog cannot be closed while submitting
   *
   * Validates that the cancel button is disabled and the dialog cannot be
   * closed while a submission is in progress.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should disable cancel button while submitting", () => {
    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  /**
   * Test: Submit button shows loading state while submitting
   *
   * Validates that the submit button is disabled and shows loading text
   * while a submission is in progress.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should show loading state on submit button while submitting", () => {
    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /submitting/i });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test: Comments are included in submission
   *
   * Validates that when comments are provided, they are passed to the
   * onSubmit callback along with the workflowId.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should include comments in submission when provided", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    // Select a workflow
    const workflowSelect = screen.getByLabelText(/select workflow/i);
    await user.selectOptions(workflowSelect, "workflow-1");

    // Add comments
    const commentsField = screen.getByPlaceholderText(/add any comments/i);
    await user.type(commentsField, "Urgent approval needed");

    // Submit
    const submitButton = screen.getByRole("button", {
      name: /submit for approval/i,
    });
    await user.click(submitButton);

    // Verify onSubmit was called with comments
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "workflow-1",
        "Urgent approval needed",
      );
    });
  });

  /**
   * Test: Form fields are disabled while submitting
   *
   * Validates that all form fields (workflow selector, comments) are disabled
   * while a submission is in progress.
   *
   * **Validates: Requirement 9.7 (dialog behavior)**
   */
  it("should disable form fields while submitting", () => {
    render(
      <PurchaseOrderSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        purchaseOrder={mockPurchaseOrder}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    const workflowSelect = screen.getByLabelText(/select workflow/i);
    const commentsField = screen.getByPlaceholderText(/add any comments/i);

    expect(workflowSelect).toBeDisabled();
    expect(commentsField).toBeDisabled();
  });
});
