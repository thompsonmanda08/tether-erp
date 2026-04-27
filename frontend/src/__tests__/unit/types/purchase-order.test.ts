import { describe, it, expect } from "vitest";
import { isPurchaseOrder, PurchaseOrder } from "@/types/purchase-order";
import { WorkflowDocument } from "@/types/workflow";

describe("PurchaseOrder Type Guard", () => {
  it("should identify a valid PurchaseOrder", () => {
    const po: WorkflowDocument = {
      id: "po-123",
      type: "purchase_order",
      documentNumber: "PO-001",
      status: "DRAFT",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isPurchaseOrder(po)).toBe(true);
  });

  it("should reject a non-PurchaseOrder WorkflowDocument", () => {
    const requisition: WorkflowDocument = {
      id: "req-123",
      type: "requisition",
      documentNumber: "REQ-001",
      status: "DRAFT",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isPurchaseOrder(requisition)).toBe(false);
  });

  it("should reject a WorkflowDocument without type", () => {
    const doc: WorkflowDocument = {
      id: "doc-123",
      documentNumber: "DOC-001",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isPurchaseOrder(doc)).toBe(false);
  });

  it("should provide type narrowing after guard check", () => {
    const doc: WorkflowDocument = {
      id: "po-123",
      type: "purchase_order",
      documentNumber: "PO-001",
      status: "DRAFT",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isPurchaseOrder(doc)) {
      // TypeScript should now know doc is a PurchaseOrder
      // This would cause a compile error if type narrowing doesn't work
      const _typeCheck: PurchaseOrder = doc;
      expect(doc.type).toBe("purchase_order");
    }
  });
});
