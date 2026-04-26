/**
 * Property-Based Tests for PO Creation Wizard — Variance Computation
 *
 * **Property 7: Variance computation is correct**
 * For any pair of (estimatedCost, quotedAmount) where estimatedCost > 0,
 * the displayed absolute variance SHALL equal `quotedAmount - estimatedCost`
 * and the displayed percentage SHALL equal
 * `((quotedAmount - estimatedCost) / estimatedCost) * 100`.
 *
 * **Validates: Requirements 4.2**
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { computeVariance } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";

describe("Property 7: Variance computation is correct", () => {
  /**
   * For any (estimatedCost > 0, quotedAmount >= 0), the absolute variance
   * SHALL equal `quotedAmount - estimatedCost` and the percentage SHALL equal
   * `((quotedAmount - estimatedCost) / estimatedCost) * 100`.
   *
   * **Validates: Requirements 4.2**
   */
  it("should compute absolute and percentage variance correctly for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, noNaN: true, noDefaultInfinity: true }),
        (estimatedCost, quotedAmount) => {
          const { absolute, percentage } = computeVariance(
            estimatedCost,
            quotedAmount,
          );

          const expectedAbsolute = quotedAmount - estimatedCost;
          const expectedPercentage =
            ((quotedAmount - estimatedCost) / estimatedCost) * 100;

          return (
            absolute === expectedAbsolute && percentage === expectedPercentage
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
