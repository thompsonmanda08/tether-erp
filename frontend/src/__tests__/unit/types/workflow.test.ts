import { describe, it, expect } from "vitest";
import type {
  WorkflowDocumentType,
  WorkflowDocument,
  WorkflowPermission,
  DocumentApprovalConfig,
  ApprovalStageConfig,
  ApprovalState,
  WorkflowStep,
  Approver,
  ApprovalAction,
  ApprovalLogEntry,
  Attachment,
} from "@/types/workflow";

/**
 * workflow.ts has no exported runtime type guards of its own.
 * It re-exports isPaymentVoucher via payment-voucher.ts (tested separately).
 *
 * Tests here verify:
 *  - WorkflowDocumentType union covers all expected string literals
 *  - WorkflowDocument discriminant field (type) can distinguish documents
 *  - WorkflowPermission union covers all expected string literals
 *  - Interface structural shapes (field presence/optionality)
 */

// ---------------------------------------------------------------------------
// WorkflowDocumentType — all supported literals
// ---------------------------------------------------------------------------

describe("WorkflowDocumentType", () => {
  // All values that must be assignable to WorkflowDocumentType
  const canonicalTypes: WorkflowDocumentType[] = [
    "requisition",
    "budget",
    "purchase_order",
    "payment_voucher",
    "goods_received_note",
  ];

  const legacyTypes: WorkflowDocumentType[] = [
    "GOODS_RECEIVED_NOTE",
    "REQUISITION",
    "BUDGET",
    "PURCHASE_ORDER",
    "PAYMENT_VOUCHER",
  ];

  const aliasTypes: WorkflowDocumentType[] = [
    "grn",
    "GRN",
    "po",
    "PO",
    "pv",
    "PV",
  ];

  it("canonical lowercase types are valid", () => {
    canonicalTypes.forEach((t) => expect(typeof t).toBe("string"));
    expect(canonicalTypes).toHaveLength(5);
  });

  it("legacy UPPERCASE types are valid for backward compatibility", () => {
    legacyTypes.forEach((t) => expect(typeof t).toBe("string"));
    expect(legacyTypes).toHaveLength(5);
  });

  it("short alias types are valid", () => {
    aliasTypes.forEach((t) => expect(typeof t).toBe("string"));
    expect(aliasTypes).toHaveLength(6);
  });

  it("all type variants sum to 16 total", () => {
    const all = [...canonicalTypes, ...legacyTypes, ...aliasTypes];
    expect(all).toHaveLength(16);
  });
});

// ---------------------------------------------------------------------------
// WorkflowDocument — discriminant type field
// ---------------------------------------------------------------------------

describe("WorkflowDocument", () => {
  it("only requires an id field", () => {
    const doc: WorkflowDocument = { id: "doc-1" };
    expect(doc.id).toBe("doc-1");
  });

  it("type field can discriminate between document kinds", () => {
    const requisitionDoc: WorkflowDocument = { id: "req-1", type: "requisition" };
    const poDoc: WorkflowDocument = { id: "po-1", type: "purchase_order" };
    const pvDoc: WorkflowDocument = { id: "pv-1", type: "payment_voucher" };
    const grnDoc: WorkflowDocument = { id: "grn-1", type: "goods_received_note" };
    const budgetDoc: WorkflowDocument = { id: "bud-1", type: "budget" };

    expect(requisitionDoc.type).toBe("requisition");
    expect(poDoc.type).toBe("purchase_order");
    expect(pvDoc.type).toBe("payment_voucher");
    expect(grnDoc.type).toBe("goods_received_note");
    expect(budgetDoc.type).toBe("budget");
  });

  it("type field can be omitted (undefined)", () => {
    const doc: WorkflowDocument = { id: "doc-1" };
    expect(doc.type).toBeUndefined();
  });

  it("all optional fields are absent by default", () => {
    const doc: WorkflowDocument = { id: "doc-1" };
    expect(doc.documentNumber).toBeUndefined();
    expect(doc.status).toBeUndefined();
    expect(doc.currentStage).toBeUndefined();
    expect(doc.createdBy).toBeUndefined();
    expect(doc.createdByUser).toBeUndefined();
    expect(doc.createdAt).toBeUndefined();
    expect(doc.updatedAt).toBeUndefined();
    expect(doc.metadata).toBeUndefined();
  });

  it("accepts full shape with all optional fields populated", () => {
    const now = new Date();
    const doc: WorkflowDocument = {
      id: "doc-1",
      type: "requisition",
      documentNumber: "REQ-001",
      status: "DRAFT",
      currentStage: 1,
      createdBy: "user-1",
      createdAt: now,
      updatedAt: now,
      metadata: { source: "ui" },
    };
    expect(doc.status).toBe("DRAFT");
    expect(doc.metadata).toEqual({ source: "ui" });
  });

  it("legacy alias types are also valid as the type field", () => {
    const grnAlias: WorkflowDocument = { id: "grn-1", type: "GRN" };
    const poAlias: WorkflowDocument = { id: "po-1", type: "PO" };
    const pvAlias: WorkflowDocument = { id: "pv-1", type: "PV" };
    expect(grnAlias.type).toBe("GRN");
    expect(poAlias.type).toBe("PO");
    expect(pvAlias.type).toBe("PV");
  });
});

// ---------------------------------------------------------------------------
// WorkflowPermission — all supported literals
// ---------------------------------------------------------------------------

describe("WorkflowPermission", () => {
  const allPermissions: WorkflowPermission[] = [
    "view_draft",
    "edit_draft",
    "submit_document",
    "approve_document",
    "reject_document",
    "reassign_approver",
    "view_attachments",
    "add_attachments",
    "view_comments",
    "add_comments",
    "view_audit_log",
    "manage_approvers",
    "manage_workflows",
  ];

  it("all 13 workflow permissions are valid string literals", () => {
    expect(allPermissions).toHaveLength(13);
    allPermissions.forEach((p) => expect(typeof p).toBe("string"));
  });
});

// ---------------------------------------------------------------------------
// DocumentApprovalConfig — structure
// ---------------------------------------------------------------------------

describe("DocumentApprovalConfig", () => {
  it("accepts a full configuration object", () => {
    const config: DocumentApprovalConfig = {
      documentType: "requisition",
      approvalStages: [],
      requiredValidations: ["amount_check"],
      allowParallelApproval: false,
      autoAdvanceOnApproval: true,
    };
    expect(config.documentType).toBe("requisition");
    expect(config.allowParallelApproval).toBe(false);
    expect(config.autoAdvanceOnApproval).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ApprovalStageConfig — structure
// ---------------------------------------------------------------------------

describe("ApprovalStageConfig", () => {
  it("accepts a full stage configuration", () => {
    const stage: ApprovalStageConfig = {
      stageNumber: 1,
      stageName: "Finance Review",
      description: "Initial finance check",
      requiredRole: "finance",
      alternativeRoles: ["approver"],
      isRequired: true,
      canBeSkipped: false,
      canBeRejected: true,
      canBeReversed: false,
      requiredValidations: [],
      onApprove: { nextStage: 2, actions: ["notify"] },
      onReject: { returnTo: "DRAFT", actions: ["notify_requester"] },
    };
    expect(stage.stageNumber).toBe(1);
    expect(stage.onApprove.nextStage).toBe(2);
    expect(stage.onReject.returnTo).toBe("DRAFT");
  });

  it("onApprove.nextStage can be 'FINAL'", () => {
    const stage: ApprovalStageConfig = {
      stageNumber: 2,
      stageName: "Final Approval",
      description: "Last stage",
      requiredRole: "admin",
      alternativeRoles: [],
      isRequired: true,
      canBeSkipped: false,
      canBeRejected: true,
      canBeReversed: true,
      requiredValidations: [],
      onApprove: { nextStage: "FINAL", actions: ["complete"] },
      onReject: { returnTo: "REJECTED", actions: [] },
    };
    expect(stage.onApprove.nextStage).toBe("FINAL");
  });

  it("onReject.returnTo can be a stage number", () => {
    const stage: ApprovalStageConfig = {
      stageNumber: 3,
      stageName: "Third Stage",
      description: "",
      requiredRole: "approver",
      alternativeRoles: [],
      isRequired: true,
      canBeSkipped: false,
      canBeRejected: true,
      canBeReversed: false,
      requiredValidations: [],
      onApprove: { nextStage: "FINAL", actions: [] },
      onReject: { returnTo: 1, actions: [] },
    };
    expect(stage.onReject.returnTo).toBe(1);
  });

  it("optional fields are absent by default", () => {
    const stage: ApprovalStageConfig = {
      stageNumber: 1,
      stageName: "Stage",
      description: "",
      requiredRole: "approver",
      alternativeRoles: [],
      isRequired: true,
      canBeSkipped: false,
      canBeRejected: true,
      canBeReversed: false,
      requiredValidations: [],
      onApprove: { nextStage: "FINAL", actions: [] },
      onReject: { returnTo: "DRAFT", actions: [] },
    };
    expect(stage.specificUserId).toBeUndefined();
    expect(stage.specificUserEmail).toBeUndefined();
    expect(stage.timeoutHours).toBeUndefined();
    expect(stage.escalationUserId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ApprovalState — structure
// ---------------------------------------------------------------------------

describe("ApprovalState", () => {
  it("captures workflow state with required fields", () => {
    const state: ApprovalState = {
      documentId: "doc-1",
      documentType: "purchase_order",
      currentStageNumber: 2,
      status: "pending",
      stageHistory: [],
      canApprove: true,
      canReject: true,
      canReassign: false,
    };
    expect(state.canApprove).toBe(true);
    expect(state.currentStageNumber).toBe(2);
  });

  it("nextApprover and previousApprover are optional", () => {
    const state: ApprovalState = {
      documentId: "doc-1",
      documentType: "budget",
      currentStageNumber: 1,
      status: "pending",
      stageHistory: [],
      canApprove: false,
      canReject: false,
      canReassign: false,
    };
    expect(state.nextApprover).toBeUndefined();
    expect(state.previousApprover).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// WorkflowStep — structure and aliases
// ---------------------------------------------------------------------------

describe("WorkflowStep", () => {
  it("requires workflowType, stepOrder, roleName, description, isRequired", () => {
    const step: WorkflowStep = {
      workflowType: "requisition",
      stepOrder: 1,
      roleName: "approver",
      description: "First review",
      isRequired: true,
    };
    expect(step.workflowType).toBe("requisition");
    expect(step.roleName).toBe("approver");
  });

  it("optional alias fields are absent by default", () => {
    const step: WorkflowStep = {
      workflowType: "budget",
      stepOrder: 1,
      roleName: "finance",
      description: "Finance step",
      isRequired: true,
    };
    expect(step.id).toBeUndefined();
    expect(step.name).toBeUndefined();
    expect(step.stageName).toBeUndefined();
    expect(step.order).toBeUndefined();
    expect(step.approverRole).toBeUndefined();
    expect(step.requiredApprovals).toBeUndefined();
    expect(step.canReject).toBeUndefined();
    expect(step.canReassign).toBeUndefined();
    expect(step.permissions).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ApprovalAction — valid literal values
// ---------------------------------------------------------------------------

describe("ApprovalAction", () => {
  const validActions: ApprovalAction[] = [
    "approved",
    "rejected",
    "commented",
    "reassigned",
    "reversed",
  ];

  it("has 5 valid action literals", () => {
    expect(validActions).toHaveLength(5);
    validActions.forEach((a) => expect(typeof a).toBe("string"));
  });
});

// ---------------------------------------------------------------------------
// ApprovalLogEntry — structure
// ---------------------------------------------------------------------------

describe("ApprovalLogEntry", () => {
  it("requires id, documentId, approver, approverId, action, timestamp", () => {
    const entry: ApprovalLogEntry = {
      id: "log-1",
      documentId: "doc-1",
      approver: { id: "user-1" } as any,
      approverId: "user-1",
      action: "approved",
      timestamp: new Date(),
    };
    expect(entry.action).toBe("approved");
    expect(entry.comments).toBeUndefined();
    expect(entry.remarks).toBeUndefined();
    expect(entry.signature).toBeUndefined();
    expect(entry.ipAddress).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Attachment — structure
// ---------------------------------------------------------------------------

describe("Attachment", () => {
  it("requires all core fields", () => {
    const attachment: Attachment = {
      id: "att-1",
      documentId: "doc-1",
      fileName: "contract.pdf",
      fileSize: 20480,
      fileType: "application/pdf",
      uploadedBy: { id: "user-1" } as any,
      uploadedById: "user-1",
      uploadedAt: new Date(),
      storagePath: "/uploads/contract.pdf",
      visibleToRoles: ["approver", "finance"],
    };
    expect(attachment.fileName).toBe("contract.pdf");
    expect(attachment.visibleToRoles).toContain("approver");
  });
});
