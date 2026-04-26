/**
 * Unit Tests for Payment Voucher Type System
 *
 * Tests the PaymentVoucher type, type guards, and type compatibility with WorkflowDocument.
 */

import { describe, it, expect } from "vitest";
import type { PaymentVoucher } from "@/types/payment-voucher";
import { isPaymentVoucher } from "@/types/payment-voucher";
import type { WorkflowDocument } from "@/types/workflow";

describe("PaymentVoucher Type System", () => {
  describe("isPaymentVoucher type guard", () => {
    it("should return true for valid PaymentVoucher", () => {
      const pv: WorkflowDocument = {
        id: "pv-123",
        type: "payment_voucher",
        documentNumber: "PV-2024-001",
        status: "DRAFT",
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isPaymentVoucher(pv)).toBe(true);
    });

    it("should return false for purchase_order document", () => {
      const po: WorkflowDocument = {
        id: "po-123",
        type: "purchase_order",
        documentNumber: "PO-2024-001",
        status: "DRAFT",
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isPaymentVoucher(po)).toBe(false);
    });

    it("should return false for requisition document", () => {
      const req: WorkflowDocument = {
        id: "req-123",
        type: "requisition",
        documentNumber: "REQ-2024-001",
        status: "DRAFT",
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isPaymentVoucher(req)).toBe(false);
    });

    it("should return false for document without type", () => {
      const doc: WorkflowDocument = {
        id: "doc-123",
        documentNumber: "DOC-2024-001",
        status: "DRAFT",
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isPaymentVoucher(doc)).toBe(false);
    });
  });

  describe("PaymentVoucher extends WorkflowDocument", () => {
    it("should have all required WorkflowDocument fields", () => {
      const pv: PaymentVoucher = {
        // WorkflowDocument fields
        id: "pv-123",
        type: "payment_voucher",
        documentNumber: "PV-2024-001",
        status: "DRAFT",
        currentStage: 0,
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},

        // PaymentVoucher-specific fields
        organizationId: "org-123",
        vendorId: "vendor-123",
        vendorName: "Test Vendor",
        invoiceNumber: "INV-001",
        amount: 1000,
        currency: "ZMW",
        paymentMethod: "bank_transfer",
        glCode: "GL-001",
        description: "Test payment",
        approvalStage: 0,
        approvalHistory: [],
        actionHistory: [],
        linkedPO: "po-123",
        procurementFlow: "goods_first",
        bankDetails: {},
        requestedDate: new Date(),
        totalAmount: 1000,
        items: [],
        budgetCode: "BUD-001",
        costCenter: "CC-001",
        projectCode: "PROJ-001",
        taxAmount: 0,
        withholdingTaxAmount: 0,
        paidAmount: 0,
        paidDate: new Date(),
        paymentDueDate: new Date(),
        requestedByName: "Test User",
        title: "Test PV",
        department: "Finance",
        departmentId: "dept-123",
        priority: "MEDIUM",
        submittedAt: new Date(),
        approvedAt: new Date(),
        ownerId: "user-123",
      };

      // Type assertion to ensure it's a valid WorkflowDocument
      const doc: WorkflowDocument = pv;

      expect(doc.id).toBe("pv-123");
      expect(doc.type).toBe("payment_voucher");
      expect(doc.documentNumber).toBe("PV-2024-001");
      expect(doc.status).toBe("DRAFT");
    });

    it("should have type discriminator set to payment_voucher", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
      };

      expect(pv.type).toBe("payment_voucher");
    });
  });

  describe("PaymentVoucher workflow fields", () => {
    it("should have approvalChain field", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        approvalChain: [
          {
            approverId: "user-456",
            approverName: "Manager User",
            status: "APPROVED",
            comments: "Approved",
            approvedAt: new Date(),
            stageNumber: 1,
            stageName: "Manager Approval",
            assignedRole: "manager",
          },
        ],
      };

      expect(pv.approvalChain).toBeDefined();
      expect(pv.approvalChain?.length).toBe(1);
    });

    it("should have actionHistory field", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        actionHistory: [
          {
            id: "action-1",
            action: "CREATE",
            actionType: "CREATE",
            performedBy: "user-123",
            performedByName: "Test User",
            performedByRole: "finance_officer",
            timestamp: new Date(),
            comments: "Created PV",
          },
        ],
      };

      expect(pv.actionHistory).toBeDefined();
      expect(pv.actionHistory?.length).toBe(1);
    });

    it("should have currentStage and totalApprovalStages fields", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        currentStage: 2,
        totalApprovalStages: 3,
      };

      expect(pv.currentStage).toBe(2);
      expect(pv.totalApprovalStages).toBe(3);
    });
  });

  describe("PaymentVoucher procurement flow fields", () => {
    it("should have procurementFlow field for goods-first flow", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        linkedPO: "po-123",
        linkedGRN: "grn-123",
        procurementFlow: "goods_first",
      };

      expect(pv.procurementFlow).toBe("goods_first");
      expect(pv.linkedGRN).toBe("grn-123");
    });

    it("should have procurementFlow field for payment-first flow", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        linkedPO: "po-123",
        linkedGRN: undefined,
        procurementFlow: "payment_first",
      };

      expect(pv.procurementFlow).toBe("payment_first");
      expect(pv.linkedGRN).toBeUndefined();
    });

    it("should have linkedPO field (required)", () => {
      const pv: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        linkedPO: "po-123",
      };

      expect(pv.linkedPO).toBe("po-123");
    });

    it("should have linkedGRN field (optional)", () => {
      const pvWithGRN: Partial<PaymentVoucher> = {
        id: "pv-123",
        type: "payment_voucher",
        linkedGRN: "grn-123",
      };

      const pvWithoutGRN: Partial<PaymentVoucher> = {
        id: "pv-456",
        type: "payment_voucher",
        linkedGRN: undefined,
      };

      expect(pvWithGRN.linkedGRN).toBe("grn-123");
      expect(pvWithoutGRN.linkedGRN).toBeUndefined();
    });
  });

  describe("PaymentVoucher status values", () => {
    it("should accept all valid status values", () => {
      const statuses: Array<PaymentVoucher["status"]> = [
        "DRAFT",
        "IN_REVIEW",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "PAID",
        "COMPLETED",
        "CANCELLED",
      ];

      statuses.forEach((status) => {
        const pv: Partial<PaymentVoucher> = {
          id: "pv-123",
          type: "payment_voucher",
          status,
        };

        expect(pv.status).toBe(status);
      });
    });
  });
});
