/**
 * Property-Based Tests for VendorFormDialog — Required Field Validation
 *
 * **Property 10: VendorFormDialog required field validation**
 * For any submission of VendorFormDialog where at least one of
 * (name, physicalAddress, city, country, taxId, bankName, accountName,
 * accountNumber) is empty, the form SHALL display a validation error on each
 * empty required field and SHALL NOT call the create/update mutation.
 *
 * **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**
 */

import { describe, it, vi, afterEach, beforeAll, expect } from "vitest";
import * as fc from "fast-check";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { VendorFormDialog } from "@/app/(private)/(main)/vendors/_components/vendor-form-sheet";

// ── Environment stubs ──────────────────────────────────────────────────────

// Radix UI Switch uses ResizeObserver — stub it for jsdom
beforeAll(() => {
  if (typeof window !== "undefined" && !window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("@/hooks/use-vendor-queries", () => ({
  useCreateVendor: (_onSuccess?: () => void) => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateVendor: (_onSuccess?: () => void) => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

type RequiredField =
  | "name"
  | "physicalAddress"
  | "city"
  | "country"
  | "taxId"
  | "bankName"
  | "accountName"
  | "accountNumber";

const REQUIRED_FIELDS: RequiredField[] = [
  "name",
  "physicalAddress",
  "city",
  "country",
  "taxId",
  "bankName",
  "accountName",
  "accountNumber",
];

/** Maps each required field to its input element id */
const FIELD_INPUT_ID: Record<RequiredField, string> = {
  name: "name",
  physicalAddress: "physicalAddress",
  city: "city",
  country: "country",
  taxId: "taxId",
  bankName: "bankName",
  accountName: "accountName",
  accountNumber: "accountNumber",
};

/** A fully valid form payload — all required fields populated */
const VALID_VALUES: Record<RequiredField, string> = {
  name: "Acme Supplies Ltd",
  physicalAddress: "123 Cairo Road, Lusaka",
  city: "Lusaka",
  country: "Zambia",
  taxId: "1234567890",
  bankName: "Zanaco",
  accountName: "Acme Supplies Ltd",
  accountNumber: "0012345678",
};

/**
 * Fills all required fields with valid values, then clears the specified
 * subset of fields to simulate missing input.
 * Uses document.body since Dialog renders in a portal.
 */
function fillForm(emptyFields: RequiredField[]): void {
  const emptySet = new Set(emptyFields);

  for (const field of REQUIRED_FIELDS) {
    const inputId = FIELD_INPUT_ID[field];
    const el = document.body.querySelector(`#${inputId}`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!el) continue;

    const value = emptySet.has(field) ? "" : VALID_VALUES[field];
    fireEvent.change(el, { target: { value } });
  }
}

function clickSubmit(): void {
  const submitBtn = document.body.querySelector(
    "button[type='submit']",
  ) as HTMLButtonElement | null;
  if (submitBtn) fireEvent.click(submitBtn);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Property 10: VendorFormDialog required field validation", () => {
  afterEach(() => {
    cleanup();
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
  });

  /**
   * For any non-empty subset of required fields left empty, submitting the
   * form SHALL NOT call the create mutation.
   *
   * **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**
   */
  it("should NOT call create mutation when any required field is empty", () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (emptyFields) => {
          mockCreateMutate.mockClear();

          render(<VendorFormDialog open={true} onOpenChange={vi.fn()} />);

          // Fill form with valid values except for the empty fields
          fillForm(emptyFields as RequiredField[]);
          clickSubmit();

          const mutationNotCalled = mockCreateMutate.mock.calls.length === 0;

          cleanup();

          return mutationNotCalled;
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);

  /**
   * For each individual required field left empty, submitting the form SHALL
   * display a validation error element for that field.
   *
   * **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**
   */
  it("should display a validation error for each empty required field", () => {
    for (const field of REQUIRED_FIELDS) {
      render(<VendorFormDialog open={true} onOpenChange={vi.fn()} />);

      // Fill all fields except the one under test
      fillForm([field]);
      clickSubmit();

      // There should be at least one error message visible in the document
      const errorEls = document.body.querySelectorAll(".text-destructive");
      const hasError = errorEls.length > 0;

      expect(
        hasError,
        `Expected a validation error to be shown when "${field}" is empty`,
      ).toBe(true);

      cleanup();
    }
  });

  /**
   * When ALL required fields are filled, submitting the form SHALL call the
   * create mutation exactly once.
   *
   * **Validates: Requirements 9.1**
   */
  it("should call create mutation when all required fields are provided", () => {
    render(<VendorFormDialog open={true} onOpenChange={vi.fn()} />);

    // Fill all required fields with valid values
    fillForm([]);
    clickSubmit();

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
  });

  /**
   * For any non-empty subset of required fields left empty, submitting the
   * form in edit mode SHALL NOT call the update mutation.
   *
   * **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**
   */
  it("should NOT call update mutation in edit mode when any required field is empty", () => {
    const existingVendor = {
      id: "vendor-1",
      vendorCode: "V-001",
      name: "Existing Vendor",
      physicalAddress: "456 Independence Ave",
      city: "Lusaka",
      country: "Zambia",
      taxId: "9876543210",
      bankName: "First National Bank",
      accountName: "Existing Vendor Ltd",
      accountNumber: "9876543210",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (emptyFields) => {
          mockUpdateMutate.mockClear();

          render(
            <VendorFormDialog
              open={true}
              onOpenChange={vi.fn()}
              vendor={existingVendor}
            />,
          );

          // Clear the specified fields
          fillForm(emptyFields as RequiredField[]);
          clickSubmit();

          const mutationNotCalled = mockUpdateMutate.mock.calls.length === 0;

          cleanup();

          return mutationNotCalled;
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});
