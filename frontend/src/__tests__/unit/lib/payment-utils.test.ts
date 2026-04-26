import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePaymentReference } from "@/lib/payment-utils";

/**
 * generatePaymentReference() → string
 *
 * Format: PV-{YYYY}{MM}-{6-char-alphanumeric-uppercase}
 * Example: PV-202603-ABC123
 */

describe("generatePaymentReference", () => {
  it("returns a string", () => {
    expect(typeof generatePaymentReference()).toBe("string");
  });

  it("starts with 'PV-'", () => {
    expect(generatePaymentReference()).toMatch(/^PV-/);
  });

  it("matches the expected format PV-YYYYMM-XXXXXX", () => {
    // Format: PV-<4-digit year><2-digit month>-<6 uppercase alphanumeric chars>
    expect(generatePaymentReference()).toMatch(
      /^PV-\d{4}(0[1-9]|1[0-2])-[0-9A-Z]{6}$/
    );
  });

  it("uses the current year in the reference", () => {
    const year = new Date().getFullYear().toString();
    expect(generatePaymentReference()).toContain(year);
  });

  it("uses the current month (zero-padded) in the reference", () => {
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const ref = generatePaymentReference();
    // The month portion occupies characters 7-8 (after "PV-YYYY")
    const monthPart = ref.slice(7, 9);
    expect(monthPart).toBe(month);
  });

  it("produces 6 uppercase alphanumeric characters in the random segment", () => {
    const ref = generatePaymentReference();
    const randomPart = ref.split("-")[2];
    expect(randomPart).toHaveLength(6);
    expect(randomPart).toMatch(/^[0-9A-Z]{6}$/);
  });

  it("generates unique references on successive calls", () => {
    const refs = new Set(Array.from({ length: 20 }, () => generatePaymentReference()));
    // With 36^6 ≈ 2.1 billion combinations, collisions are astronomically rare
    expect(refs.size).toBeGreaterThan(1);
  });

  describe("with a fixed date (mocked)", () => {
    beforeEach(() => {
      // January 5, 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-05T10:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("embeds year 2026 and month 01 when date is January 2026", () => {
      const ref = generatePaymentReference();
      expect(ref).toMatch(/^PV-202601-/);
    });
  });

  describe("with a fixed date — December (month 12)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-12-15T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("embeds year 2025 and month 12 when date is December 2025", () => {
      const ref = generatePaymentReference();
      expect(ref).toMatch(/^PV-202512-/);
    });
  });
});
