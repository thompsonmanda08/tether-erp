/**
 * Property-Based Tests for WizardStepIndicator — Step State Consistency
 *
 * **Property 1: Step indicator state is consistent with current step**
 * For any current step value (1, 2, or 3), every step before the current step
 * SHALL be marked "Completed", the current step SHALL be marked "Current", and
 * every step after SHALL be marked "Upcoming".
 *
 * **Validates: Requirements 1.2**
 */

import { describe, it, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, cleanup } from "@testing-library/react";
import { WizardStepIndicator } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/wizard-step-indicator";

const STEPS = [
  { label: "PO Details" },
  { label: "Vendor & Quotes" },
  { label: "Review & Confirm" },
];

describe("Property 1: Step indicator state is consistent with current step", () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * For any currentStep in {1, 2, 3}:
   * - Steps before currentStep show "Completed"
   * - The currentStep shows "Current"
   * - Steps after currentStep show "Upcoming"
   *
   * **Validates: Requirements 1.2**
   */
  it("should show correct state labels for every possible currentStep", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }) as fc.Arbitrary<1 | 2 | 3>,
        (currentStep) => {
          const { container } = render(
            <WizardStepIndicator currentStep={currentStep} steps={STEPS} />,
          );

          const completedCount = currentStep - 1;
          const upcomingCount = STEPS.length - currentStep;

          // Query state labels within this render's container only
          const allText = container.textContent ?? "";

          // Count occurrences of each state label
          const countOccurrences = (text: string, label: string) => {
            let count = 0;
            let pos = 0;
            while ((pos = text.indexOf(label, pos)) !== -1) {
              count++;
              pos += label.length;
            }
            return count;
          };

          const currentCount = countOccurrences(allText, "Current");
          const completedFound = countOccurrences(allText, "Completed");
          const upcomingFound = countOccurrences(allText, "Upcoming");

          cleanup();

          return (
            currentCount === 1 &&
            completedFound === completedCount &&
            upcomingFound === upcomingCount
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
