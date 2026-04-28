"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Send,
  Download,
  Eye,
  Pencil,
  Undo2,
  ShoppingCart,
  Calendar,
  User,
  Building,
  DollarSign,
  Tag,
  FileText,
  Package,
  CheckSquare,
  GitBranch,
  Activity,
  Receipt,
  Paperclip,
  ImageIcon,
  AlertCircle,
} from "lucide-react";

import { DocumentDetail, ItemsTable } from "@/components/documents/document-detail";
import {
  type ActionButton,
  type BodySection,
  type MetadataField,
} from "@/components/documents/document-detail/types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { DocumentLinks } from "@/components/document-links";

import { useRequisitionDetail } from "@/hooks/use-requisition-detail";
import { usePermissions } from "@/hooks/use-permissions";
import { useVendors } from "@/hooks/use-vendor-queries";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import { updateRequisition } from "@/app/_actions/requisitions";
import { QUERY_KEYS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

import type { Requisition, RequisitionAttachment } from "@/types/requisition";
import type { WorkflowDocument } from "@/types";
import type { Quotation } from "@/types/core";

import {
  ActivityLogContent,
  ApprovalChainContent,
  ApprovalActionContent,
} from "@/app/(private)/(main)/requisitions/_components/approval-history-panel";
import { RequisitionItemsList } from "@/app/(private)/(main)/requisitions/_components/requisition-items-list";
import { CreateRequisitionDialog } from "@/app/(private)/(main)/requisitions/_components/create-requisition-dialog";
import { RequisitionSubmitDialog } from "@/app/(private)/(main)/requisitions/_components/requisition-submit-dialog";
import { QuotationCollectionSection } from "@/app/(private)/(main)/requisitions/_components/quotation-collection-section";
import { POCreationWizard } from "@/app/(private)/(main)/purchase-orders/_components/po-creation-wizard";

const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (m) => m.PDFPreviewDialog,
    ),
  { ssr: false },
);

const AttachmentPreviewDialog = dynamic(
  () =>
    import("@/components/modals/attachment-preview-dialog").then(
      (m) => m.AttachmentPreviewDialog,
    ),
  { ssr: false },
);

interface RequisitionDetailProps {
  requisitionId: string;
  userId: string;
  userRole: string;
  initialRequisition?: Requisition;
}

const fmtDate = (d: Date | string | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export function RequisitionDetailV2({
  requisitionId,
  userId,
  userRole,
  initialRequisition,
}: RequisitionDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editStep, setEditStep] = useState<"details" | "items">("details");
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);

  const { data: vendors = [] } = useVendors({ active: true });
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit-events", "requisition", requisitionId],
    queryFn: async () => {
      const r = await getAuditEvents("requisition", requisitionId);
      return r.success ? ((r.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!requisitionId,
  });

  const detail = useRequisitionDetail({
    requisitionId,
    userId,
    userRole,
    initialRequisition,
  });

  const { hasPermission, isAdmin, isFinance } = usePermissions();

  if (detail.isLoading) return <DocumentLoadingPage />;
  if (!detail.document)
    return (
      <ErrorDisplay
        title="Requisition Not Found"
        message="The requisition you're looking for doesn't exist."
        showBackButton
      />
    );

  const requisition = detail.document;
  const attachments: RequisitionAttachment[] =
    requisition.attachments ||
    (requisition.metadata?.attachments as RequisitionAttachment[]) ||
    [];
  const quotations: Quotation[] =
    (requisition.metadata?.quotations as Quotation[]) || [];

  const canGeneratePO =
    requisition.status?.toUpperCase() === "APPROVED" &&
    (hasPermission("purchase_order", "create") || isAdmin() || isFinance());
  const canEditQuotations =
    ["admin", "finance", "approver"].includes(userRole.toLowerCase()) ||
    requisition.requesterId === userId;

  const handleSubmit = async (workflowId: string, comments?: string) => {
    await detail.handleSubmitForApproval(workflowId, comments, {
      submittedBy: userId,
      submittedByName: requisition.requestedByName || "User",
      submittedByRole: requisition.requestedByRole || userRole,
    });
  };

  const handleSaveQuotations = async (newQuotations: Quotation[]) => {
    await updateRequisition({
      requisitionId: requisition.id,
      quotations: newQuotations,
    });
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID, requisition.id],
    });
  };

  // ── Sidebar metadata ──────────────────────────────────────────
  const metadataFields: MetadataField<Requisition>[] = [
    {
      label: "Title",
      icon: FileText,
      value: (d) => d.title || "—",
    },
    {
      label: "Department",
      icon: Building,
      value: (d) => d.department || "—",
    },
    {
      label: "Requested by",
      icon: User,
      value: (d) => d.requestedByName || d.requesterName || "—",
    },
    {
      label: "Required by",
      icon: Calendar,
      value: (d) => fmtDate(d.requiredByDate),
    },
    {
      label: "Total",
      icon: DollarSign,
      value: (d) => formatCurrency(d.totalAmount, d.currency),
    },
    {
      label: "Priority",
      icon: AlertCircle,
      value: (d) => (d.priority ? d.priority.toString().toUpperCase() : "—"),
    },
    {
      label: "Category",
      icon: Tag,
      value: (d) => d.categoryName || d.otherCategoryText || "—",
    },
    {
      label: "Created",
      icon: Calendar,
      value: (d) => fmtDate(d.createdAt),
    },
  ];

  // ── Action buttons ────────────────────────────────────────────
  const actions: ActionButton<Requisition>[] = [
    {
      id: "submit",
      label: "Submit for Approval",
      icon: Send,
      variant: "primary",
      condition: (_d, ctx) => ctx.permissions.canSubmit,
      onClick: () => detail.setShowSubmitDialog(true),
    },
    {
      id: "generate-po",
      label: "Generate PO",
      icon: ShoppingCart,
      variant: "primary",
      condition: () => canGeneratePO,
      onClick: () => setIsCreatePOOpen(true),
    },
    {
      id: "preview-pdf",
      label: "Preview PDF",
      icon: Eye,
      variant: "outline",
      isLoading: detail.isExporting,
      onClick: () => detail.handlePreviewPDF(),
    },
    {
      id: "export-pdf",
      label: "Export PDF",
      icon: Download,
      variant: "outline",
      isLoading: detail.isExporting,
      onClick: () => detail.handleExportPDF(),
    },
    {
      id: "edit",
      label: "Edit Requisition",
      icon: Pencil,
      variant: "outline",
      condition: (_d, ctx) => ctx.permissions.canEdit,
      onClick: () => {
        setEditStep("details");
        detail.handleEdit();
      },
    },
    {
      id: "withdraw",
      label: "Withdraw",
      icon: Undo2,
      variant: "warning",
      condition: (_d, ctx) => ctx.permissions.canWithdraw,
      onClick: () => detail.setShowWithdrawModal(true),
    },
  ];

  // ── Body sections ─────────────────────────────────────────────
  const sections: BodySection<Requisition>[] = [
    {
      id: "items",
      title: "Items",
      icon: Package,
      render: (d) => <RequisitionItemsList items={d.items || []} currency={d.currency} />,
    },
    {
      id: "quotations",
      title: "Quotations",
      icon: Receipt,
      condition: () => true,
      render: (d) => (
        <QuotationCollectionSection
          quotations={quotations}
          requisitionId={d.id}
          currency={d.currency}
          onSave={handleSaveQuotations}
          canEdit={canEditQuotations}
          vendors={vendors}
        />
      ),
    },
    {
      id: "attachments",
      title: "Attachments",
      icon: Paperclip,
      render: () =>
        attachments.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Paperclip className="h-6 w-6" />
            </EmptyMedia>
            <EmptyContent>
              <h3 className="text-base font-semibold">No attachments</h3>
              <EmptyDescription>
                Supporting files attached to this requisition will appear here.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attachments.map((a) => (
              <button
                type="button"
                key={a.fileId}
                onClick={() => detail.handleAttachmentPreview(a)}
                className="flex items-center gap-3 rounded-md border border-divider bg-content1 p-3 text-left hover:bg-muted/40"
              >
                <ImageIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(a.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
              </button>
            ))}
          </div>
        ),
    },
    {
      id: "linked-docs",
      title: "Linked Documents",
      icon: GitBranch,
      condition: (d) => !!d.linkedPO,
      render: (d) => (
        <DocumentLinks
          currentDocument={d as unknown as WorkflowDocument}
          chain={detail.chain as any}
        />
      ),
    },
    {
      id: "approval-action",
      title: "Approval",
      icon: CheckSquare,
      render: (d) => (
        <ApprovalActionContent
          requisitionId={d.id}
          requisition={d as unknown as WorkflowDocument}
          workflowStatus={detail.approvalData?.workflowStatus}
          isLoading={detail.approvalData?.isLoading ?? false}
          onApprovalComplete={detail.handleApprovalComplete}
        />
      ),
    },
    {
      id: "approval-chain",
      title: "Approval Chain",
      icon: GitBranch,
      render: (d) => (
        <ApprovalChainContent
          requisition={d as unknown as WorkflowDocument}
          approvalChain={detail.chain}
          approvalHistory={detail.approvalData?.approvalHistory ?? []}
          workflowStatus={detail.approvalData?.workflowStatus}
          availableApprovers={detail.approvalData?.availableApprovers ?? []}
          isLoading={detail.approvalData?.isLoading ?? false}
        />
      ),
    },
    {
      id: "activity",
      title: "Activity Log",
      icon: Activity,
      render: (d) => (
        <ActivityLogContent
          actionHistory={d.actionHistory}
          auditEvents={auditEvents}
        />
      ),
    },
  ];

  return (
    <>
      <DocumentDetail
        doc={requisition}
        title={requisition.title || "Untitled Requisition"}
        metadataFields={metadataFields}
        actions={actions}
        sections={sections}
        context={{
          userId,
          userRole,
          permissions: detail.permissions,
        }}
      />

      {/* Modals */}
      <RequisitionSubmitDialog
        open={detail.showSubmitDialog}
        onOpenChange={detail.setShowSubmitDialog}
        onSubmit={handleSubmit}
        isSubmitting={detail.submitMutation.isPending}
        requisition={requisition}
      />

      <ConfirmationModal
        open={detail.showWithdrawModal}
        onOpenChange={detail.setShowWithdrawModal}
        onConfirm={detail.handleWithdraw}
        title="Withdraw Requisition"
        description="Are you sure you want to withdraw this requisition? It will return to draft state."
        confirmText="Withdraw"
        type="withdraw"
        isLoading={detail.withdrawMutation?.isPending}
      />

      {detail.previewBlob && (
        <PDFPreviewDialog
          open={detail.previewOpen}
          onOpenChange={detail.setPreviewOpen}
          pdfBlob={detail.previewBlob}
          fileName={`${requisition.documentNumber}.pdf`}
          onDownload={() => detail.handleExportPDF()}
        />
      )}

      <AttachmentPreviewDialog
        open={detail.attachmentPreviewOpen}
        onOpenChange={detail.setAttachmentPreviewOpen}
        attachment={detail.selectedAttachment}
        attachments={attachments}
      />

      <CreateRequisitionDialog
        open={detail.isEditDialogOpen}
        onOpenChange={detail.setIsEditDialogOpen}
        editingRequisition={requisition}
        isEditing
        initialStep={editStep}
        userId={userId}
        onRequisitionCreated={detail.handleDocumentUpdated}
      />

      {isCreatePOOpen && (
        <POCreationWizard
          open={isCreatePOOpen}
          onOpenChange={setIsCreatePOOpen}
          requisition={requisition}
        />
      )}
    </>
  );
}
