import { describe, it, expect } from "vitest";
import {
  calculateTotalAllocated,
  calculateRemainingBudget,
  validateBudgetItem,
  isBudgetFullyAllocated,
  isBudgetOverAllocated,
  isBudgetUnderAllocated,
  getAllocationStatus,
} from "@/lib/budget-validation";
import type { BudgetItem, Budget } from "@/types/budget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBudgetItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "item-1",
    category: "Office",
    description: "Paper",
    allocatedAmount: 1000,
    spentAmount: 0,
    remainingAmount: 1000,
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "budget-1",
    organizationId: "org-1",
    budgetCode: "BC-001",
    ownerId: "user-1",
    ownerName: "Alice",
    department: "Finance",
    departmentId: "dept-1",
    status: "APPROVED",
    fiscalYear: "2026",
    totalBudget: 10000,
    allocatedAmount: 5000,
    remainingAmount: 5000,
    approvalStage: 1,
    approvalHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Q1 Budget",
    description: "First quarter",
    currency: "USD",
    totalAmount: 10000,
    createdBy: "user-1",
    items: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateTotalAllocated
// ---------------------------------------------------------------------------

describe("calculateTotalAllocated", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateTotalAllocated([])).toBe(0);
  });

  it("sums a single item", () => {
    const items = [makeBudgetItem({ allocatedAmount: 500 })];
    expect(calculateTotalAllocated(items)).toBe(500);
  });

  it("sums multiple items", () => {
    const items = [
      makeBudgetItem({ id: "a", allocatedAmount: 300 }),
      makeBudgetItem({ id: "b", allocatedAmount: 700 }),
      makeBudgetItem({ id: "c", allocatedAmount: 200 }),
    ];
    expect(calculateTotalAllocated(items)).toBe(1200);
  });

  it("handles items with zero allocated amounts", () => {
    const items = [
      makeBudgetItem({ id: "a", allocatedAmount: 0 }),
      makeBudgetItem({ id: "b", allocatedAmount: 0 }),
    ];
    expect(calculateTotalAllocated(items)).toBe(0);
  });

  it("handles items with floating-point amounts", () => {
    const items = [
      makeBudgetItem({ id: "a", allocatedAmount: 100.50 }),
      makeBudgetItem({ id: "b", allocatedAmount: 200.75 }),
    ];
    expect(calculateTotalAllocated(items)).toBeCloseTo(301.25);
  });
});

// ---------------------------------------------------------------------------
// calculateRemainingBudget
// ---------------------------------------------------------------------------

describe("calculateRemainingBudget", () => {
  it("returns totalAmount when no items exist", () => {
    expect(calculateRemainingBudget(5000, [])).toBe(5000);
  });

  it("subtracts total allocated from total amount", () => {
    const items = [
      makeBudgetItem({ id: "a", allocatedAmount: 2000 }),
      makeBudgetItem({ id: "b", allocatedAmount: 1000 }),
    ];
    expect(calculateRemainingBudget(5000, items)).toBe(2000);
  });

  it("returns negative when over-allocated", () => {
    const items = [makeBudgetItem({ allocatedAmount: 6000 })];
    expect(calculateRemainingBudget(5000, items)).toBe(-1000);
  });

  it("returns 0 when exactly fully allocated", () => {
    const items = [makeBudgetItem({ allocatedAmount: 5000 })];
    expect(calculateRemainingBudget(5000, items)).toBe(0);
  });

  it("handles zero total budget", () => {
    const items = [makeBudgetItem({ allocatedAmount: 0 })];
    expect(calculateRemainingBudget(0, items)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateBudgetItem
// ---------------------------------------------------------------------------

describe("validateBudgetItem", () => {
  const existingItems = [
    makeBudgetItem({ id: "existing-1", allocatedAmount: 3000 }),
  ];
  const totalBudget = 10000;

  it("passes for a valid new item within budget", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 2000 },
      existingItems,
      totalBudget
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("fails when allocatedAmount is zero", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 0 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/greater than 0/i);
  });

  it("fails when allocatedAmount is negative", () => {
    const result = validateBudgetItem(
      { allocatedAmount: -100 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/greater than 0/i);
  });

  it("fails when spentAmount is negative", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 500, spentAmount: -1 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot be negative/i);
  });

  it("fails when spentAmount exceeds allocatedAmount", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 500, spentAmount: 600 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot exceed allocated amount/i);
  });

  it("passes when spentAmount equals allocatedAmount", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 500, spentAmount: 500 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(true);
  });

  it("passes when spentAmount is zero", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 500, spentAmount: 0 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(true);
  });

  it("fails when new item would exceed budget", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 8000 }, // 3000 existing + 8000 = 11000 > 10000
      existingItems,
      totalBudget
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceed/i);
  });

  it("passes at exact budget boundary", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 7000 }, // 3000 existing + 7000 = 10000
      existingItems,
      totalBudget
    );
    expect(result.valid).toBe(true);
  });

  it("excludes the edited item when excludeItemId is provided", () => {
    // existing-1 has 3000; we are editing it to 9000 — without exclude it would be 3000+9000=12000 > 10000
    const result = validateBudgetItem(
      { allocatedAmount: 9000 },
      existingItems,
      totalBudget,
      "existing-1" // exclude from sum
    );
    // 0 (other items) + 9000 = 9000 <= 10000 → valid
    expect(result.valid).toBe(true);
  });

  it("includes error message with currency-formatted excess when budget exceeded", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 9000 }, // 3000 + 9000 = 12000; excess = 2000
      existingItems,
      totalBudget
    );
    expect(result.valid).toBe(false);
    // The error message uses toLocaleString with currency style — just assert the excess amount appears
    expect(result.error).toContain("2");
  });

  it("handles empty currentItems array", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 500 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(true);
  });

  it("fails when allocated exceeds budget with no existing items", () => {
    const result = validateBudgetItem(
      { allocatedAmount: 15000 },
      [],
      totalBudget
    );
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBudgetFullyAllocated
// ---------------------------------------------------------------------------

describe("isBudgetFullyAllocated", () => {
  it("returns true when allocatedAmount equals totalBudget exactly", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10000 });
    expect(isBudgetFullyAllocated(budget)).toBe(true);
  });

  it("returns true within floating-point tolerance (< 0.01 diff)", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 9999.995 });
    expect(isBudgetFullyAllocated(budget)).toBe(true);
  });

  it("returns false when difference is exactly 0.01", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 9999.99 });
    expect(isBudgetFullyAllocated(budget)).toBe(false);
  });

  it("returns false when under-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 5000 });
    expect(isBudgetFullyAllocated(budget)).toBe(false);
  });

  it("returns false when over-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10001 });
    expect(isBudgetFullyAllocated(budget)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBudgetOverAllocated
// ---------------------------------------------------------------------------

describe("isBudgetOverAllocated", () => {
  it("returns true when allocatedAmount exceeds totalBudget", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10001 });
    expect(isBudgetOverAllocated(budget)).toBe(true);
  });

  it("returns false when allocatedAmount equals totalBudget", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10000 });
    expect(isBudgetOverAllocated(budget)).toBe(false);
  });

  it("returns false when under-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 5000 });
    expect(isBudgetOverAllocated(budget)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBudgetUnderAllocated
// ---------------------------------------------------------------------------

describe("isBudgetUnderAllocated", () => {
  it("returns true when allocatedAmount is less than totalBudget", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 5000 });
    expect(isBudgetUnderAllocated(budget)).toBe(true);
  });

  it("returns false when allocatedAmount equals totalBudget", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10000 });
    expect(isBudgetUnderAllocated(budget)).toBe(false);
  });

  it("returns false when over-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10001 });
    expect(isBudgetUnderAllocated(budget)).toBe(false);
  });

  it("returns true when allocatedAmount is zero", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 0 });
    expect(isBudgetUnderAllocated(budget)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAllocationStatus
// ---------------------------------------------------------------------------

describe("getAllocationStatus", () => {
  it("returns 'over' when over-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 11000 });
    expect(getAllocationStatus(budget)).toBe("over");
  });

  it("returns 'full' when fully allocated (exact match)", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10000 });
    expect(getAllocationStatus(budget)).toBe("full");
  });

  it("returns 'full' within floating-point tolerance", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 9999.996 });
    expect(getAllocationStatus(budget)).toBe("full");
  });

  it("returns 'under' when under-allocated", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 5000 });
    expect(getAllocationStatus(budget)).toBe("under");
  });

  it("returns 'under' when allocatedAmount is zero", () => {
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 0 });
    expect(getAllocationStatus(budget)).toBe("under");
  });

  it("'over' takes priority over 'full' boundary — 0.01 over totalBudget", () => {
    // allocatedAmount > totalBudget so over-allocated, not full
    const budget = makeBudget({ totalBudget: 10000, allocatedAmount: 10000.01 });
    expect(getAllocationStatus(budget)).toBe("over");
  });
});
