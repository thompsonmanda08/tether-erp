import { describe, it, expect } from "vitest";
import type {
  Requisition,
  RequisitionItem,
  RequisitionStatus,
  RequisitionPriority,
  RequisitionAttachment,
  RequisitionStats,
  RequisitionChain,
  CreateRequisitionRequest,
  UpdateRequisitionRequest,
  SubmitRequisitionRequest,
} from "@/types/requisition";

/**
 * requisition.ts has no exported type guard functions.
 * Tests verify discriminant/literal fields and interface structures via
 * TypeScript-compatible runtime objects.
 */

// ---------------------------------------------------------------------------
// RequisitionStatus — valid literal values
// ---------------------------------------------------------------------------

describe("RequisitionStatus", () => {
  const validStatuses: RequisitionStatus[] = [
    "DRAFT",
    "PENDING",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "CANCELLED",
  ];

  it("accepts all valid status literals", () => {
    validStatuses.forEach((status) => {
      expect(typeof status).toBe("string");
    });
  });

  it("has 7 valid status values", () => {
    expect(validStatuses).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// RequisitionPriority — valid literal values
// ---------------------------------------------------------------------------

describe("RequisitionPriority", () => {
  const validPriorities: RequisitionPriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  it("accepts all valid priority literals", () => {
    validPriorities.forEach((p) => {
      expect(typeof p).toBe("string");
    });
  });

  it("has 4 valid priority values", () => {
    expect(validPriorities).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// RequisitionItem — structure checks
// ---------------------------------------------------------------------------

describe("RequisitionItem", () => {
  it("requires description, quantity, unitPrice, and amount", () => {
    const item: RequisitionItem = {
      description: "Printer paper",
      quantity: 10,
      unitPrice: 5.0,
      amount: 50.0,
    };
    expect(item.description).toBe("Printer paper");
    expect(item.quantity).toBe(10);
    expect(item.unitPrice).toBe(5.0);
    expect(item.amount).toBe(50.0);
  });

  it("allows optional alias fields", () => {
    const item: RequisitionItem = {
      description: "Pen",
      quantity: 2,
      unitPrice: 1.5,
      amount: 3.0,
      itemDescription: "Pen alias",
      estimatedCost: 3.0,
      totalPrice: 3.0,
      unit: "pcs",
      category: "Stationery",
      notes: "Blue ink",
      itemNumber: 1,
    };
    expect(item.itemDescription).toBe("Pen alias");
    expect(item.estimatedCost).toBe(3.0);
    expect(item.totalPrice).toBe(3.0);
  });

  it("id is optional", () => {
    const itemWithId: RequisitionItem = {
      id: "item-1",
      description: "Desk",
      quantity: 1,
      unitPrice: 200,
      amount: 200,
    };
    const itemWithoutId: RequisitionItem = {
      description: "Chair",
      quantity: 1,
      unitPrice: 100,
      amount: 100,
    };
    expect(itemWithId.id).toBe("item-1");
    expect(itemWithoutId.id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RequisitionAttachment — structure checks
// ---------------------------------------------------------------------------

describe("RequisitionAttachment", () => {
  it("has all required fields", () => {
    const attachment: RequisitionAttachment = {
      fileId: "file-1",
      fileName: "invoice.pdf",
      fileUrl: "https://example.com/invoice.pdf",
      fileSize: 10240,
      mimeType: "application/pdf",
      uploadedAt: "2026-01-01T00:00:00Z",
    };
    expect(attachment.fileId).toBe("file-1");
    expect(attachment.mimeType).toBe("application/pdf");
  });
});

// ---------------------------------------------------------------------------
// Requisition — core structure and discriminant type field
// ---------------------------------------------------------------------------

describe("Requisition", () => {
  function makeRequisition(overrides: Partial<Requisition> = {}): Requisition {
    return {
      id: "req-1",
      organizationId: "org-1",
      documentNumber: "REQ-001",
      requesterId: "user-1",
      requesterName: "Alice",
      title: "Office Supplies",
      description: "Monthly supplies",
      department: "Finance",
      departmentId: "dept-1",
      status: "DRAFT",
      priority: "MEDIUM",
      items: [],
      totalAmount: 500,
      currency: "USD",
      approvalStage: 1,
      approvalHistory: [],
      categoryName: "General",
      preferredVendorName: "",
      isEstimate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      budgetCode: "BC-001",
      requestedByName: "Alice",
      requestedByRole: "requester",
      requestedBy: "user-1",
      totalApprovalStages: 2,
      requestedDate: new Date(),
      requiredByDate: new Date(),
      costCenter: "CC-100",
      projectCode: "P-001",
      createdBy: "user-1",
      createdByName: "Alice",
      createdByRole: "requester",
      ...overrides,
    };
  }

  it("can be constructed with all required fields", () => {
    const req = makeRequisition();
    expect(req.id).toBe("req-1");
    expect(req.status).toBe("DRAFT");
    expect(req.priority).toBe("MEDIUM");
  });

  it("type field is optional and can be used as a discriminant", () => {
    const req = makeRequisition({ type: "requisition" });
    expect(req.type).toBe("requisition");
  });

  it("type field is absent when not provided", () => {
    const req = makeRequisition();
    expect(req.type).toBeUndefined();
  });

  it("accepts all valid statuses", () => {
    const statuses: RequisitionStatus[] = [
      "DRAFT", "PENDING", "SUBMITTED", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
    ];
    statuses.forEach((status) => {
      const req = makeRequisition({ status });
      expect(req.status).toBe(status);
    });
  });

  it("accepts all valid priorities", () => {
    const priorities: RequisitionPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    priorities.forEach((priority) => {
      const req = makeRequisition({ priority });
      expect(req.priority).toBe(priority);
    });
  });

  it("optional fields can be omitted", () => {
    const req = makeRequisition();
    expect(req.categoryId).toBeUndefined();
    expect(req.preferredVendorId).toBeUndefined();
    expect(req.attachments).toBeUndefined();
    expect(req.metadata).toBeUndefined();
    expect(req.currentStage).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RequisitionStats — structure
// ---------------------------------------------------------------------------

describe("RequisitionStats", () => {
  it("has all expected numeric fields", () => {
    const stats: RequisitionStats = {
      total: 100,
      draft: 20,
      pending: 30,
      approved: 40,
      rejected: 5,
      thisMonth: 10,
      totalAmount: 50000,
    };
    expect(stats.total).toBe(100);
    expect(stats.totalAmount).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// RequisitionChain — procurement chain linking
// ---------------------------------------------------------------------------

describe("RequisitionChain", () => {
  it("requires requisitionId and requisitionStatus", () => {
    const chain: RequisitionChain = {
      requisitionId: "req-1",
      requisitionStatus: "APPROVED",
    };
    expect(chain.requisitionId).toBe("req-1");
    expect(chain.requisitionStatus).toBe("APPROVED");
  });

  it("accepts optional downstream document references", () => {
    const chain: RequisitionChain = {
      requisitionId: "req-1",
      requisitionStatus: "APPROVED",
      poId: "po-1",
      poDocumentNumber: "PO-001",
      poStatus: "APPROVED",
      grnId: "grn-1",
      grnDocumentNumber: "GRN-001",
      grnStatus: "CONFIRMED",
      pvId: "pv-1",
      pvDocumentNumber: "PV-001",
      pvStatus: "PAID",
      routingType: "procurement",
    };
    expect(chain.poId).toBe("po-1");
    expect(chain.routingType).toBe("procurement");
  });
});

// ---------------------------------------------------------------------------
// CreateRequisitionRequest — required fields
// ---------------------------------------------------------------------------

describe("CreateRequisitionRequest", () => {
  it("requires core fields", () => {
    const req: CreateRequisitionRequest = {
      title: "Supplies",
      description: "Monthly",
      department: "HR",
      departmentId: "dept-2",
      priority: "LOW",
      items: [],
      totalAmount: 0,
      currency: "USD",
      isEstimate: false,
      requiredByDate: new Date(),
      budgetCode: "BC-001",
      costCenter: "CC-100",
      projectCode: "P-001",
    };
    expect(req.title).toBe("Supplies");
    expect(req.currency).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// UpdateRequisitionRequest — only requisitionId required
// ---------------------------------------------------------------------------

describe("UpdateRequisitionRequest", () => {
  it("only requisitionId is required; all other fields are optional", () => {
    const req: UpdateRequisitionRequest = { requisitionId: "req-1" };
    expect(req.requisitionId).toBe("req-1");
    expect(req.title).toBeUndefined();
    expect(req.items).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SubmitRequisitionRequest — required fields
// ---------------------------------------------------------------------------

describe("SubmitRequisitionRequest", () => {
  it("requires requisitionId, workflowId, submittedBy, submittedByName, submittedByRole", () => {
    const req: SubmitRequisitionRequest = {
      requisitionId: "req-1",
      workflowId: "wf-1",
      submittedBy: "user-1",
      submittedByName: "Alice",
      submittedByRole: "requester",
    };
    expect(req.workflowId).toBe("wf-1");
    expect(req.comments).toBeUndefined();
  });
});
