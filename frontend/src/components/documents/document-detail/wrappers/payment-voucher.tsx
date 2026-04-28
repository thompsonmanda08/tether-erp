"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Download,
  Eye,
  Pencil,
  Undo2,
  CircleDollarSign,
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
} from "lucide-react";

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

import { usePaymentVoucherDetail } from "@/hooks/use-payment-voucher-detail";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import { formatCurrency } from "@/lib/utils";
import type { PaymentVoucher } from "@/types/payment-voucher";
import type { WorkflowDocument } from "@/types";

import {
  ActivityLogContent,
  ApprovalChainContent,
  ApprovalActionContent,
} from "@/app/(private)/(main)/requisitions/_components/approval-history-panel";
import { PaymentVoucherItemsList } from "@/app/(private)/(main)/payment-vouchers/_components/payment-voucher-items-list";
import { ProcurementFlowIndicator } from "@/app/(private)/(main)/payment-vouchers/_components/procurement-flow-indicator";
import { MarkPaidDialog } from "@/app/(private)/(main)/payment-vouchers/_components/mark-paid-dialog";

const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (m) => m.PDFPreviewDialog,
    ),
  { ssr: false },
);

interface PVDetailProps {
  pvId: string;
  userId: string;
  userRole: string;
  initialPaymentVoucher?: PaymentVoucher;
}

const fmtDate = (d: Date | string | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export function PaymentVoucherDetailV2({
  pvId,
  userId,
  userRole,
  initialPaymentVoucher,
}: PVDetailProps) {
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);

  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit-events", "payment_voucher", pvId],
    queryFn: async () => {
      const r = await getAuditEvents("payment_voucher", pvId);
      return r.success ? ((r.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!pvId,
  });

  const detail = usePaymentVoucherDetail({
    pvId,
    userId,
    userRole,
    initialPaymentVoucher,
  });

  if (detail.isLoading) return <DocumentLoadingPage />;
  if (!detail.document)
    return (
      <ErrorDisplay
        title="Payment Voucher Not Found"
        message="The payment voucher you're looking for doesn't exist."
        showBackButton
      />
    );

  const pv = detail.document;
  const canMarkPaid = pv.status?.toUpperCase() === "APPROVED";

  const metadataFields: MetadataField<PaymentVoucher>[] = [
    {
      label: "Invoice #",
      icon: Receipt,
      value: (d) => (d as any).invoiceNumber || "—",
      copyValue: (d) => (d as any).invoiceNumber,
    },
    {
      label: "Vendor",
      icon: Building,
      value: (d) => (d as any).vendorName || "—",
    },
    {
      label: "Amount",
      icon: DollarSign,
      value: (d) =>
        formatCurrency(
          (d as any).amount ?? (d as any).totalAmount ?? 0,
          (d as any).currency || "USD",
        ),
    },
    {
      label: "Payment method",
      icon: CircleDollarSign,
      value: (d) => ((d as any).paymentMethod || "—").replace("_", " "),
    },
    {
      label: "GL code",
      icon: Tag,
      value: (d) => (d as any).glCode || "—",
    },
    {
      label: "Department",
      icon: Building,
      value: (d) => (d as any).department || "—",
    },
    {
      label: "Linked PO",
      icon: GitBranch,
      value: (d) => (d as any).linkedPO || "—",
    },
    {
      label: "Created",
      icon: Calendar,
      value: (d) => fmtDate((d as any).createdAt),
    },
  ];

  const actions: ActionButton<PaymentVoucher>[] = [
    {
      id: "submit",
      label: "Submit for Approval",
      icon: Send,
      variant: "primary",
      condition: (_d, ctx) => ctx.permissions.canSubmit,
      onClick: () => detail.setShowSubmitDialog(true),
    },
    {
      id: "mark-paid",
      label: "Mark as Paid",
      icon: CircleDollarSign,
      variant: "primary",
      condition: () => canMarkPaid,
      onClick: () => setShowMarkPaidDialog(true),
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

  const sections: BodySection<PaymentVoucher>[] = [
    {
      id: "items",
      title: "Items",
      icon: Package,
      render: (d) => (
        <PaymentVoucherItemsList
          items={(d as any).items || []}
          currency={(d as any).currency || "USD"}
          totalAmount={(d as any).amount ?? (d as any).totalAmount}
        />
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
          requisitionId={(d as any).id}
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
        doc={pv}
        title={(pv as any).title || (pv as any).description}
        metadataFields={metadataFields}
        actions={actions}
        sections={sections}
        context={{ userId, userRole, permissions: detail.permissions }}
        topBanner={<ProcurementFlowIndicator paymentVoucher={pv} />}
      />

      <ConfirmationModal
        open={detail.showWithdrawModal}
        onOpenChange={detail.setShowWithdrawModal}
        onConfirm={detail.handleWithdraw}
        title="Withdraw Payment Voucher"
        description="Withdrawing returns this voucher to draft state."
        confirmText="Withdraw"
        type="withdraw"
        isLoading={detail.withdrawMutation?.isPending}
      />

      <MarkPaidDialog
        open={showMarkPaidDialog}
        onOpenChange={setShowMarkPaidDialog}
        paymentVoucher={pv}
        userId={userId}
        userRole={userRole}
        onSuccess={() => {
          setShowMarkPaidDialog(false);
        }}
      />

      {detail.previewBlob && (
        <PDFPreviewDialog
          open={detail.previewOpen}
          onOpenChange={detail.setPreviewOpen}
          pdfBlob={detail.previewBlob}
          fileName={`${pv.documentNumber}.pdf`}
          onDownload={() => detail.handleExportPDF()}
        />
      )}
    </>
  );
}
