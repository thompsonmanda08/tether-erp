/**
 * Unit Tests for PaymentVoucherItemsList Component
 *
 * Tests cover item rendering, empty state, amount calculation,
 * currency display, item numbering, GL code, and tax display.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentVoucherItemsList } from "@/app/(private)/(main)/payment-vouchers/_components/payment-voucher-items-list";
import type { PaymentItem } from "@/types/payment-voucher";

// ============================================================================
// HELPERS
// ============================================================================

function makeItem(overrides: Partial<PaymentItem> & { amount: number }): PaymentItem {
  return {
    description: "Default Item",
    glCode: "5000",
    amount: overrides.amount,
    ...overrides,
  };
}

// ============================================================================
// TESTS — Empty State
// ============================================================================

describe("PaymentVoucherItemsList - Empty State", () => {
  it("renders empty-state message when no items", () => {
    render(<PaymentVoucherItemsList items={[]} currency="ZMW" />);

    expect(
      screen.getByText(/no items in this payment voucher/i),
    ).toBeInTheDocument();
  });

  it("does not render table when items array is empty", () => {
    render(<PaymentVoucherItemsList items={[]} currency="ZMW" />);

    expect(screen.queryByText(/^01$/)).not.toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Rendering
// ============================================================================

describe("PaymentVoucherItemsList - Rendering", () => {
  it("renders item descriptions", () => {
    const items = [
      makeItem({ description: "Consulting Fee", amount: 1000 }),
      makeItem({ description: "Transport", amount: 200 }),
    ];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("Consulting Fee")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("renders a dash when description is missing", () => {
    const items = [makeItem({ description: "", amount: 500 })];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders sequential item numbers starting at 01", () => {
    const items = [
      makeItem({ description: "A", amount: 100 }),
      makeItem({ description: "B", amount: 200 }),
      makeItem({ description: "C", amount: 300 }),
    ];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders item count in footer", () => {
    const items = [
      makeItem({ description: "A", amount: 100 }),
      makeItem({ description: "B", amount: 200 }),
    ];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/2 items/i).length).toBeGreaterThan(0);
  });

  it("renders singular 'item' for one item", () => {
    const items = [makeItem({ description: "Solo", amount: 100 })];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/1 item$/i).length).toBeGreaterThan(0);
  });

  it("renders GL code as metadata under description", () => {
    const items = [makeItem({ description: "Office Supplies", glCode: "6100", amount: 300 })];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("6100")).toBeInTheDocument();
  });

  it("renders tax amount info when present", () => {
    const items = [
      makeItem({ description: "Service", amount: 1000, taxAmount: 160 }),
    ];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getByText(/tax/i)).toBeInTheDocument();
  });

  it("does not render tax info when taxAmount is 0", () => {
    const items = [makeItem({ description: "Service", amount: 1000, taxAmount: 0 })];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.queryByText(/tax:/i)).not.toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Totals
// ============================================================================

describe("PaymentVoucherItemsList - Total Calculation", () => {
  it("calculates total from item amounts when providedTotal is absent", () => {
    const items = [
      makeItem({ description: "A", amount: 400 }),
      makeItem({ description: "B", amount: 600 }),
    ];

    // Expected total: 1000.00
    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/1,000\.00/).length).toBeGreaterThan(0);
  });

  it("uses providedTotal when given, overriding calculated total", () => {
    const items = [
      makeItem({ description: "A", amount: 400 }),
      makeItem({ description: "B", amount: 600 }),
    ];

    render(
      <PaymentVoucherItemsList items={items} currency="ZMW" totalAmount={9999} />,
    );

    expect(screen.getAllByText(/9,999\.00/).length).toBeGreaterThan(0);
  });

  it("formats amounts with two decimal places", () => {
    const items = [makeItem({ description: "Exact", amount: 1234.5 })];

    render(<PaymentVoucherItemsList items={items} currency="USD" />);

    expect(screen.getAllByText(/1,234\.50/).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Currency
// ============================================================================

describe("PaymentVoucherItemsList - Currency", () => {
  it("displays the currency code for each item amount", () => {
    const items = [makeItem({ description: "Fee", amount: 500 })];

    render(<PaymentVoucherItemsList items={items} currency="USD" />);

    expect(screen.getAllByText(/USD/).length).toBeGreaterThan(0);
  });

  it("displays ZMW currency correctly", () => {
    const items = [makeItem({ description: "Fee", amount: 500 })];

    render(<PaymentVoucherItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/ZMW/).length).toBeGreaterThan(0);
  });
});
