"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  AlertCircle,
  Download,
  Eye,
  Pencil,
  Calendar,
  Building,
  DollarSign,
  Clock,
  Tag,
  FileText,
  Undo2,
  Paperclip,
  ImageIcon,
  Receipt,
  CheckSquare,
  GitBranch,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/base/page-header";
import { PaymentVoucherItemsList } from "../../_components/payment-voucher-items-list";
import { ProcurementFlowIndicator } from "../../_components/procurement-flow-indicator";
import { PaymentVoucher } from "@/types/payment-voucher";
import {
  ActivityLogContent,
  ApprovalChainContent,
  ApprovalActionContent,
  WorkflowStatusSummary,
} from "@/app/(private)/(main)/requisitions/_components/approval-history-panel";
import { DocumentLinks } from "@/components/document-links";
import { WorkflowDocument } from "@/types";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Package } from "lucide-react";
import dynamic from "next/dynamic";

const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (mod) => mod.PDFPreviewDialog,
    ),
  { ssr: false },
);

const AttachmentPreviewDialog = dynamic(
  () =>
    import("@/components/modals/attachment-preview-dialog").then(
      (mod) => mod.AttachmentPreviewDialog,
    ),
  { ssr: false },
);
import { PaymentVoucherSubmitDialog } from "../../_components/payment-voucher-submit-dialog";
import { MarkPaidDialog } from "../../_components/mark-paid-dialog";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { Badge } from "@/components";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { usePaymentVoucherDetail } from "@/hooks/use-payment-voucher-detail";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import { formatCurrency } from "@/lib/utils";

/**
 * Props for the PVDetailClient component
 */
interface PVDetailClientProps {
  /** Payment Voucher ID */
  pvId: string;
  /** Current user ID */
  userId: string;
  /** Current user role */
  userRole: string;
  /** Optional initial PV data from server-side rendering */
  initialPaymentVoucher?: PaymentVoucher;
}

/**
 * Main client component for Payment Voucher detail page
 *
 * Manages all UI state and interactions for the PV detail page including:
 * - Displaying PV metadata and items
 * - Handling submission for approval
 * - Managing approval workflow interactions
 * - Displaying approval chain and activity log
 * - PDF preview and export
 * - Attachment preview
 * - Permission-based action buttons
 * - Procurement flow indicator (goods-first vs payment-first)
 *
 * This component follows the same pattern as the Purchase Order detail page
 * for consistency across document types.
 *
 * @param props - Component props
 * @param props.pvId - Payment Voucher ID to display
 * @param props.userId - Current user ID for permission checks
 * @param props.userRole - Current user role for permission checks
 * @param props.initialPaymentVoucher - Optional initial PV data from server
 *
 * @example
 * ```tsx
 * <PVDetailClient
 *   pvId="pv-123"
 *   userId="user-456"
 *   userRole="FINANCE_OFFICER"
 *   initialPaymentVoucher={serverPV}
 * />
 * ```
 *
 * **Validates: Requirements 7.1-7.8, 8.1-8.21, 13.1-13.8**
 */
export function PVDetailClient({
  pvId,
  userId,
  userRole,
  initialPaymentVoucher,
}: PVDetailClientProps) {
  const router = useRouter();
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);

  const { data: auditEventsData } = useQuery({
    queryKey: ["audit-events", "payment_voucher", pvId],
    queryFn: async () => {
      const res = await getAuditEvents("payment_voucher", pvId);
      return res.success ? ((res.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!pvId,
  });

  // Use the custom hook to manage all document detail logic
  const {
    document: paymentVoucher,
    isLoading,
    chain,
    approvalData,
    isExporting,
    previewOpen,
    setPreviewOpen,
    previewBlob,
    showSubmitDialog,
    setShowSubmitDialog,
    showWithdrawModal,
    setShowWithdrawModal,
    attachmentPreviewOpen,
    setAttachmentPreviewOpen,
    selectedAttachment,
    handlePreviewPDF,
    handleExportPDF,
    handleSubmitForApproval: handleSubmit,
    handleEdit,
    handleWithdraw,
    handleApprovalComplete,
    handleAttachmentPreview,
    permissions,
    submitMutation,
    withdrawMutation,
  } = usePaymentVoucherDetail({
    pvId,
    userId,
    userRole,
    initialPaymentVoucher,
  });

  // Show loading state while fetching initial data
  if (isLoading) return <DocumentLoadingPage />;

  // Show error state if PV not found
  if (!paymentVoucher)
    return (
      <ErrorDisplay
        title="Payment Voucher Not Found"
        message="The payment voucher you're looking for doesn't exist."
        showBackButton
      />
    );

  // Extract attachments from metadata
  const attachments: any[] =
    (paymentVoucher.metadata?.attachments as any[]) || [];

  /**
   * Formats file size in bytes to human-readable format (B, KB, MB)
   */
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  /**
   * Custom submit handler that passes additional PV metadata
   */
  const handleSubmitForApproval = async (
    workflowId: string,
    comments?: string,
  ) => {
    await handleSubmit(workflowId, comments, {
      submittedBy: userId,
      submittedByName: paymentVoucher.requestedByName || "User",
      submittedByRole: userRole,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={paymentVoucher.documentNumber}
          subtitle={`${paymentVoucher.title || "Untitled Payment Voucher"} • Created ${new Date(paymentVoucher.createdAt).toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" })}${paymentVoucher.updatedAt && new Date(paymentVoucher.updatedAt).getTime() !== new Date(paymentVoucher.createdAt).getTime() ? ` • Updated ${new Date(paymentVoucher.updatedAt).toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" })}` : ""}`}
          badges={[
            {
              status: paymentVoucher.status,
              type: "document",
            },
          ]}
          onBackClick={() => router.back()}
          showBackButton={true}
        />
        <div className="flex gap-2 mt-2">
          <Button
            onClick={handlePreviewPDF}
            disabled={isExporting}
            variant="outline"
            className="gap-2 h-11"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            isLoading={isExporting}
            loadingText="Exporting..."
            variant="outline"
            className="gap-2 h-11"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          {permissions.canEdit && (
            <Button
              onClick={handleEdit}
              variant="outline"
              className="gap-2 h-11"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {permissions.canSubmit && (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="gap-2 h-11"
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          )}
          {permissions.canWithdraw && (
            <Button
              onClick={() => setShowWithdrawModal(true)}
              variant="outline"
              className="gap-2 h-11 text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <Undo2 className="h-4 w-4" />
              Withdraw
            </Button>
          )}
          {paymentVoucher.status?.toUpperCase() === "APPROVED" && (
            <Button
              onClick={() => setShowMarkPaidDialog(true)}
              className="gap-2 h-11 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckSquare className="h-4 w-4" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Payment Voucher Details Card */}
      <div className="gradient-primary border-0 overflow-hidden rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-6 text-primary-foreground">
          Payment Voucher Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Title
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {paymentVoucher.title || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3" />
              Vendor
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {paymentVoucher.vendorName || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Invoice Number
            </label>
            <p className="text-base font-medium font-mono text-primary-foreground">
              {paymentVoucher.invoiceNumber || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3" />
              Department
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {paymentVoucher.department || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Priority
            </label>
            <div className="flex items-center">
              <Badge
                className={`inline-flex capitalize items-center px-2 py-1 rounded-full text-xs font-medium border ${
                  paymentVoucher.priority?.toUpperCase() === "URGENT"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : paymentVoucher.priority?.toUpperCase() === "HIGH"
                      ? "bg-orange-100 text-orange-800 border-orange-200"
                      : paymentVoucher.priority?.toUpperCase() === "MEDIUM"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                }`}
              >
                {paymentVoucher.priority || "Medium"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Amount
            </label>
            <p className="text-base font-bold text-primary-foreground">
              {formatCurrency(
                paymentVoucher.totalAmount || paymentVoucher.amount,
                paymentVoucher.currency,
              )}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Budget Code
            </label>
            <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
              {paymentVoucher.budgetCode || "—"}
            </p>
          </div>

          {paymentVoucher.costCenter && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <Building className="h-3 w-3" />
                Cost Center
              </label>
              <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
                {paymentVoucher.costCenter}
              </p>
            </div>
          )}

          {paymentVoucher.projectCode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Project Code
              </label>
              <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
                {paymentVoucher.projectCode}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created Date
            </label>
            <p className="text-sm font-medium text-primary-foreground">
              {new Date(paymentVoucher.createdAt).toLocaleDateString("en-ZM", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {paymentVoucher.updatedAt &&
            new Date(paymentVoucher.updatedAt).getTime() !==
              new Date(paymentVoucher.createdAt).getTime() && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Updated
                </label>
                <p className="text-sm font-medium text-primary-foreground">
                  {new Date(paymentVoucher.updatedAt).toLocaleDateString(
                    "en-ZM",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            )}

          {paymentVoucher.paymentDueDate && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Payment Due Date
              </label>
              <p
                className={`text-sm font-medium ${
                  new Date(paymentVoucher.paymentDueDate) < new Date() &&
                  paymentVoucher.status?.toUpperCase() !== "PAID"
                    ? "text-red-200 font-bold"
                    : "text-primary-foreground"
                }`}
              >
                {new Date(paymentVoucher.paymentDueDate).toLocaleDateString(
                  "en-ZM",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
                {new Date(paymentVoucher.paymentDueDate) < new Date() &&
                  paymentVoucher.status?.toUpperCase() !== "PAID" && (
                    <span className="ml-2 text-xs">(Overdue)</span>
                  )}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">
              Approval Stage
            </label>
            <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
              {paymentVoucher.currentStage &&
              approvalData?.workflowStatus?.totalStages
                ? `${paymentVoucher.currentStage}/${approvalData.workflowStatus.totalStages}`
                : `${paymentVoucher.approvalStage || 0}/1`}
            </p>
          </div>
        </div>

        {/* Description */}
        {paymentVoucher.description && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider block mb-2">
              Description
            </label>
            <p className="text-sm text-primary-foreground leading-relaxed">
              {paymentVoucher.description}
            </p>
          </div>
        )}
      </div>

      {/* Procurement Flow Indicator */}
      <div className="px-1">
        <ProcurementFlowIndicator paymentVoucher={paymentVoucher} />
      </div>

      {/* Document Chain — only shown once PV is approved or paid */}
      {(paymentVoucher.status?.toUpperCase() === "APPROVED" ||
        paymentVoucher.status?.toUpperCase() === "PAID") && (
        <DocumentLinks
          currentDocument={paymentVoucher as unknown as WorkflowDocument}
          chain={chain}
          showViewLinks={userRole.toLowerCase() !== "requester"}
        />
      )}

      {/* ── Tabbed Content ──────────────────────────────────────────── */}
      <Card className="p-6 border-0 shadow-sm">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger
              value="items"
              className="gap-1.5 text-xs sm:text-sm px-2 py-2"
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">PV</span> Items
              {paymentVoucher.items?.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs h-5 min-w-5 px-1.5"
                >
                  {paymentVoucher.items.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="gap-1.5 text-xs sm:text-sm px-2 py-2"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Supporting</span> Docs
              {attachments.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs h-5 min-w-5 px-1.5"
                >
                  {attachments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="action"
              className="gap-1.5 text-xs sm:text-sm px-2 py-2"
            >
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Approval</span> Action
            </TabsTrigger>
            <TabsTrigger
              value="chain"
              className="gap-1.5 text-xs sm:text-sm px-2 py-2"
            >
              <GitBranch className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Approval</span> Chain
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 text-xs sm:text-sm px-2 py-2"
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Activity</span> Log
              {paymentVoucher.actionHistory &&
                paymentVoucher.actionHistory.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs h-5 min-w-5 px-1.5"
                  >
                    {paymentVoucher.actionHistory.length}
                  </Badge>
                )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: PV Items ── */}
          <TabsContent value="items" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                Items ({paymentVoucher.items?.length || 0})
              </h2>
            </div>

            {paymentVoucher.items && paymentVoucher.items.length > 0 ? (
              <PaymentVoucherItemsList
                items={paymentVoucher.items}
                currency={paymentVoucher.currency}
                totalAmount={
                  paymentVoucher.totalAmount || paymentVoucher.amount
                }
              />
            ) : (
              <Empty>
                <EmptyMedia variant="icon">
                  <Package className="h-6 w-6" />
                </EmptyMedia>
                <EmptyContent>
                  <EmptyDescription>No items added yet</EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>

          {/* ── Tab 2: Supporting Documents ── */}
          <TabsContent value="documents" className="mt-6">
            {attachments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    Supporting Documents ({attachments.length})
                  </h2>
                </div>
                {attachments.map((attachment: any) => (
                  <button
                    key={attachment.fileId}
                    type="button"
                    onClick={() => handleAttachmentPreview(attachment)}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition group w-full text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {attachment.mimeType === "application/pdf" ? (
                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(attachment.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <Empty>
                <EmptyMedia variant="icon">
                  <Paperclip className="h-6 w-6" />
                </EmptyMedia>
                <EmptyContent>
                  <EmptyDescription>
                    No supporting documents attached
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>

          {/* ── Tab 3: Approval Action ── */}
          <TabsContent value="action" className="space-y-4 mt-6">
            {approvalData?.hasError ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load approval data</p>
                <button
                  onClick={approvalData.refetchAll}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <ApprovalActionContent
                requisitionId={pvId}
                requisition={paymentVoucher as any}
                workflowStatus={approvalData?.workflowStatus}
                isLoading={approvalData?.isLoading || false}
                onApprovalComplete={handleApprovalComplete}
              />
            )}
          </TabsContent>

          {/* ── Tab 4: Approval Chain ── */}
          <TabsContent value="chain" className="space-y-4 mt-6">
            {approvalData?.hasError ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load approval data</p>
                <button
                  onClick={approvalData.refetchAll}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <ApprovalChainContent
                  requisition={paymentVoucher as any}
                  approvalChain={paymentVoucher?.approvalChain}
                  approvalHistory={approvalData?.approvalHistory || []}
                  workflowStatus={approvalData?.workflowStatus}
                  availableApprovers={approvalData?.availableApprovers || []}
                  isLoading={approvalData?.isLoading || false}
                />
                <WorkflowStatusSummary
                  requisition={paymentVoucher as any}
                  workflowStatus={approvalData?.workflowStatus}
                />
              </>
            )}
          </TabsContent>

          {/* ── Tab 5: Activity Log (Timeline) ── */}
          <TabsContent value="activity" className="space-y-4 mt-6">
            <ActivityLogContent
              actionHistory={paymentVoucher?.actionHistory}
              auditEvents={auditEventsData}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* PDF Preview Dialog */}
      {previewBlob && (
        <PDFPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          pdfBlob={previewBlob}
          fileName={`Payment Voucher: ${paymentVoucher.documentNumber}`}
          onDownload={handleExportPDF}
        />
      )}

      {/* Submit Dialog */}
      <PaymentVoucherSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        paymentVoucher={paymentVoucher}
        onSubmit={handleSubmitForApproval}
        isSubmitting={submitMutation.isPending}
      />

      {/* Withdraw Confirmation Modal */}
      <ConfirmationModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        onConfirm={handleWithdraw}
        type="withdraw"
        title="Withdraw Payment Voucher"
        description={`Are you sure you want to withdraw payment voucher ${paymentVoucher.documentNumber || paymentVoucher.id}? It will be reverted to draft status and you can edit and re-submit it later.`}
        isLoading={withdrawMutation?.isPending || false}
      />

      {/* Attachment Preview Dialog */}
      <AttachmentPreviewDialog
        open={attachmentPreviewOpen}
        onOpenChange={setAttachmentPreviewOpen}
        attachment={selectedAttachment}
        attachments={attachments}
      />

      {/* Mark as Paid Dialog */}
      <MarkPaidDialog
        open={showMarkPaidDialog}
        onOpenChange={setShowMarkPaidDialog}
        paymentVoucher={paymentVoucher}
        userId={userId}
        userRole={userRole}
        onSuccess={handleApprovalComplete}
      />
    </div>
  );
}
