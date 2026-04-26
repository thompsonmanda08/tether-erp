/**
 * Unit Tests for RequisitionSubmitDialog Component
 *
 * Tests cover workflow selection validation, submit button state,
 * dialog open/close behaviour, loading state, and comment submission.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequisitionSubmitDialog } from "@/app/(private)/(main)/requisitions/_components/requisition-submit-dialog";
import type { Requisition } from "@/types/requisition";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/components/workflows/workflow-selector", () => ({
  WorkflowSelector: ({
    value,
    onChange,
    error,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    onWorkflowSelect?: (w: any) => void;
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
        <span id="workflow-error" role="alert">
          {error}
        </span>
      )}
    </div>
  ),
}));

vi.mock("@/components/ui/workflow-requirement-banner", () => ({
  WorkflowRequirementBanner: () => null,
}));

// ============================================================================
// FACTORY
// ============================================================================

function createMockRequisition(overrides?: Partial<Requisition>): Requisition {
  return {
    id: "req-123",
    organizationId: "org-456",
    documentNumber: "REQ-2024-001",
    status: "DRAFT",
    title: "Office Supplies",
    department: "IT",
    departmentId: "dept-1",
    priority: "medium",
    currency: "ZMW",
    totalAmount: 5000,
    items: [
      {
        id: "item-1",
        description: "Printer Paper",
        quantity: 10,
        unitPrice: 500,
        totalPrice: 5000,
      },
    ],
    approvalStage: 0,
    approvalHistory: [],
    actionHistory: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    createdBy: "user-123",
    ...overrides,
  } as Requisition;
}

// ============================================================================
// TESTS — Workflow Validation
// ============================================================================

describe("RequisitionSubmitDialog - Workflow Validation", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockRequisition: Requisition;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    mockRequisition = createMockRequisition();
    vi.clearAllMocks();
  });

  it("disables submit when no workflow is selected", () => {
    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /submit for approval|auto-approve/i,
    });
    expect(submitButton).toBeDisabled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("enables submit button after selecting a workflow", async () => {
    const user = userEvent.setup();

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /submit for approval|auto-approve/i,
    });
    expect(submitButton).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("calls onSubmit with workflowId when submitted", async () => {
    const user = userEvent.setup();

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    const submitButton = screen.getByRole("button", {
      name: /submit for approval|auto-approve/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith("workflow-1", "");
    });
  });

  it("disables submit when requisition has no items", () => {
    const emptyReq = createMockRequisition({ items: [] });

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={emptyReq}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval|auto-approve/i }),
    ).toBeDisabled();
  });

  it("shows destructive alert when no items", () => {
    const emptyReq = createMockRequisition({ items: [] });

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={emptyReq}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByText(/add at least one item before submitting/i),
    ).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Dialog Open/Close Behaviour
// ============================================================================

describe("RequisitionSubmitDialog - Dialog Open/Close Behaviour", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockRequisition: Requisition;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    mockRequisition = createMockRequisition();
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/submit requisition for approval/i),
    ).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(
      <RequisitionSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables cancel button while submitting", () => {
    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("shows loading text and disables submit button while submitting", () => {
    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });

  it("disables workflow selector and comments while submitting", () => {
    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByLabelText(/select workflow/i)).toBeDisabled();
    expect(screen.getByPlaceholderText(/add any comments/i)).toBeDisabled();
  });

  it("resets form when dialog is closed and reopened", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");
    await user.type(screen.getByPlaceholderText(/add any comments/i), "Test comment");

    // Close
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Reopen
    rerender(
      <RequisitionSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );
    rerender(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={mockRequisition}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByLabelText(/select workflow/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/add any comments/i)).toHaveValue("");
  });
});

// ============================================================================
// TESTS — Comment Submission
// ============================================================================

describe("RequisitionSubmitDialog - Comments", () => {
  it("includes comments in the onSubmit call", async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const mockOnOpenChange = vi.fn();

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        requisition={createMockRequisition()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");
    await user.type(
      screen.getByPlaceholderText(/add any comments/i),
      "Urgent approval needed",
    );
    await user.click(
      screen.getByRole("button", { name: /submit for approval|auto-approve/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "workflow-1",
        "Urgent approval needed",
      );
    });
  });

  it("displays requisition summary in dialog", () => {
    const req = createMockRequisition({
      documentNumber: "REQ-2024-099",
      title: "IT Equipment",
      department: "Engineering",
      totalAmount: 9999,
      currency: "ZMW",
    });

    render(
      <RequisitionSubmitDialog
        open={true}
        onOpenChange={vi.fn()}
        requisition={req}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText("REQ-2024-099")).toBeInTheDocument();
    expect(screen.getByText("IT Equipment")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });
});
