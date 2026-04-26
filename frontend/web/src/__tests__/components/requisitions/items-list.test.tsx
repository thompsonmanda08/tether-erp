/**
 * Unit Tests for RequisitionItemsList Component
 *
 * Tests cover item rendering, total calculation, currency display,
 * empty/single-item states, and item numbering.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequisitionItemsList } from "@/app/(private)/(main)/requisitions/_components/requisition-items-list";

// ============================================================================
// HELPERS
// ============================================================================

interface ItemOverride {
  id?: string;
  description?: string;
  itemDescription?: string;
  quantity: number;
  unitPrice?: number;
  estimatedCost?: number;
  amount?: number;
  totalPrice?: number;
  unit?: string;
  category?: string;
  notes?: string;
}

function makeItem(overrides: ItemOverride): ItemOverride {
  return {
    id: "item-default",
    description: "Default Item",
    quantity: 1,
    unitPrice: 100,
    ...overrides,
  };
}

// ============================================================================
// TESTS — Rendering
// ============================================================================

describe("RequisitionItemsList - Rendering", () => {
  it("renders all item descriptions", () => {
    const items = [
      makeItem({ id: "1", description: "Laptop", quantity: 2, unitPrice: 1000 }),
      makeItem({ id: "2", description: "Mouse", quantity: 5, unitPrice: 50 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
  });

  it("falls back to itemDescription when description is absent", () => {
    const items = [
      makeItem({ id: "1", description: undefined, itemDescription: "Keyboard", quantity: 1, unitPrice: 200 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("Keyboard")).toBeInTheDocument();
  });

  it("renders a dash when both description fields are absent", () => {
    const items = [{ quantity: 1, unitPrice: 100 } as any];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the correct item count in the footer", () => {
    const items = [
      makeItem({ id: "1", description: "Item A", quantity: 1, unitPrice: 10 }),
      makeItem({ id: "2", description: "Item B", quantity: 1, unitPrice: 20 }),
      makeItem({ id: "3", description: "Item C", quantity: 1, unitPrice: 30 }),
    ];

    render(<RequisitionItemsList items={items} currency="USD" />);

    expect(screen.getAllByText(/3 items/i).length).toBeGreaterThan(0);
  });

  it("renders singular 'item' for a single item", () => {
    const items = [
      makeItem({ id: "1", description: "One Thing", quantity: 1, unitPrice: 50 }),
    ];

    render(<RequisitionItemsList items={items} currency="USD" />);

    // singular form — "1 item" not "1 items" (renders in mobile + desktop layouts)
    expect(screen.getAllByText(/1 item$/i).length).toBeGreaterThan(0);
  });

  it("displays item number starting at 01", () => {
    const items = [
      makeItem({ id: "1", description: "First", quantity: 1, unitPrice: 10 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("assigns sequential numbers to multiple items", () => {
    const items = [
      makeItem({ id: "1", description: "First", quantity: 1, unitPrice: 10 }),
      makeItem({ id: "2", description: "Second", quantity: 1, unitPrice: 20 }),
      makeItem({ id: "3", description: "Third", quantity: 1, unitPrice: 30 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Currency Display
// ============================================================================

describe("RequisitionItemsList - Currency Display", () => {
  it("displays the provided currency code", () => {
    const items = [
      makeItem({ id: "1", description: "Paper", quantity: 1, unitPrice: 50 }),
    ];

    render(<RequisitionItemsList items={items} currency="USD" />);

    // Currency appears multiple times (unit price, line total, grand total)
    const occurrences = screen.getAllByText(/USD/);
    expect(occurrences.length).toBeGreaterThan(0);
  });

  it("shows ZMW currency correctly", () => {
    const items = [
      makeItem({ id: "1", description: "Chair", quantity: 2, unitPrice: 750 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/ZMW/).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Total Calculation
// ============================================================================

describe("RequisitionItemsList - Total Calculation", () => {
  it("calculates total from quantity * unitPrice", () => {
    const items = [
      makeItem({ id: "1", description: "A", quantity: 3, unitPrice: 100 }),
      makeItem({ id: "2", description: "B", quantity: 2, unitPrice: 200 }),
    ];

    // Total = 300 + 400 = 700
    render(<RequisitionItemsList items={items} currency="ZMW" />);

    // Grand total "700.00" appears in footer
    expect(screen.getAllByText(/700\.00/).length).toBeGreaterThan(0);
  });

  it("uses item.amount when present (overrides quantity*price)", () => {
    const items = [
      {
        id: "1",
        description: "Fixed Amount Item",
        quantity: 1,
        unitPrice: 999, // should be overridden
        amount: 500,
      },
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    // Grand total should be 500.00, not 999.00
    expect(screen.getAllByText(/500\.00/).length).toBeGreaterThan(0);
  });

  it("uses item.totalPrice when amount is absent", () => {
    const items = [
      {
        id: "1",
        description: "Fixed Total",
        quantity: 1,
        unitPrice: 999,
        totalPrice: 750,
      },
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/750\.00/).length).toBeGreaterThan(0);
  });

  it("uses estimatedCost as unitPrice fallback", () => {
    const items = [
      {
        id: "1",
        description: "Estimate Item",
        quantity: 4,
        estimatedCost: 200,
      },
    ];

    // Total = 4 * 200 = 800
    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getAllByText(/800\.00/).length).toBeGreaterThan(0);
  });

  it("shows estimated label when isEstimate is true", () => {
    const items = [
      makeItem({ id: "1", description: "Est", quantity: 1, unitPrice: 10 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" isEstimate={true} />);

    // Renders in both mobile ("Estimated") and desktop ("· Estimated costs") layouts
    expect(screen.getAllByText(/estimated/i).length).toBeGreaterThan(0);
  });

  it("does not show estimated label when isEstimate is false", () => {
    const items = [
      makeItem({ id: "1", description: "Actual", quantity: 1, unitPrice: 10 }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" isEstimate={false} />);

    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Meta (category / notes)
// ============================================================================

describe("RequisitionItemsList - Item Metadata", () => {
  it("renders category when provided", () => {
    const items = [
      makeItem({
        id: "1",
        description: "Desk",
        quantity: 1,
        unitPrice: 300,
        category: "Furniture",
      }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("Furniture")).toBeInTheDocument();
  });

  it("renders notes when provided", () => {
    const items = [
      makeItem({
        id: "1",
        description: "Monitor",
        quantity: 1,
        unitPrice: 600,
        notes: "27-inch",
      }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("27-inch")).toBeInTheDocument();
  });

  it("renders unit alongside quantity", () => {
    const items = [
      makeItem({
        id: "1",
        description: "Boxes",
        quantity: 10,
        unitPrice: 15,
        unit: "pcs",
      }),
    ];

    render(<RequisitionItemsList items={items} currency="ZMW" />);

    expect(screen.getByText("pcs")).toBeInTheDocument();
  });
});
