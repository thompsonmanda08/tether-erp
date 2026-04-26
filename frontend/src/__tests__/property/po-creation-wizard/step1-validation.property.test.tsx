/**
 * Property-Based Tests for Step1PODetails — Required Field Validation Gating
 *
 * **Property 3: Required field validation gates advancement**
 * For any subset of required Step 1 fields (title, department, deliveryDate,
 * currency) that is left empty, clicking "Next" SHALL not advance the wizard
 * to Step 2 and SHALL display a validation error on each empty required field.
 *
 * **Validates: Requirements 1.6, 2.2, 2.3, 2.4, 2.5**
 */

import { describe, it, vi, afterEach, expect } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Step1PODetails } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/step1-po-details";
import type { WizardStep1State } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";
import type { Requisition } from "@/types/requisition";

// ── Stubs ──────────────────────────────────────────────────────────────────

// jsdom doesn't implement scrollIntoView — mock it to prevent Radix UI errors
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Stub out the hooks so the component renders without a real React Query context
vi.mock("@/hooks/use-department-queries", () => ({
  useActiveDepartments: () => ({
    data: [{ id: "dept-1", name: "Finance" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-currencies", () => ({
  useCurrencies: () => ({
    data: [
      { code: "ZMW", name: "Zambian Kwacha" },
      { code: "USD", name: "US Dollar" },
    ],
    isLoading: false,
  }),
}));

const stubRequisition: Requisition = {
  id: "req-1",
  organizationId: "org-1",
  documentNumber: "REQ-001",
  requesterId: "user-1",
  requesterName: "Test User",
  title: "Test Requisition",
  description: "Test description",
  department: "Finance",
  departmentId: "dept-1",
  status: "APPROVED",
  priority: "MEDIUM",
  items: [],
  totalAmount: 5000,
  currency: "ZMW",
  approvalStage: 1,
  approvalHistory: [],
  categoryName: "",
  preferredVendorName: "",
  isEstimate: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  budgetCode: "",
  requestedByName: "Test User",
  requestedByRole: "user",
  requestedBy: "user-1",
  totalApprovalStages: 1,
  requestedDate: new Date(),
  requiredByDate: new Date("2025-12-31"),
  costCenter: "",
  projectCode: "",
  createdBy: "user-1",
  createdByName: "Test User",
  createdByRole: "user",
};

/** A fully valid Step 1 state — all required fields populated */
const validStep1: WizardStep1State = {
  title: "Office Supplies PO",
  description: "Monthly office supplies",
  departmentId: "dept-1",
  department: "Finance",
  priority: "MEDIUM",
  budgetCode: "BUD-001",
  costCenter: "CC-FIN",
  projectCode: "PROJ-001",
  deliveryDate: new Date("2025-12-31"),
  currency: "ZMW",
};

type RequiredField = "title" | "departmentId" | "deliveryDate" | "currency";

const REQUIRED_FIELDS: RequiredField[] = [
  "title",
  "departmentId",
  "deliveryDate",
  "currency",
];

/** Returns a copy of `base` with the given fields cleared */
function clearFields(
  base: WizardStep1State,
  fields: RequiredField[],
): WizardStep1State {
  const copy = { ...base };
  for (const field of fields) {
    if (field === "deliveryDate") {
      (copy as any)[field] = null;
    } else {
      (copy as any)[field] = "";
    }
  }
  return copy;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Property 3: Required field validation gates advancement", () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * For any non-empty subset of required fields left empty, clicking "Next"
   * SHALL NOT call `onNext`.
   *
   * This is the primary property: validation gates advancement.
   *
   * **Validates: Requirements 1.6, 2.2, 2.3, 2.4, 2.5**
   */
  it("should block advancement for any non-empty subset of empty required fields", () => {
    fc.assert(
      fc.property(
        // Generate a non-empty subset of required fields to leave empty
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (emptyFields) => {
          const onNext = vi.fn();
          const onChange = vi.fn();

          const incompleteData = clearFields(
            validStep1,
            emptyFields as RequiredField[],
          );

          const { container } = render(
            <Step1PODetails
              data={incompleteData}
              requisition={stubRequisition}
              onChange={onChange}
              onNext={onNext}
            />,
          );

          // Click the Next button
          const nextButton = container.querySelector(
            "[data-testid='step1-next-button']",
          );
          if (nextButton) fireEvent.click(nextButton);

          // PRIMARY PROPERTY: onNext must NOT have been called
          const notAdvanced = onNext.mock.calls.length === 0;

          cleanup();

          return notAdvanced;
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);

  /**
   * For each individual required field left empty, clicking "Next" SHALL
   * display a validation error on that field.
   *
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
   */
  it("should show a validation error for each empty required field", async () => {
    const { act } = await import("@testing-library/react");

    const errorTestIds: Record<RequiredField, string> = {
      title: "error-title",
      departmentId: "error-departmentId",
      deliveryDate: "error-deliveryDate",
      currency: "error-currency",
    };

    for (const field of REQUIRED_FIELDS) {
      const onNext = vi.fn();
      const onChange = vi.fn();
      const incompleteData = clearFields(validStep1, [field]);

      const { container } = render(
        <Step1PODetails
          data={incompleteData}
          requisition={stubRequisition}
          onChange={onChange}
          onNext={onNext}
        />,
      );

      const nextButton = container.querySelector(
        "[data-testid='step1-next-button']",
      );
      await act(async () => {
        if (nextButton) fireEvent.click(nextButton);
      });

      const errorEl = container.querySelector(
        `[data-testid='${errorTestIds[field]}']`,
      );
      expect(
        errorEl,
        `Expected error for field "${field}" to be shown`,
      ).not.toBeNull();

      cleanup();
    }
  });

  /**
   * When ALL required fields are filled, clicking "Next" SHALL call `onNext`
   * exactly once and SHALL NOT display any validation errors.
   *
   * **Validates: Requirements 1.6**
   */
  it("should call onNext when all required fields are valid", () => {
    const onNext = vi.fn();
    const onChange = vi.fn();

    render(
      <Step1PODetails
        data={validStep1}
        requisition={stubRequisition}
        onChange={onChange}
        onNext={onNext}
      />,
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledTimes(1);
    // No validation error testids should be present
    expect(document.querySelector("[data-testid^='error-']")).toBeNull();
  });
});
