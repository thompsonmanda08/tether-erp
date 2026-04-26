import { describe, it, expect } from "vitest";
import type {
  GoodsReceivedNote,
  GRNItem,
  QualityIssue,
  GRNStatus,
  GRNStats,
  CreateGRNRequest,
  UpdateGRNRequest,
  SubmitGRNRequest,
} from "@/types/goods-received-note";

/**
 * goods-received-note.ts has no exported type guard functions.
 * Tests verify discriminant/literal fields and interface structures via
 * TypeScript-compatible runtime objects.
 */

// ---------------------------------------------------------------------------
// GRNStatus — valid literal values
// ---------------------------------------------------------------------------

describe("GRNStatus", () => {
  const validStatuses: GRNStatus[] = [
    "DRAFT",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "PAID",
    "COMPLETED",
    "CANCELLED",
  ];

  it("accepts all 7 valid GRNStatus literals", () => {
    expect(validStatuses).toHaveLength(7);
    validStatuses.forEach((s) => expect(typeof s).toBe("string"));
  });
});

// ---------------------------------------------------------------------------
// GRNItem — structure
// ---------------------------------------------------------------------------

describe("GRNItem", () => {
  it("requires description, quantityOrdered, quantityReceived, variance, and condition", () => {
    const item: GRNItem = {
      description: "Printer paper",
      quantityOrdered: 100,
      quantityReceived: 98,
      variance: -2,
      condition: "good",
    };
    expect(item.condition).toBe("good");
    expect(item.variance).toBe(-2);
  });

  it("id and notes are optional", () => {
    const item: GRNItem = {
      description: "Pen",
      quantityOrdered: 50,
      quantityReceived: 50,
      variance: 0,
      condition: "good",
    };
    expect(item.id).toBeUndefined();
    expect(item.notes).toBeUndefined();
  });

  it("accepts all documented condition values", () => {
    const conditions = ["good", "damaged", "missing"];
    conditions.forEach((c) => {
      const item: GRNItem = {
        description: "Item",
        quantityOrdered: 1,
        quantityReceived: 1,
        variance: 0,
        condition: c,
      };
      expect(item.condition).toBe(c);
    });
  });
});

// ---------------------------------------------------------------------------
// QualityIssue — structure
// ---------------------------------------------------------------------------

describe("QualityIssue", () => {
  it("requires itemDescription, issueType, description, and severity", () => {
    const issue: QualityIssue = {
      itemDescription: "Box",
      issueType: "damaged",
      description: "Corner dented",
      severity: "low",
    };
    expect(issue.issueType).toBe("damaged");
    expect(issue.severity).toBe("low");
  });

  it("id is optional", () => {
    const issue: QualityIssue = {
      itemDescription: "Screen",
      issueType: "quality_issue",
      description: "Scratches",
      severity: "medium",
    };
    expect(issue.id).toBeUndefined();
  });

  it("accepts documented issueType values", () => {
    const types = ["damaged", "missing", "wrong_item", "quality_issue"];
    types.forEach((t) => {
      const issue: QualityIssue = {
        itemDescription: "Item",
        issueType: t,
        description: "Desc",
        severity: "high",
      };
      expect(issue.issueType).toBe(t);
    });
  });
});

// ---------------------------------------------------------------------------
// GoodsReceivedNote — core structure and discriminant type field
// ---------------------------------------------------------------------------

describe("GoodsReceivedNote", () => {
  function makeGRN(overrides: Partial<GoodsReceivedNote> = {}): GoodsReceivedNote {
    return {
      id: "grn-1",
      organizationId: "org-1",
      documentNumber: "GRN-001",
      poDocumentNumber: "PO-001",
      status: "DRAFT",
      receivedDate: new Date(),
      receivedBy: "user-1",
      items: [],
      qualityIssues: [],
      approvalStage: 1,
      approvalHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      budgetCode: "BC-001",
      costCenter: "CC-100",
      projectCode: "P-001",
      createdBy: "user-1",
      ownerId: "user-1",
      warehouseLocation: "Warehouse A",
      notes: "",
      currentStage: 1,
      stageName: "Initial Review",
      approvedBy: "",
      ...overrides,
    };
  }

  it("can be constructed with all required fields", () => {
    const grn = makeGRN();
    expect(grn.id).toBe("grn-1");
    expect(grn.status).toBe("DRAFT");
  });

  it("type field is optional and can serve as a discriminant", () => {
    const grn = makeGRN({ type: "goods_received_note" });
    expect(grn.type).toBe("goods_received_note");
  });

  it("type field is absent when not provided", () => {
    const grn = makeGRN();
    expect(grn.type).toBeUndefined();
  });

  it("accepts all valid inline status values", () => {
    const statuses = [
      "DRAFT",
      "PENDING",
      "CONFIRMED",
      "REJECTED",
      "APPROVED",
      "COMPLETED",
      "CANCELLED",
    ] as const;
    statuses.forEach((status) => {
      const grn = makeGRN({ status });
      expect(grn.status).toBe(status);
    });
  });

  it("automationUsed and autoCreatedPV are optional", () => {
    const grn = makeGRN();
    expect(grn.automationUsed).toBeUndefined();
    expect(grn.autoCreatedPV).toBeUndefined();
  });

  it("linkedPV is optional for payment-first flow", () => {
    const grn = makeGRN({ linkedPV: "PV-001" });
    expect(grn.linkedPV).toBe("PV-001");
  });

  it("metadata and actionHistory are optional", () => {
    const grn = makeGRN();
    expect(grn.metadata).toBeUndefined();
    expect(grn.actionHistory).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GRNStats — structure
// ---------------------------------------------------------------------------

describe("GRNStats", () => {
  it("has all expected numeric fields", () => {
    const stats: GRNStats = {
      total: 50,
      draft: 10,
      pending: 15,
      approved: 20,
      thisMonth: 8,
    };
    expect(stats.total).toBe(50);
    expect(stats.thisMonth).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// CreateGRNRequest — required fields
// ---------------------------------------------------------------------------

describe("CreateGRNRequest", () => {
  it("requires poDocumentNumber, items, receivedBy, warehouseLocation, notes, createdBy", () => {
    const req: CreateGRNRequest = {
      poDocumentNumber: "PO-001",
      items: [],
      receivedBy: "user-1",
      warehouseLocation: "Warehouse A",
      notes: "All good",
      createdBy: "user-1",
    };
    expect(req.poDocumentNumber).toBe("PO-001");
    expect(req.linkedPV).toBeUndefined();
  });

  it("accepts optional linkedPV for payment-first flow", () => {
    const req: CreateGRNRequest = {
      poDocumentNumber: "PO-001",
      items: [],
      receivedBy: "user-1",
      warehouseLocation: "Warehouse B",
      notes: "",
      createdBy: "user-1",
      linkedPV: "PV-002",
    };
    expect(req.linkedPV).toBe("PV-002");
  });
});

// ---------------------------------------------------------------------------
// UpdateGRNRequest — only grnId required
// ---------------------------------------------------------------------------

describe("UpdateGRNRequest", () => {
  it("only grnId is required", () => {
    const req: UpdateGRNRequest = { grnId: "grn-1" };
    expect(req.grnId).toBe("grn-1");
    expect(req.items).toBeUndefined();
    expect(req.qualityIssues).toBeUndefined();
    expect(req.notes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SubmitGRNRequest — required fields
// ---------------------------------------------------------------------------

describe("SubmitGRNRequest", () => {
  it("requires grnId, workflowId, submittedBy, submittedByName, submittedByRole", () => {
    const req: SubmitGRNRequest = {
      grnId: "grn-1",
      workflowId: "wf-1",
      submittedBy: "user-1",
      submittedByName: "Alice",
      submittedByRole: "finance",
    };
    expect(req.workflowId).toBe("wf-1");
    expect(req.comments).toBeUndefined();
  });
});
