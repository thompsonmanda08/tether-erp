import { describe, it, expect } from "vitest";
import type {
  Budget,
  BudgetItem,
  BudgetStatus,
  BudgetStats,
  BudgetFilters,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  ApproveBudgetRequest,
  RejectBudgetRequest,
  SubmitBudgetRequest,
} from "@/types/budget";

/**
 * budget.ts has no exported type guard functions.
 * Tests verify discriminant/literal fields and interface structures via
 * TypeScript-compatible runtime objects.
 */

// ---------------------------------------------------------------------------
// BudgetStatus — valid literal values
// ---------------------------------------------------------------------------

describe("BudgetStatus", () => {
  const validStatuses: BudgetStatus[] = [
    "DRAFT",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "CANCELLED",
  ];

  it("accepts all 6 valid BudgetStatus literals", () => {
    expect(validStatuses).toHaveLength(6);
    validStatuses.forEach((s) => expect(typeof s).toBe("string"));
  });
});

// ---------------------------------------------------------------------------
// BudgetItem — structure
// ---------------------------------------------------------------------------

describe("BudgetItem", () => {
  it("requires id, category, description, allocatedAmount, spentAmount, remainingAmount", () => {
    const item: BudgetItem = {
      id: "bi-1",
      category: "Office",
      description: "Stationery",
      allocatedAmount: 1000,
      spentAmount: 200,
      remainingAmount: 800,
    };
    expect(item.id).toBe("bi-1");
    expect(item.allocatedAmount).toBe(1000);
    expect(item.remainingAmount).toBe(800);
  });

  it("createdAt and updatedAt are optional", () => {
    const item: BudgetItem = {
      id: "bi-2",
      category: "Travel",
      description: "Flights",
      allocatedAmount: 5000,
      spentAmount: 0,
      remainingAmount: 5000,
    };
    expect(item.createdAt).toBeUndefined();
    expect(item.updatedAt).toBeUndefined();
  });

  it("accepts Date objects for timestamps", () => {
    const now = new Date();
    const item: BudgetItem = {
      id: "bi-3",
      category: "IT",
      description: "Software",
      allocatedAmount: 2000,
      spentAmount: 500,
      remainingAmount: 1500,
      createdAt: now,
      updatedAt: now,
    };
    expect(item.createdAt).toBe(now);
  });
});

// ---------------------------------------------------------------------------
// Budget — core structure and discriminant type field
// ---------------------------------------------------------------------------

describe("Budget", () => {
  function makeBudget(overrides: Partial<Budget> = {}): Budget {
    return {
      id: "budget-1",
      organizationId: "org-1",
      budgetCode: "BC-001",
      ownerId: "user-1",
      ownerName: "Alice",
      department: "Finance",
      departmentId: "dept-1",
      status: "DRAFT",
      fiscalYear: "2026",
      totalBudget: 100000,
      allocatedAmount: 50000,
      remainingAmount: 50000,
      approvalStage: 1,
      approvalHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Q1 Budget",
      description: "First quarter operations",
      currency: "USD",
      totalAmount: 100000,
      createdBy: "user-1",
      items: [],
      ...overrides,
    };
  }

  it("can be constructed with all required fields", () => {
    const budget = makeBudget();
    expect(budget.id).toBe("budget-1");
    expect(budget.status).toBe("DRAFT");
    expect(budget.totalBudget).toBe(100000);
  });

  it("type field is optional and can serve as a discriminant", () => {
    const budget = makeBudget({ type: "budget" });
    expect(budget.type).toBe("budget");
  });

  it("type field is absent when not provided", () => {
    const budget = makeBudget();
    expect(budget.type).toBeUndefined();
  });

  it("accepts all valid BudgetStatus values", () => {
    const statuses: BudgetStatus[] = [
      "DRAFT", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
    ];
    statuses.forEach((status) => {
      const budget = makeBudget({ status });
      expect(budget.status).toBe(status);
    });
  });

  it("documentNumber is optional", () => {
    const budget = makeBudget({ documentNumber: "BDG-001" });
    expect(budget.documentNumber).toBe("BDG-001");

    const budgetNoDoc = makeBudget();
    expect(budgetNoDoc.documentNumber).toBeUndefined();
  });

  it("currentStage, actionHistory, metadata, createdByUser are optional", () => {
    const budget = makeBudget();
    expect(budget.currentStage).toBeUndefined();
    expect(budget.actionHistory).toBeUndefined();
    expect(budget.metadata).toBeUndefined();
    expect(budget.createdByUser).toBeUndefined();
  });

  it("owner is an optional entity reference", () => {
    const budget = makeBudget({ owner: { id: "user-1", name: "Alice" } });
    expect(budget.owner).toEqual({ id: "user-1", name: "Alice" });

    const budgetNoOwner = makeBudget();
    expect(budgetNoOwner.owner).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BudgetStats — structure
// ---------------------------------------------------------------------------

describe("BudgetStats", () => {
  it("has all expected numeric fields", () => {
    const stats: BudgetStats = {
      total: 10,
      active: 8,
      allocated: 500000,
      remaining: 200000,
      utilizationRate: 71.4,
    };
    expect(stats.utilizationRate).toBe(71.4);
  });
});

// ---------------------------------------------------------------------------
// BudgetFilters — optional fields
// ---------------------------------------------------------------------------

describe("BudgetFilters", () => {
  it("all fields are optional", () => {
    const filters: BudgetFilters = {};
    expect(filters.status).toBeUndefined();
    expect(filters.fiscalYear).toBeUndefined();
    expect(filters.page).toBeUndefined();
  });

  it("accepts status and fiscalYear filters", () => {
    const filters: BudgetFilters = {
      status: "APPROVED",
      fiscalYear: "2026",
      page: 1,
      limit: 20,
    };
    expect(filters.status).toBe("APPROVED");
    expect(filters.fiscalYear).toBe("2026");
  });

  it("accepts alias fields for backward compatibility", () => {
    const filters: BudgetFilters = {
      departmentId: "dept-1",
      searchTerm: "marketing",
    };
    expect(filters.departmentId).toBe("dept-1");
    expect(filters.searchTerm).toBe("marketing");
  });
});

// ---------------------------------------------------------------------------
// CreateBudgetRequest — required and optional fields
// ---------------------------------------------------------------------------

describe("CreateBudgetRequest", () => {
  it("requires name, description, department, departmentId, fiscalYear, totalBudget, allocatedAmount, currency, createdBy", () => {
    const req: CreateBudgetRequest = {
      name: "Q1 Budget",
      description: "First quarter",
      department: "Finance",
      departmentId: "dept-1",
      fiscalYear: "2026",
      totalBudget: 100000,
      allocatedAmount: 0,
      currency: "USD",
      createdBy: "user-1",
    };
    expect(req.name).toBe("Q1 Budget");
    expect(req.budgetCode).toBeUndefined();
    expect(req.items).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// UpdateBudgetRequest — only budgetId required
// ---------------------------------------------------------------------------

describe("UpdateBudgetRequest", () => {
  it("only budgetId is required", () => {
    const req: UpdateBudgetRequest = { budgetId: "budget-1" };
    expect(req.budgetId).toBe("budget-1");
    expect(req.name).toBeUndefined();
    expect(req.totalBudget).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ApproveBudgetRequest — required fields
// ---------------------------------------------------------------------------

describe("ApproveBudgetRequest", () => {
  it("requires budgetId, approvingUserId, approvingUserRole, and signature", () => {
    const req: ApproveBudgetRequest = {
      budgetId: "budget-1",
      approvingUserId: "user-2",
      approvingUserRole: "approver",
      signature: "base64sigdata",
    };
    expect(req.signature).toBe("base64sigdata");
    expect(req.stageNumber).toBeUndefined();
    expect(req.comments).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RejectBudgetRequest — required fields and aliases
// ---------------------------------------------------------------------------

describe("RejectBudgetRequest", () => {
  it("requires budgetId, rejectingUserId, rejectingUserRole, remarks, signature", () => {
    const req: RejectBudgetRequest = {
      budgetId: "budget-1",
      rejectingUserId: "user-2",
      rejectingUserRole: "approver",
      remarks: "Insufficient justification",
      signature: "sig",
    };
    expect(req.remarks).toBe("Insufficient justification");
    expect(req.rejectionReason).toBeUndefined();
    expect(req.comments).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SubmitBudgetRequest — required fields
// ---------------------------------------------------------------------------

describe("SubmitBudgetRequest", () => {
  it("requires budgetId, workflowId, submittedBy, submittedByRole", () => {
    const req: SubmitBudgetRequest = {
      budgetId: "budget-1",
      workflowId: "wf-1",
      submittedBy: "user-1",
      submittedByRole: "requester",
    };
    expect(req.workflowId).toBe("wf-1");
    expect(req.submittingUserId).toBeUndefined();
    expect(req.comments).toBeUndefined();
  });
});
