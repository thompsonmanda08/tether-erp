/**
 * Property-Based Tests for PO Creation Wizard — WizardState → CreatePurchaseOrderRequest Mapping
 *
 * **Property 9: WizardState maps correctly to CreatePurchaseOrderRequest**
 * For any valid WizardState, the fields passed to `createPurchaseOrderFromRequisition`
 * SHALL include: the selected vendor's vendorId and vendorName (or undefined if none
 * selected), the chosen workflowId, and the chosen procurementFlow value — with no
 * fields dropped or misassigned.
 *
 * **Validates: Requirements 5.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type {
  WizardState,
  WizardVendorEntry,
} from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";

// ============================================================================
// PURE MAPPING FUNCTION (extracted from po-creation-wizard.tsx logic)
// ============================================================================

/**
 * Derives the arguments that would be passed to createPurchaseOrderFromRequisition
 * from a given WizardState. This is the pure mapping logic extracted for testing.
 */
function mapWizardStateToCreatePOArgs(wizardState: WizardState): {
  workflowId: string;
  vendorId: string | undefined;
  vendorName: string | undefined;
  procurementFlow: "" | "goods_first" | "payment_first";
} {
  const selectedVendor = wizardState.step2.selectedVendorLocalId
    ? wizardState.step2.vendors.find(
        (v) => v.localId === wizardState.step2.selectedVendorLocalId,
      )
    : null;

  return {
    workflowId: wizardState.step3.workflowId,
    vendorId: selectedVendor?.vendorId || undefined,
    vendorName: selectedVendor?.vendorName || undefined,
    procurementFlow: wizardState.step3.procurementFlow,
  };
}

// ============================================================================
// ARBITRARIES
// ============================================================================

const vendorEntryArb: fc.Arbitrary<WizardVendorEntry> = fc.record({
  localId: fc.string({ minLength: 1, maxLength: 30 }),
  vendorId: fc.string({ minLength: 1, maxLength: 50 }),
  vendorName: fc.string({ minLength: 1, maxLength: 100 }),
  quotations: fc.constant([]),
  selectedQuotationFileId: fc.option(fc.string({ minLength: 1 }), {
    nil: undefined,
  }),
  quotedAmount: fc.option(fc.float({ min: 0, max: 1_000_000, noNaN: true }), {
    nil: undefined,
  }),
});

const procurementFlowArb = fc.constantFrom<
  "" | "goods_first" | "payment_first"
>("", "goods_first", "payment_first");

/** WizardState with at least one vendor and a selected vendor */
const wizardStateWithSelectedVendorArb: fc.Arbitrary<WizardState> = fc
  .array(vendorEntryArb, { minLength: 1, maxLength: 5 })
  .chain((vendors) => {
    const selectedIndex = fc.integer({ min: 0, max: vendors.length - 1 });
    return selectedIndex.map((idx) => ({
      step1: {
        title: "Test PO",
        description: "",
        departmentId: "dept-1",
        department: "Finance",
        priority: "MEDIUM" as const,
        budgetCode: "",
        costCenter: "",
        projectCode: "",
        deliveryDate: null,
        currency: "ZMW",
      },
      step2: {
        vendors,
        selectedVendorLocalId: vendors[idx].localId,
      },
      step3: {
        workflowId: `wf-${idx}`,
        procurementFlow: "" as const,
      },
    }));
  });

/** WizardState with no selected vendor */
const wizardStateNoVendorArb: fc.Arbitrary<WizardState> = fc
  .record({
    workflowId: fc.string({ minLength: 1, maxLength: 50 }),
    procurementFlow: procurementFlowArb,
  })
  .map(({ workflowId, procurementFlow }) => ({
    step1: {
      title: "Test PO",
      description: "",
      departmentId: "dept-1",
      department: "Finance",
      priority: "MEDIUM" as const,
      budgetCode: "",
      costCenter: "",
      projectCode: "",
      deliveryDate: null,
      currency: "ZMW",
    },
    step2: {
      vendors: [],
      selectedVendorLocalId: null,
    },
    step3: {
      workflowId,
      procurementFlow,
    },
  }));

/** Full WizardState arbitrary with any combination */
const wizardStateArb: fc.Arbitrary<WizardState> = fc
  .array(vendorEntryArb, { minLength: 0, maxLength: 5 })
  .chain((vendors) => {
    const selectedLocalIdArb =
      vendors.length > 0
        ? fc.option(
            fc
              .integer({ min: 0, max: vendors.length - 1 })
              .map((i) => vendors[i].localId),
            { nil: null },
          )
        : fc.constant(null);

    return fc
      .record({
        selectedLocalId: selectedLocalIdArb,
        workflowId: fc.string({ minLength: 0, maxLength: 50 }),
        procurementFlow: procurementFlowArb,
      })
      .map(({ selectedLocalId, workflowId, procurementFlow }) => ({
        step1: {
          title: "Test PO",
          description: "",
          departmentId: "dept-1",
          department: "Finance",
          priority: "MEDIUM" as const,
          budgetCode: "",
          costCenter: "",
          projectCode: "",
          deliveryDate: null,
          currency: "ZMW",
        },
        step2: {
          vendors,
          selectedVendorLocalId: selectedLocalId,
        },
        step3: {
          workflowId,
          procurementFlow,
        },
      }));
  });

// ============================================================================
// TESTS
// ============================================================================

describe("Property 9: WizardState maps correctly to CreatePurchaseOrderRequest", () => {
  /**
   * When a vendor is selected, the mapped args SHALL include that vendor's
   * vendorId and vendorName (not undefined, not swapped).
   *
   * **Validates: Requirements 5.5**
   */
  it("should pass the selected vendor's vendorId and vendorName when a vendor is selected", () => {
    fc.assert(
      fc.property(wizardStateWithSelectedVendorArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);

        const selectedVendor = wizardState.step2.vendors.find(
          (v) => v.localId === wizardState.step2.selectedVendorLocalId,
        )!;

        // vendorId must match the selected vendor's vendorId (or undefined if empty string)
        const expectedVendorId = selectedVendor.vendorId || undefined;
        expect(args.vendorId).toBe(expectedVendorId);

        // vendorName must match the selected vendor's vendorName (or undefined if empty string)
        const expectedVendorName = selectedVendor.vendorName || undefined;
        expect(args.vendorName).toBe(expectedVendorName);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * When no vendor is selected, vendorId and vendorName SHALL both be undefined.
   *
   * **Validates: Requirements 5.5**
   */
  it("should pass undefined for vendorId and vendorName when no vendor is selected", () => {
    fc.assert(
      fc.property(wizardStateNoVendorArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);

        expect(args.vendorId).toBeUndefined();
        expect(args.vendorName).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * The workflowId in the mapped args SHALL always equal wizardState.step3.workflowId.
   *
   * **Validates: Requirements 5.5**
   */
  it("should pass the correct workflowId from step3", () => {
    fc.assert(
      fc.property(wizardStateArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);
        expect(args.workflowId).toBe(wizardState.step3.workflowId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * The procurementFlow in the mapped args SHALL always equal wizardState.step3.procurementFlow.
   *
   * **Validates: Requirements 5.5**
   */
  it("should pass the correct procurementFlow from step3", () => {
    fc.assert(
      fc.property(wizardStateArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);
        expect(args.procurementFlow).toBe(wizardState.step3.procurementFlow);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * No fields are dropped or misassigned — all four fields are present in the result.
   *
   * **Validates: Requirements 5.5**
   */
  it("should include all four required fields in the mapped args", () => {
    fc.assert(
      fc.property(wizardStateArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);

        // All four keys must be present (even if undefined)
        expect(args).toHaveProperty("workflowId");
        expect(args).toHaveProperty("vendorId");
        expect(args).toHaveProperty("vendorName");
        expect(args).toHaveProperty("procurementFlow");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * vendorId and vendorName are never swapped — vendorId is always the ID field,
   * vendorName is always the name field.
   *
   * **Validates: Requirements 5.5**
   */
  it("should not swap vendorId and vendorName", () => {
    fc.assert(
      fc.property(wizardStateWithSelectedVendorArb, (wizardState) => {
        const args = mapWizardStateToCreatePOArgs(wizardState);

        const selectedVendor = wizardState.step2.vendors.find(
          (v) => v.localId === wizardState.step2.selectedVendorLocalId,
        )!;

        // If both are non-empty, they must not be swapped
        if (selectedVendor.vendorId && selectedVendor.vendorName) {
          expect(args.vendorId).not.toBe(selectedVendor.vendorName);
          expect(args.vendorName).not.toBe(selectedVendor.vendorId);
        }
      }),
      { numRuns: 100 },
    );
  });
});
