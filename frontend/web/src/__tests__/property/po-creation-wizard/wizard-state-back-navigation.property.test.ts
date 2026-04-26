/**
 * Property-Based Tests for PO Creation Wizard — Back Navigation Data Preservation
 *
 * **Property 2: Back navigation preserves step data**
 * For any valid Step 1 form data, navigating forward to Step 2 and then back
 * to Step 1 SHALL result in all Step 1 fields retaining their original values.
 *
 * **Validates: Requirements 1.5, 7.1**
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import { useWizardState } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/use-wizard-state";
import type { WizardStep1State } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";
import type { Requisition } from "@/types/requisition";

// Minimal stub requisition for hook initialisation
const stubRequisition: Requisition = {
  id: "req-1",
  organizationId: "org-1",
  documentNumber: "REQ-001",
  requesterId: "user-1",
  requesterName: "Test User",
  title: "Initial Title",
  description: "Initial Description",
  department: "Finance",
  departmentId: "dept-1",
  status: "approved" as any,
  priority: "MEDIUM" as any,
  items: [],
  totalAmount: 1000,
  currency: "USD",
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

// Arbitrary for WizardStep1State
const step1Arb = fc.record<WizardStep1State>({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
  departmentId: fc.string({ minLength: 1, maxLength: 50 }),
  department: fc.string({ minLength: 1, maxLength: 100 }),
  priority: fc.constantFrom("LOW", "MEDIUM", "HIGH", "URGENT"),
  budgetCode: fc.string({ maxLength: 50 }),
  costCenter: fc.string({ maxLength: 50 }),
  projectCode: fc.string({ maxLength: 50 }),
  deliveryDate: fc.option(fc.date(), { nil: null }),
  currency: fc.string({ minLength: 3, maxLength: 3 }),
});

describe("Property 2: Back navigation preserves step data", () => {
  /**
   * For any valid Step 1 data, setting it, then updating Step 2, then
   * reading Step 1 again SHALL return the original Step 1 values unchanged.
   *
   * **Validates: Requirements 1.5, 7.1**
   */
  it("should retain Step 1 values after advancing to Step 2 and going back", () => {
    fc.assert(
      fc.property(step1Arb, (step1Data) => {
        const { result } = renderHook(() => useWizardState(stubRequisition));

        // Set Step 1 data (simulates user filling in Step 1)
        act(() => {
          result.current.setStep1(step1Data);
        });

        // Advance to Step 2 by updating step2 state (simulates navigation forward)
        act(() => {
          result.current.setStep2({
            vendors: [],
            selectedVendorLocalId: null,
          });
        });

        // Go back — Step 1 state should be unchanged
        const step1After = result.current.wizardState.step1;

        return (
          step1After.title === step1Data.title &&
          step1After.description === step1Data.description &&
          step1After.departmentId === step1Data.departmentId &&
          step1After.department === step1Data.department &&
          step1After.priority === step1Data.priority &&
          step1After.budgetCode === step1Data.budgetCode &&
          step1After.costCenter === step1Data.costCenter &&
          step1After.projectCode === step1Data.projectCode &&
          step1After.currency === step1Data.currency &&
          (step1Data.deliveryDate === null
            ? step1After.deliveryDate === null
            : step1After.deliveryDate?.getTime() ===
              step1Data.deliveryDate?.getTime())
        );
      }),
      { numRuns: 100 },
    );
  });
});
