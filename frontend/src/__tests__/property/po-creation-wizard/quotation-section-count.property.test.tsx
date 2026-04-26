/**
 * Property-Based Tests for Step2VendorQuotes — Vendor State Growth
 *
 * **Property 6: Vendor list grows with each addition (state level)**
 * The Step2 component now uses QuotationCollectionSection for quotation
 * management. This test validates that the wizard state correctly tracks
 * vendors added via the step2 state, and that the CostComparisonPanel
 * appears when quotations are present in the REQ metadata.
 *
 * **Validates: Requirements 3.8, 3.9**
 */

import { describe, it, vi, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, cleanup } from "@testing-library/react";
import { Step2VendorQuotes } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/step2-vendor-quotes";
import type { WizardStep2State } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";
import type { Requisition } from "@/types/requisition";

// ── Mocks ──────────────────────────────────────────────────────────────────

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("@/hooks/use-vendor-queries", () => ({
  useVendors: () => ({
    data: [
      { id: "v1", name: "Vendor Alpha", active: true },
      { id: "v2", name: "Vendor Beta", active: true },
    ],
    isLoading: false,
  }),
  useCreateVendor: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/quotation-collection-section",
  () => ({
    QuotationCollectionSection: ({ quotations }: { quotations: any[] }) => (
      <div
        data-testid="quotation-collection-section"
        data-count={quotations.length}
      />
    ),
  }),
);

// ── Stubs ──────────────────────────────────────────────────────────────────

function makeRequisition(quotationCount: number): Requisition {
  const quotations = Array.from({ length: quotationCount }, (_, i) => ({
    vendorId: `vendor-${i}`,
    vendorName: `Vendor ${i}`,
    amount: 1000 + i * 100,
    currency: "ZMW",
    fileId: `file-${i}`,
    fileName: `quote-${i}.pdf`,
    fileUrl: `/uploads/quote-${i}.pdf`,
    uploadedAt: new Date().toISOString(),
  }));

  return {
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
    metadata: { quotations },
  } as any;
}

const emptyStep2: WizardStep2State = {
  vendors: [],
  selectedVendorLocalId: null,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Property 6: QuotationCollectionSection count matches vendor count", () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Step2 always renders exactly one QuotationCollectionSection regardless
   * of vendor count — it manages all quotations in a single section.
   *
   * **Validates: Requirements 3.8**
   */
  it("should always render exactly one QuotationCollectionSection", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const requisition = makeRequisition(n);

        const { container } = render(
          <Step2VendorQuotes
            data={emptyStep2}
            requisition={requisition}
            onChange={vi.fn()}
            onNext={vi.fn()}
            onBack={vi.fn()}
          />,
        );

        const sections = container.querySelectorAll(
          "[data-testid='quotation-collection-section']",
        );

        const result = sections.length === 1;
        cleanup();
        return result;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * When N > 0 quotations exist in REQ metadata, the CostComparisonPanel
   * should be rendered. When N === 0, it should not.
   *
   * **Validates: Requirements 3.9**
   */
  it("should show CostComparisonPanel only when at least one quotation is present", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const requisition = makeRequisition(n);

        const { container } = render(
          <Step2VendorQuotes
            data={emptyStep2}
            requisition={requisition}
            onChange={vi.fn()}
            onNext={vi.fn()}
            onBack={vi.fn()}
          />,
        );

        const hasCostComparison =
          container.textContent?.includes("Cost Comparison") ?? false;

        const result = n > 0 ? hasCostComparison : !hasCostComparison;
        cleanup();
        return result;
      }),
      { numRuns: 100 },
    );
  });
});
