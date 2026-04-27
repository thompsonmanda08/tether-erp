/**
 * Unit Tests for BudgetSubmitDialog Component
 *
 * Tests cover workflow validation, over-budget detection, item requirements,
 * loading state, dialog behaviour, and comment submission.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetSubmitDialog } from "@/app/(private)/(main)/budgets/[id]/_components/budget-submit-dialog";
import type { Budget } from "@/types/budget";

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

// ============================================================================
// FACTORY
// ============================================================================

function createMockBudget(overrides?: Partial<Budget>): Budget {
  return {
    id: "budget-123",
    organizationId: "org-456",
    budgetCode: "BUD-2024-001",
    ownerId: "user-123",
    ownerName: "Jane Smith",
    department: "Engineering",
    departmentId: "dept-eng",
    status: "DRAFT",
    fiscalYear: "2024",
    totalBudget: 100000,
    allocatedAmount: 80000,
    remainingAmount: 20000,
    approvalStage: 0,
    approvalHistory: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    name: "Engineering Budget 2024",
    description: "Annual engineering budget",
    currency: "ZMW",
    totalAmount: 100000,
    createdBy: "user-123",
    items: [
      {
        id: "bi-1",
        category: "Software",
        description: "Licenses",
        allocatedAmount: 50000,
        spentAmount: 0,
        remainingAmount: 50000,
      },
      {
        id: "bi-2",
        category: "Hardware",
        description: "Equipment",
        allocatedAmount: 30000,
        spentAmount: 0,
        remainingAmount: 30000,
      },
    ],
    ...overrides,
  } as Budget;
}

// ============================================================================
// TESTS — Workflow Validation
// ============================================================================

describe("BudgetSubmitDialog - Workflow Validation", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    vi.clearAllMocks();
  });

  it("disables submit when no workflow is selected", () => {
    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
  });

  it("enables submit when a workflow is selected and budget is valid", async () => {
    const user = userEvent.setup();

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /submit for approval/i }),
      ).not.toBeDisabled();
    });
  });

  it("calls onSubmit with workflowId when submitted", async () => {
    const user = userEvent.setup();

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");
    await user.click(
      screen.getByRole("button", { name: /submit for approval/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith("workflow-1", "");
    });
  });
});

// ============================================================================
// TESTS — Business Validation
// ============================================================================

describe("BudgetSubmitDialog - Business Validation", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    vi.clearAllMocks();
  });

  it("disables submit and shows alert when budget has no items", async () => {
    const user = userEvent.setup();
    const emptyBudget = createMockBudget({ items: [] });

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={emptyBudget}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/add at least one budget item before submitting/i),
    ).toBeInTheDocument();
  });

  it("disables submit and shows alert when allocated exceeds total budget", async () => {
    const user = userEvent.setup();
    const overBudget = createMockBudget({
      totalBudget: 10000,
      allocatedAmount: 15000,
      remainingAmount: -5000,
    });

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={overBudget}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/budget items exceed total budget/i),
    ).toBeInTheDocument();
  });

  it("shows ready-to-submit alert when all validations pass", async () => {
    const user = userEvent.setup();

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    await waitFor(() => {
      expect(
        screen.getByText(/budget is ready for submission/i),
      ).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS — Dialog Behaviour
// ============================================================================

describe("BudgetSubmitDialog - Dialog Behaviour", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/submit budget for approval/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <BudgetSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables cancel and submit while submitting", () => {
    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });

  it("disables form fields while submitting", () => {
    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByLabelText(/select workflow/i)).toBeDisabled();
    expect(screen.getByPlaceholderText(/add any comments/i)).toBeDisabled();
  });

  it("includes comments in onSubmit call", async () => {
    const user = userEvent.setup();

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        budget={createMockBudget()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");
    await user.type(
      screen.getByPlaceholderText(/add any comments/i),
      "Please review quickly",
    );
    await user.click(
      screen.getByRole("button", { name: /submit for approval/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "workflow-1",
        "Please review quickly",
      );
    });
  });

  it("displays budget summary in dialog", () => {
    const budget = createMockBudget({
      budgetCode: "BUD-2024-XYZ",
      department: "Marketing",
      fiscalYear: "2024",
    });

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={vi.fn()}
        budget={budget}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText("BUD-2024-XYZ")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("displays utilization percentage", () => {
    const budget = createMockBudget({
      totalBudget: 100000,
      allocatedAmount: 75000,
    });

    render(
      <BudgetSubmitDialog
        open={true}
        onOpenChange={vi.fn()}
        budget={budget}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText("75.0%")).toBeInTheDocument();
  });
});
