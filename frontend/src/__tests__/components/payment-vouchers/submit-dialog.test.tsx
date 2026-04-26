/**
 * Unit Tests for PaymentVoucherSubmitDialog Component
 *
 * Tests cover validation (items, vendor, invoice number, amount),
 * workflow selection, loading state, and comment submission.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentVoucherSubmitDialog } from "@/app/(private)/(main)/payment-vouchers/_components/payment-voucher-submit-dialog";
import type { PaymentVoucher } from "@/types/payment-voucher";

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

function createMockPaymentVoucher(
  overrides?: Partial<PaymentVoucher>,
): PaymentVoucher {
  return {
    id: "pv-123",
    organizationId: "org-456",
    documentNumber: "PV-2024-001",
    type: "payment_voucher",
    status: "DRAFT",
    vendorId: "vendor-789",
    vendorName: "Test Vendor Ltd",
    invoiceNumber: "INV-001",
    amount: 2500,
    totalAmount: 2500,
    currency: "ZMW",
    paymentMethod: "bank_transfer",
    glCode: "5000",
    description: "Payment for services",
    department: "Finance",
    departmentId: "dept-fin",
    title: "Service Payment",
    priority: "medium",
    approvalStage: 0,
    approvalHistory: [],
    actionHistory: [],
    items: [
      {
        description: "Consulting Fee",
        amount: 2500,
        glCode: "5000",
      },
    ],
    linkedPO: "",
    procurementFlow: "payment_first",
    budgetCode: "BUD-001",
    costCenter: "CC-001",
    projectCode: "PROJ-001",
    taxAmount: 0,
    withholdingTaxAmount: 0,
    paidAmount: 0,
    bankDetails: {},
    requestedByName: "John Doe",
    ownerId: "user-123",
    createdBy: "user-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    requestedDate: new Date("2024-01-01"),
    paidDate: new Date("2024-01-01"),
    paymentDueDate: new Date("2024-12-31"),
    submittedAt: new Date("2024-01-01"),
    approvedAt: new Date("2024-01-01"),
    ...overrides,
  } as PaymentVoucher;
}

// ============================================================================
// TESTS — Validation
// ============================================================================

describe("PaymentVoucherSubmitDialog - Validation", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    vi.clearAllMocks();
  });

  it("disables submit when no workflow is selected", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
  });

  it("enables submit after selecting workflow with valid PV", async () => {
    const user = userEvent.setup();

    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
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

  it("disables submit and shows alert when no items", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher({ items: [] })}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/add at least one item before submitting/i),
    ).toBeInTheDocument();
  });

  it("disables submit and shows alert when no vendor", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher({
          vendorId: "",
          vendorName: "",
        })}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/select a vendor before submitting/i),
    ).toBeInTheDocument();
  });

  it("disables submit and shows alert when no invoice number", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher({ invoiceNumber: "" })}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/provide an invoice number before submitting/i),
    ).toBeInTheDocument();
  });

  it("disables submit and shows alert when amount is zero", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher({ amount: 0, totalAmount: 0 })}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /submit for approval/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/payment amount must be greater than zero/i),
    ).toBeInTheDocument();
  });

  it("shows ready-to-submit alert when all validations pass and workflow selected", async () => {
    const user = userEvent.setup();

    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");

    await waitFor(() => {
      expect(
        screen.getByText(/payment voucher is ready for submission/i),
      ).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS — Dialog Behaviour
// ============================================================================

describe("PaymentVoucherSubmitDialog - Dialog Behaviour", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnOpenChange = vi.fn();
    vi.clearAllMocks();
  });

  it("renders dialog when open is true", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/submit payment voucher for approval/i),
    ).toBeInTheDocument();
  });

  it("does not render dialog when open is false", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables cancel button while submitting", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("shows loading text on submit button while submitting", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });

  it("disables form fields while submitting", () => {
    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />,
    );

    expect(screen.getByLabelText(/select workflow/i)).toBeDisabled();
    expect(screen.getByPlaceholderText(/add any comments/i)).toBeDisabled();
  });

  it("calls onSubmit with workflowId and comments", async () => {
    const user = userEvent.setup();

    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        paymentVoucher={createMockPaymentVoucher()}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/select workflow/i), "workflow-1");
    await user.type(
      screen.getByPlaceholderText(/add any comments/i),
      "Please prioritise",
    );
    await user.click(screen.getByRole("button", { name: /submit for approval/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith("workflow-1", "Please prioritise");
    });
  });

  it("displays PV summary data in the dialog", () => {
    const pv = createMockPaymentVoucher({
      documentNumber: "PV-2024-099",
      vendorName: "ACME Corp",
      invoiceNumber: "INV-9999",
      department: "Procurement",
    });

    render(
      <PaymentVoucherSubmitDialog
        open={true}
        onOpenChange={vi.fn()}
        paymentVoucher={pv}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText("PV-2024-099")).toBeInTheDocument();
    expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    expect(screen.getByText("INV-9999")).toBeInTheDocument();
    expect(screen.getByText("Procurement")).toBeInTheDocument();
  });
});
