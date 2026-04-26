/**
 * Property-Based Tests for PO Creation Wizard — Vendor List Growth
 *
 * **Property 5: Vendor list grows with each addition**
 * For any sequence of N valid vendor additions in Step 2, the wizard SHALL
 * display exactly N vendor entry rows.
 *
 * **Validates: Requirements 3.7, 3.8**
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import { useWizardState } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/use-wizard-state";
import type { WizardVendorEntry } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";
import type { Requisition } from "@/types/requisition";

// ── Stubs ──────────────────────────────────────────────────────────────────

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

// Arbitrary for a single WizardVendorEntry
const vendorEntryArb = (index: number): WizardVendorEntry => ({
  localId: `local-${index}-${Math.random().toString(36).slice(2, 7)}`,
  vendorId: `vendor-${index}`,
  vendorName: `Vendor ${index}`,
  quotations: [],
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Property 5: Vendor list grows with each addition", () => {
  /**
   * For any N vendors added to step2, assert data.vendors.length === N.
   *
   * Tests the state logic directly via useWizardState hook with renderHook.
   * Adds N vendors via setStep2 and asserts the count matches.
   *
   * **Validates: Requirements 3.7, 3.8**
   */
  it("should have exactly N vendors after adding N vendors", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const { result } = renderHook(() => useWizardState(stubRequisition));

        // Build N unique vendor entries
        const vendors: WizardVendorEntry[] = Array.from({ length: n }, (_, i) =>
          vendorEntryArb(i),
        );

        // Set step2 with N vendors
        act(() => {
          result.current.setStep2({
            vendors,
            selectedVendorLocalId: null,
          });
        });

        return result.current.wizardState.step2.vendors.length === n;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Adding vendors one at a time (simulating user interactions) should
   * result in the count incrementing by 1 each time.
   *
   * **Validates: Requirements 3.7, 3.8**
   */
  it("should increment vendor count by 1 with each individual addition", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (n) => {
        const { result } = renderHook(() => useWizardState(stubRequisition));

        // Start with empty vendors
        act(() => {
          result.current.setStep2({
            vendors: [],
            selectedVendorLocalId: null,
          });
        });

        // Add vendors one at a time and verify count after each addition
        let allCountsCorrect = true;

        for (let i = 0; i < n; i++) {
          const newEntry = vendorEntryArb(i);

          act(() => {
            const current = result.current.wizardState.step2;
            result.current.setStep2({
              ...current,
              vendors: [...current.vendors, newEntry],
            });
          });

          const expectedCount = i + 1;
          const actualCount = result.current.wizardState.step2.vendors.length;

          if (actualCount !== expectedCount) {
            allCountsCorrect = false;
            break;
          }
        }

        return allCountsCorrect;
      }),
      { numRuns: 100 },
    );
  });
});
