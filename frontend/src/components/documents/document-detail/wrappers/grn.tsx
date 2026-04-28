"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Download,
  Eye,
  Pencil,
  Calendar,
  Building,
  Package,
  CheckSquare,
  GitBranch,
  Activity,
  Truck,
  AlertTriangle,
  FileText,
  MapPin,
} from "lucide-react";

import { DocumentDetail, ItemsTable } from "@/components/documents/document-detail";
import {
  type ActionButton,
  type BodySection,
  type ItemColumn,
  type MetadataField,
} from "@/components/documents/document-detail/types";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { DocumentLinks } from "@/components/document-links";

import { useGRNDetail } from "@/hooks/use-grn-detail";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import type { GoodsReceivedNote } from "@/types/goods-received-note";
import type { WorkflowDocument } from "@/types";

import {
  ActivityLogContent,
  ApprovalChainContent,
  ApprovalActionContent,
} from "@/app/(private)/(main)/requisitions/_components/approval-history-panel";

const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (m) => m.PDFPreviewDialog,
    ),
  { ssr: false },
);

interface GRNDetailProps {
  grnId: string;
  userId: string;
  userRole: string;
  initialGRN?: GoodsReceivedNote;
}

const fmtDate = (d: Date | string | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export function GRNDetailV2({
  grnId,
  userId,
  userRole,
  initialGRN,
}: GRNDetailProps) {
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit-events", "grn", grnId],
    queryFn: async () => {
      const r = await getAuditEvents("grn", grnId);
      return r.success ? ((r.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!grnId,
  });

  const detail = useGRNDetail({
    grnId,
    userId,
    userRole,
    initialGRN,
  });

  if (detail.isLoading) return <DocumentLoadingPage />;
  if (!detail.document)
    return (
      <ErrorDisplay
        title="GRN Not Found"
        message="The goods received note you're looking for doesn't exist."
        showBackButton
      />
    );

  const grn = detail.document as GoodsReceivedNote;

  const itemColumns: ItemColumn<any>[] = [
    {
      key: "description",
      header: "Item",
      render: (item) => (
        <div>
          <p className="font-medium">{item.description || item.itemDescription}</p>
          {item.notes && (
            <p className="text-xs text-muted-foreground">{item.notes}</p>
          )}
        </div>
      ),
    },
    {
      key: "ordered",
      header: "Ordered",
      align: "right",
      render: (item) => item.orderedQuantity ?? item.quantity ?? 0,
    },
    {
      key: "received",
      header: "Received",
      align: "right",
      render: (item) => (
        <span className="font-medium">{item.receivedQuantity ?? item.quantity ?? 0}</span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      align: "center",
      render: (item) => item.unit || "—",
    },
  ];

  const metadataFields: MetadataField<GoodsReceivedNote>[] = [
    {
      label: "Linked PO",
      icon: GitBranch,
      value: (d) => d.poDocumentNumber || "—",
    },
    {
      label: "Received date",
      icon: Calendar,
      value: (d) => fmtDate(d.receivedDate),
    },
    {
      label: "Received by",
      icon: Building,
      value: (d) => d.receivedBy || "—",
    },
    {
      label: "Warehouse",
      icon: MapPin,
      value: (d) => d.warehouseLocation || "—",
    },
    {
      label: "Quality issues",
      icon: AlertTriangle,
      value: (d) => (d.qualityIssues?.length ?? 0).toString(),
    },
    {
      label: "Created",
      icon: Calendar,
      value: (d) => fmtDate(d.createdAt),
    },
  ];

  const actions: ActionButton<GoodsReceivedNote>[] = [
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
  ];

  const sections: BodySection<GoodsReceivedNote>[] = [
    {
      id: "items",
      title: "Items Received",
      icon: Package,
      render: (d) => <ItemsTable items={d.items || []} columns={itemColumns} />,
    },
    {
      id: "quality",
      title: "Quality Issues",
      icon: AlertTriangle,
      condition: (d) => (d.qualityIssues?.length ?? 0) > 0,
      render: (d) => (
        <ul className="space-y-2 text-sm">
          {d.qualityIssues.map((q: any, i: number) => (
            <li
              key={i}
              className="rounded-md border border-warning-200 bg-warning-50/40 p-3"
            >
              <p className="font-medium">{q.issueType || "Issue"}</p>
              {q.description && (
                <p className="mt-1 text-muted-foreground">{q.description}</p>
              )}
            </li>
          ))}
        </ul>
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
      render: () => (
        <ActivityLogContent
          actionHistory={(grn as any).actionHistory}
          auditEvents={auditEvents}
        />
      ),
    },
  ];

  return (
    <>
      <DocumentDetail
        doc={grn}
        title={`GRN for ${grn.poDocumentNumber}`}
        metadataFields={metadataFields}
        actions={actions}
        sections={sections}
        context={{ userId, userRole, permissions: detail.permissions }}
      />

      {detail.previewBlob && (
        <PDFPreviewDialog
          open={detail.previewOpen}
          onOpenChange={detail.setPreviewOpen}
          pdfBlob={detail.previewBlob}
          fileName={`${grn.documentNumber}.pdf`}
          onDownload={() => detail.handleExportPDF()}
        />
      )}
    </>
  );
}
