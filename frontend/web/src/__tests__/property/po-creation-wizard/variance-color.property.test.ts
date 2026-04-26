/**
 * Property-Based Tests for PO Creation Wizard — Variance Color Rule
 *
 * **Property 8: Variance color rule is deterministic**
 * For any (estimatedCost, quotedAmount) pair, the variance color class SHALL be:
 * - green when `quotedAmount < estimatedCost` (absolute < 0)
 * - amber when `0 ≤ variance% ≤ 10`
 * - red when `variance% > 10`
 *
 * **Validates: Requirements 4.3, 4.4, 4.5**
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import {
  computeVariance,
  varianceColorClass,
} from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard/types";

describe("Property 8: Variance color rule is deterministic", () => {
  /**
   * When quotedAmount < estimatedCost, the color class SHALL contain "green".
   *
   * **Validates: Requirements 4.3**
   */
  it("should return green color class when quotedAmount is below estimatedCost", () => {
    fc.assert(
      fc.property(
        // estimatedCost > 0
        fc.float({ min: 1, noNaN: true, noDefaultInfinity: true }),
        // quotedAmount strictly less than estimatedCost: use a fraction [0, 1) of estimatedCost
        fc.float({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (estimatedCost, fraction) => {
          // quotedAmount is in [0, estimatedCost) so absolute < 0
          const quotedAmount = estimatedCost * fraction;
          // Exclude the edge case where fraction === 1 (quotedAmount === estimatedCost)
          if (quotedAmount >= estimatedCost) return true;

          const { absolute, percentage } = computeVariance(
            estimatedCost,
            quotedAmount,
          );
          const colorClass = varianceColorClass(absolute, percentage);
          return colorClass.includes("green");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * When quotedAmount >= estimatedCost AND variance% is within [0, 10],
   * the color class SHALL contain "amber".
   *
   * **Validates: Requirements 4.4**
   */
  it("should return amber color class when variance is non-negative and within 10%", () => {
    fc.assert(
      fc.property(
        // estimatedCost > 0
        fc.float({ min: 1, noNaN: true, noDefaultInfinity: true }),
        // multiplier in [1.0, 1.1] so variance% is in [0, 10]
        fc.float({
          min: Math.fround(1.0),
          max: Math.fround(1.1),
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (estimatedCost, multiplier) => {
          const quotedAmount = estimatedCost * multiplier;
          const { absolute, percentage } = computeVariance(
            estimatedCost,
            quotedAmount,
          );
          // Guard: absolute must be >= 0 and percentage <= 10
          if (absolute < 0 || percentage > 10) return true;

          const colorClass = varianceColorClass(absolute, percentage);
          return colorClass.includes("amber");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * When variance% exceeds 10%, the color class SHALL contain "red".
   *
   * **Validates: Requirements 4.5**
   */
  it("should return red color class when variance exceeds 10%", () => {
    fc.assert(
      fc.property(
        // estimatedCost > 0
        fc.float({ min: 1, noNaN: true, noDefaultInfinity: true }),
        // multiplier > 1.1 so variance% > 10
        fc.float({
          min: Math.fround(1.11),
          max: Math.fround(10),
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (estimatedCost, multiplier) => {
          const quotedAmount = estimatedCost * multiplier;
          const { absolute, percentage } = computeVariance(
            estimatedCost,
            quotedAmount,
          );
          // Guard: percentage must be > 10
          if (percentage <= 10) return true;

          const colorClass = varianceColorClass(absolute, percentage);
          return colorClass.includes("red");
        },
      ),
      { numRuns: 100 },
    );
  });
});
