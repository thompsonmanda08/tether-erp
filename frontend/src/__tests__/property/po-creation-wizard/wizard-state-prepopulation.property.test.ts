/**
 * Property-Based Tests for PO Creation Wizard — Requisition Pre-population
 *
 * **Property 4: Wizard pre-populates from requisition**
 * For any Requisition object with non-null title, description, department,
 * currency, and deliveryDate fields, opening the wizard SHALL pre-populate
 * the corresponding Step 1 fields with those values.
 *
 * **Validates: Requirements 2.6**
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { renderHook } from "@testing-library/react";
import { useWizardState } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/use-wizard-state";
import type { Requisition } from "@/types/requisition";

// Arbitrary for a Requisition with all pre-population fields populated
const requisitionArb = fc
  .record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ maxLength: 500 }),
    department: fc.string({ minLength: 1, maxLength: 100 }),
    departmentId: fc.string({ minLength: 1, maxLength: 50 }),
    currency: fc.string({ minLength: 3, maxLength: 3 }),
    requiredByDate: fc.date({
      min: new Date("2020-01-01"),
      max: new Date("2030-12-31"),
    }),
    budgetCode: fc.string({ maxLength: 50 }),
    costCenter: fc.string({ maxLength: 50 }),
    projectCode: fc.string({ maxLength: 50 }),
    priority: fc.constantFrom("LOW", "MEDIUM", "HIGH", "URGENT"),
  })
  .map(
    (fields) =>
      ({
        ...fields,
        // Fill in required Requisition fields with stubs
        organizationId: "org-1",
        documentNumber: "REQ-001",
        requesterId: "user-1",
        requesterName: "Test User",
        status: "approved" as any,
        items: [],
        totalAmount: 1000,
        approvalStage: 1,
        approvalHistory: [],
        categoryName: "",
        preferredVendorName: "",
        isEstimate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        requestedByName: "Test User",
        requestedByRole: "user",
        requestedBy: "user-1",
        totalApprovalStages: 1,
        requestedDate: new Date(),
        createdBy: "user-1",
        createdByName: "Test User",
        createdByRole: "user",
      }) as Requisition,
  );

describe("Property 4: Wizard pre-populates from requisition", () => {
  /**
   * For any Requisition with non-null title, description, department,
   * currency, and requiredByDate, the initial Step 1 state SHALL match
   * those values.
   *
   * **Validates: Requirements 2.6**
   */
  it("should pre-populate Step 1 fields from the source requisition on first render", () => {
    fc.assert(
      fc.property(requisitionArb, (requisition) => {
        const { result } = renderHook(() => useWizardState(requisition));

        const step1 = result.current.wizardState.step1;

        return (
          step1.title === requisition.title &&
          step1.description === requisition.description &&
          step1.department === requisition.department &&
          step1.departmentId === requisition.departmentId &&
          step1.currency === requisition.currency &&
          // Guard for invalid dates (NaN): both sides must be valid or both null
          (requisition.requiredByDate == null ||
          isNaN(new Date(requisition.requiredByDate).getTime())
            ? step1.deliveryDate === null
            : step1.deliveryDate !== null &&
              step1.deliveryDate?.getTime() ===
                new Date(requisition.requiredByDate).getTime())
        );
      }),
      { numRuns: 100 },
    );
  });
});
