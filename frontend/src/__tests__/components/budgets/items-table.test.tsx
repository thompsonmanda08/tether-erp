/**
 * Unit Tests for BudgetItemsTable Component
 *
 * Tests cover item rendering, total calculations, currency formatting,
 * percentage display, and DRAFT-only action buttons.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetItemsTable } from "@/app/(private)/(main)/budgets/[id]/_components/budget-items-table";
import type { BudgetItem } from "@/types/budget";

// ============================================================================
// FACTORY
// ============================================================================

function makeItem(overrides: Partial<BudgetItem> & { id: string }): BudgetItem {
  return {
    id: overrides.id,
    category: "General",
    description: "Default description",
    allocatedAmount: 10000,
    spentAmount: 0,
    remainingAmount: 10000,
    ...overrides,
  };
}

function createItems(): BudgetItem[] {
  return [
    makeItem({
      id: "bi-1",
      category: "Software",
      description: "License fees",
      allocatedAmount: 50000,
      spentAmount: 20000,
      remainingAmount: 30000,
    }),
    makeItem({
      id: "bi-2",
      category: "Hardware",
      description: "Equipment purchases",
      allocatedAmount: 30000,
      spentAmount: 5000,
      remainingAmount: 25000,
    }),
  ];
}

// ============================================================================
// TESTS — Rendering
// ============================================================================

describe("BudgetItemsTable - Rendering", () => {
  it("renders all item categories", () => {
    render(
      <BudgetItemsTable items={createItems()} currency="USD" />,
    );

    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("renders item descriptions", () => {
    render(
      <BudgetItemsTable items={createItems()} currency="USD" />,
    );

    expect(screen.getByText("License fees")).toBeInTheDocument();
    expect(screen.getByText("Equipment purchases")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(
      <BudgetItemsTable items={createItems()} currency="USD" />,
    );

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Allocated")).toBeInTheDocument();
    expect(screen.getByText("Spent")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("% Used")).toBeInTheDocument();
  });

  it("renders percentage used for each item", () => {
    const items = [
      makeItem({
        id: "bi-1",
        category: "Marketing",
        description: "Ads",
        allocatedAmount: 10000,
        spentAmount: 4000,
        remainingAmount: 6000,
      }),
    ];

    render(<BudgetItemsTable items={items} currency="USD" />);

    // 40% used — appears in both item row and summary section
    expect(screen.getAllByText("40.0%").length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Currency Formatting
// ============================================================================

describe("BudgetItemsTable - Currency Formatting", () => {
  it("formats amounts using the provided currency (USD)", () => {
    const items = [
      makeItem({
        id: "bi-1",
        category: "IT",
        description: "Cloud",
        allocatedAmount: 12000,
        spentAmount: 0,
        remainingAmount: 12000,
      }),
    ];

    render(<BudgetItemsTable items={items} currency="USD" />);

    // "$12,000.00" should appear
    expect(screen.getAllByText(/\$12,000\.00/).length).toBeGreaterThan(0);
  });

  it("formats amounts using ZMW", () => {
    const items = [
      makeItem({
        id: "bi-1",
        category: "IT",
        description: "Cloud",
        allocatedAmount: 12000,
        spentAmount: 0,
        remainingAmount: 12000,
      }),
    ];

    render(<BudgetItemsTable items={items} currency="ZMW" />);

    // Intl.NumberFormat with currency: "ZMW" outputs "ZMW 12,000.00" or similar
    expect(screen.getAllByText(/12,000\.00/).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Totals Row
// ============================================================================

describe("BudgetItemsTable - Totals Row", () => {
  it("renders total allocated in summary section", () => {
    render(<BudgetItemsTable items={createItems()} currency="USD" />);

    expect(screen.getByText(/total allocated/i)).toBeInTheDocument();
    // $80,000.00 = 50000 + 30000
    expect(screen.getByText(/\$80,000\.00/)).toBeInTheDocument();
  });

  it("renders total spent in summary section", () => {
    render(<BudgetItemsTable items={createItems()} currency="USD" />);

    expect(screen.getByText(/total spent/i)).toBeInTheDocument();
    // $25,000.00 = 20000 + 5000 — also appears in Hardware remaining row
    expect(screen.getAllByText(/\$25,000\.00/).length).toBeGreaterThan(0);
  });

  it("renders total remaining in summary section", () => {
    render(<BudgetItemsTable items={createItems()} currency="USD" />);

    expect(screen.getByText(/total remaining/i)).toBeInTheDocument();
    // $55,000.00 = 30000 + 25000
    expect(screen.getByText(/\$55,000\.00/)).toBeInTheDocument();
  });

  it("renders overall usage percentage", () => {
    render(<BudgetItemsTable items={createItems()} currency="USD" />);

    expect(screen.getByText(/overall usage/i)).toBeInTheDocument();
    // (25000 / 80000) * 100 = 31.25 → "31.3%"
    expect(screen.getByText("31.3%")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — DRAFT Actions
// ============================================================================

describe("BudgetItemsTable - DRAFT Actions", () => {
  let mockOnEdit: ReturnType<typeof vi.fn>;
  let mockOnDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnEdit = vi.fn();
    mockOnDelete = vi.fn();
    vi.clearAllMocks();
  });

  it("renders Actions column when status is DRAFT", () => {
    render(
      <BudgetItemsTable
        items={createItems()}
        currency="USD"
        status="DRAFT"
        onEditItem={mockOnEdit}
        onDeleteItem={mockOnDelete}
      />,
    );

    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("does not render Actions column when status is not DRAFT", () => {
    render(
      <BudgetItemsTable
        items={createItems()}
        currency="USD"
        status="APPROVED"
        onEditItem={mockOnEdit}
        onDeleteItem={mockOnDelete}
      />,
    );

    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("does not render Actions column when status is undefined", () => {
    render(
      <BudgetItemsTable
        items={createItems()}
        currency="USD"
        onEditItem={mockOnEdit}
        onDeleteItem={mockOnDelete}
      />,
    );

    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("calls onEditItem with the correct item when edit button clicked", async () => {
    const user = userEvent.setup();
    const items = [
      makeItem({
        id: "bi-edit",
        category: "Software",
        description: "To Edit",
        allocatedAmount: 5000,
        spentAmount: 0,
        remainingAmount: 5000,
      }),
    ];

    render(
      <BudgetItemsTable
        items={items}
        currency="USD"
        status="DRAFT"
        onEditItem={mockOnEdit}
        onDeleteItem={mockOnDelete}
      />,
    );

    // Find the edit button (pencil icon button)
    const buttons = screen.getAllByRole("button");
    const editButton = buttons[0]; // first button is edit
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(items[0]);
  });

  it("calls onDeleteItem with the item id when delete button clicked", async () => {
    const user = userEvent.setup();
    const items = [
      makeItem({
        id: "bi-delete",
        category: "Hardware",
        description: "To Delete",
        allocatedAmount: 1000,
        spentAmount: 0,
        remainingAmount: 1000,
      }),
    ];

    render(
      <BudgetItemsTable
        items={items}
        currency="USD"
        status="DRAFT"
        onEditItem={mockOnEdit}
        onDeleteItem={mockOnDelete}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons[1]; // second button is delete
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("bi-delete");
  });
});
