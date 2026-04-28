"use client";

import dynamic from "next/dynamic";
import {
  Send,
  Download,
  Eye,
  Pencil,
  Undo2,
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
  Truck,
  Receipt,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DocumentDetail } from "@/components/documents/document-detail";
import {
  type ActionButton,
  type BodySection,
  type MetadataField,
} from "@/components/documents/document-detail/types";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { DocumentLinks } from "@/components/document-links";

import { usePurchaseOrderDetail } from "@/hooks/use-purchase-order-detail";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { WorkflowDocument } from "@/types";

import {
  ActivityLogContent,
  ApprovalChainContent,
  ApprovalActionContent,
} from "@/app/(private)/(main)/requisitions/_components/approval-history-panel";
import { POItemsTable } from "@/app/(private)/(main)/purchase-orders/[id]/_components/po-items-table";

const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (m) => m.PDFPreviewDialog,
    ),
  { ssr: false },
);

interface PODetailProps {
  purchaseOrderId: string;
  userId: string;
  userRole: string;
  initialPurchaseOrder?: PurchaseOrder;
}

const fmtDate = (d: Date | string | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export function PurchaseOrderDetailV2({
  purchaseOrderId,
  userId,
  userRole,
  initialPurchaseOrder,
}: PODetailProps) {
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit-events", "purchase_order", purchaseOrderId],
    queryFn: async () => {
      const r = await getAuditEvents("purchase_order", purchaseOrderId);
      return r.success ? ((r.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!purchaseOrderId,
  });

  const detail = usePurchaseOrderDetail({
    poId: purchaseOrderId,
    userId,
    userRole,
    initialPurchaseOrder,
  });

  if (detail.isLoading) return <DocumentLoadingPage />;
  if (!detail.document)
    return (
      <ErrorDisplay
        title="Purchase Order Not Found"
        message="The purchase order you're looking for doesn't exist."
        showBackButton
      />
    );

  const po = detail.document;

  const metadataFields: MetadataField<PurchaseOrder>[] = [
    { label: "Title", icon: FileText, value: (d) => (d as any).title || "—" },
    {
      label: "Vendor",
      icon: Building,
      value: (d) => d.vendorName || "—",
    },
    { label: "Department", icon: Building, value: (d) => d.department || "—" },
    {
      label: "Required by",
      icon: Calendar,
      value: (d) => fmtDate(d.requiredByDate || d.deliveryDate),
    },
    {
      label: "Total",
      icon: DollarSign,
      value: (d) => formatCurrency(d.totalAmount, d.currency),
    },
    {
      label: "Priority",
      icon: Tag,
      value: (d) => (d.priority ? d.priority.toString().toUpperCase() : "—"),
    },
    {
      label: "Linked Requisition",
      icon: GitBranch,
      value: (d) => d.linkedRequisition || d.sourceRequisitionId || "—",
    },
    { label: "Created", icon: Calendar, value: (d) => fmtDate(d.createdAt) },
  ];

  const actions: ActionButton<PurchaseOrder>[] = [
    {
      id: "submit",
      label: "Submit for Approval",
      icon: Send,
      variant: "primary",
      condition: (_d, ctx) => ctx.permissions.canSubmit,
      onClick: () => detail.setShowSubmitDialog(true),
    },
    {
      id: "preview",
      label: "Preview PDF",
      icon: Eye,
      variant: "outline",
      isLoading: detail.isExporting,
      onClick: () => detail.handlePreviewPDF(),
    },
    {
      id: "export",
      label: "Export PDF",
      icon: Download,
      variant: "outline",
      isLoading: detail.isExporting,
      onClick: () => detail.handleExportPDF(),
    },
    {
      id: "edit",
      label: "Edit",
      icon: Pencil,
      variant: "outline",
      condition: (_d, ctx) => ctx.permissions.canEdit,
      onClick: () => detail.handleEdit(),
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

  const sections: BodySection<PurchaseOrder>[] = [
    {
      id: "items",
      title: "Items",
      icon: Package,
      render: (d) => <POItemsTable items={(d.items || []) as any} />,
    },
    {
      id: "shipping",
      title: "Delivery & Flow",
      icon: Truck,
      render: (d) => (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Delivery date
            </dt>
            <dd className="text-sm font-medium">{fmtDate(d.deliveryDate)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Procurement flow
            </dt>
            <dd className="text-sm font-medium">
              {d.procurementFlow || "Inherit from org"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Subtotal
            </dt>
            <dd className="text-sm font-medium">
              {formatCurrency(d.subtotal ?? d.totalAmount, d.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Tax</dt>
            <dd className="text-sm font-medium">
              {formatCurrency(d.tax ?? 0, d.currency)}
            </dd>
          </div>
        </dl>
      ),
    },
    {
      id: "linked-docs",
      title: "Linked Documents",
      icon: GitBranch,
      render: (d) => (
        <DocumentLinks currentDocument={d as unknown as WorkflowDocument} />
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
          actionHistory={(d as any).actionHistory}
          auditEvents={auditEvents}
        />
      ),
    },
  ];

  return (
    <>
      <DocumentDetail
        doc={po}
        title={(po as any).title}
        metadataFields={metadataFields}
        actions={actions}
        sections={sections}
        context={{ userId, userRole, permissions: detail.permissions }}
      />

      <ConfirmationModal
        open={detail.showWithdrawModal}
        onOpenChange={detail.setShowWithdrawModal}
        onConfirm={detail.handleWithdraw}
        title="Withdraw Purchase Order"
        description="Withdrawing returns this PO to draft state."
        confirmText="Withdraw"
        type="withdraw"
        isLoading={detail.withdrawMutation?.isPending}
      />

      {detail.previewBlob && (
        <PDFPreviewDialog
          open={detail.previewOpen}
          onOpenChange={detail.setPreviewOpen}
          pdfBlob={detail.previewBlob}
          fileName={`${po.documentNumber}.pdf`}
          onDownload={() => detail.handleExportPDF()}
        />
      )}
    </>
  );
}
