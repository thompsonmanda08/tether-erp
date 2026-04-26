"use client";

import { useState, useRef } from "react";
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
  ShoppingCart,
  CheckSquare,
  GitBranch,
  Activity,
  ArrowRight,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/base/page-header";
import { PurchaseOrderItemsList } from "./purchase-order-items-list";
import { POItemsEditor } from "./po-items-editor";
import { PurchaseOrder, PurchaseOrderAttachment } from "@/types/purchase-order";
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
import { PurchaseOrderSubmitDialog } from "./purchase-order-submit-dialog";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuotationCollectionSection } from "@/app/(private)/(main)/requisitions/_components/quotation-collection-section";
import { POShippingEditor } from "./po-shipping-editor";
import { useVendors } from "@/hooks/use-vendor-queries";
import type { Quotation } from "@/types/core";
import { Badge } from "@/components";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { usePurchaseOrderDetail } from "@/hooks/use-purchase-order-detail";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAuditEvents, type AuditEvent } from "@/app/_actions/audit";
import { uploadToImageKit } from "@/lib/imagekit";
import { updatePurchaseOrder } from "@/app/_actions/purchase-orders";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { EditPurchaseOrderDialog } from "./edit-purchase-order-dialog";

/**
 * Props for the PurchaseOrderDetailClient component
 */
interface PurchaseOrderDetailClientProps {
  /** Purchase Order ID */
  purchaseOrderId: string;
  /** Current user ID */
  userId: string;
  /** Current user role */
  userRole: string;
  /** Optional initial PO data from server-side rendering */
  initialPurchaseOrder?: PurchaseOrder;
}

/**
 * Main client component for Purchase Order detail page
 *
 * Manages all UI state and interactions for the PO detail page including:
 * - Displaying PO metadata and items
 * - Handling submission for approval
 * - Managing approval workflow interactions
 * - Displaying approval chain and activity log
 * - PDF preview and export
 * - Attachment preview
 * - Permission-based action buttons
 *
 * This component follows the same pattern as the Requisition detail page
 * for consistency across document types.
 *
 * @param props - Component props
 * @param props.purchaseOrderId - Purchase Order ID to display
 * @param props.userId - Current user ID for permission checks
 * @param props.userRole - Current user role for permission checks
 * @param props.initialPurchaseOrder - Optional initial PO data from server
 *
 * @example
 * ```tsx
 * <PurchaseOrderDetailClient
 *   purchaseOrderId="po-123"
 *   userId="user-456"
 *   userRole="PROCUREMENT_OFFICER"
 *   initialPurchaseOrder={serverPO}
 * />
 * ```
 *
 * **Validates: Requirements 6.1, 11.6, 12.1, 12.5, 12.6**
 */
export function PurchaseOrderDetailClient({
  purchaseOrderId,
  userId,
  userRole,
  initialPurchaseOrder,
}: PurchaseOrderDetailClientProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: vendors = [] } = useVendors({ active: true });

  // Use the custom hook to manage all document detail logic
  // This hook handles data fetching, mutations, UI state, and permissions
  const { data: auditEventsData } = useQuery({
    queryKey: ["audit-events", "purchase_order", purchaseOrderId],
    queryFn: async () => {
      const res = await getAuditEvents("purchase_order", purchaseOrderId);
      return res.success ? ((res.data as AuditEvent[]) ?? []) : [];
    },
    enabled: !!purchaseOrderId,
  });

  const {
    document: purchaseOrder,
    isLoading,
    chain,
    approvalData,
    isExporting,
    previewOpen,
    setPreviewOpen,
    previewBlob,
    isEditDialogOpen,
    setIsEditDialogOpen,
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
    handleDocumentUpdated,
    handleWithdraw,
    handleApprovalComplete,
    handleAttachmentPreview,
    permissions,
    submitMutation,
    withdrawMutation,
  } = usePurchaseOrderDetail({
    poId: purchaseOrderId,
    userId,
    userRole,
    initialPurchaseOrder,
  });

  // Show loading state while fetching initial data
  if (isLoading) return <DocumentLoadingPage />;

  // Show error state if PO not found
  if (!purchaseOrder)
    return (
      <ErrorDisplay
        title="Purchase Order Not Found"
        message="The purchase order you're looking for doesn't exist."
        showBackButton
      />
    );

  // Extract attachments: merge PO's own + REQ's (tagged fromRequisition)
  const attachments: PurchaseOrderAttachment[] =
    (purchaseOrder.metadata?.attachments as PurchaseOrderAttachment[]) || [];

  // Extract quotations from PO metadata
  const quotations: Quotation[] =
    (purchaseOrder.metadata?.quotations as Quotation[]) ?? [];

  const isDraft = purchaseOrder.status?.toUpperCase() === "DRAFT";

  // Look up full vendor details from the vendors list
  const vendorDetails = vendors.find((v) => v.id === purchaseOrder.vendorId);

  const canEditQuotations = isDraft;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadToImageKit(
        file,
        "purchase-orders/attachments",
      );
      const newAttachment: PurchaseOrderAttachment = {
        fileId: result.fileId,
        fileName: result.name,
        fileUrl: result.url,
        fileSize: result.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };
      const existingOwn = attachments.filter((a) => !a.fromRequisition);
      const fromReq = attachments.filter((a) => a.fromRequisition);
      const merged = [...existingOwn, newAttachment, ...fromReq];
      await updatePurchaseOrder({
        purchaseOrderId: purchaseOrderId,
        poId: purchaseOrderId,
        metadata: { ...purchaseOrder.metadata, attachments: merged },
      });
      handleDocumentUpdated();
      toast.success("Document uploaded successfully");
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveQuotations = async (updated: Quotation[]) => {
    await updatePurchaseOrder({
      purchaseOrderId,
      poId: purchaseOrderId,
      metadata: { ...purchaseOrder.metadata, quotations: updated },
    });
    handleDocumentUpdated();
  };

  const handleSelectVendor = async (
    vendorId: string,
    vendorName: string,
    amount: number,
    fileUrl: string,
  ) => {
    await updatePurchaseOrder({
      purchaseOrderId,
      poId: purchaseOrderId,
      vendorId,
      vendorName,
      totalAmount: amount,
      metadata: {
        ...purchaseOrder.metadata,
        selectedQuotationFileUrl: fileUrl,
      },
    });
    handleDocumentUpdated();
  };

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
   * Custom submit handler that passes additional PO metadata
   * This ensures the submission includes submitter information
   */
  const handleSubmitForApproval = async (
    workflowId: string,
    comments?: string,
  ) => {
    await handleSubmit(workflowId, comments, {
      submittedBy: userId,
      submittedByName: purchaseOrder.requestedByName || "User",
      submittedByRole: purchaseOrder.requestedByRole || userRole,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={purchaseOrder.documentNumber}
        subtitle={`${purchaseOrder.title || "Untitled Purchase Order"} • Created ${new Date(purchaseOrder.createdAt).toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" })}${purchaseOrder.updatedAt && new Date(purchaseOrder.updatedAt).getTime() !== new Date(purchaseOrder.createdAt).getTime() ? ` • Updated ${new Date(purchaseOrder.updatedAt).toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" })}` : ""}`}
        badges={[{ status: purchaseOrder.status, type: "document" }]}
        onBackClick={() => router.back()}
        showBackButton={true}
        actions={
          <>
            <Button
              onClick={handlePreviewPDF}
              disabled={isExporting}
              variant="outline"
              className="gap-2 h-9"
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
              className="gap-2 h-9"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            {permissions.canEdit && (
              <Button
                onClick={handleEdit}
                variant="outline"
                className="gap-2 h-9"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {permissions.canSubmit && (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="gap-2 h-9"
              >
                <Send className="h-4 w-4" />
                Submit for Approval
              </Button>
            )}
            {permissions.canWithdraw && (
              <Button
                onClick={() => setShowWithdrawModal(true)}
                variant="outline"
                className="gap-2 h-9 text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <Undo2 className="h-4 w-4" />
                Withdraw
              </Button>
            )}
          </>
        }
      />

      {/* Purchase Order Details Card */}
      <div className="gradient-primary border-0 overflow-hidden rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-6 text-primary-foreground">
          Purchase Order Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Title
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {purchaseOrder.title || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3" />
              Vendor
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {purchaseOrder.vendorName || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3" />
              Department
            </label>
            <p className="text-base font-medium text-primary-foreground">
              {purchaseOrder.department || "—"}
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
                  purchaseOrder.priority?.toUpperCase() === "URGENT"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : purchaseOrder.priority?.toUpperCase() === "HIGH"
                      ? "bg-orange-100 text-orange-800 border-orange-200"
                      : purchaseOrder.priority?.toUpperCase() === "MEDIUM"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                }`}
              >
                {purchaseOrder.priority || "Medium"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Estimated Cost
            </label>
            <p className="text-base font-bold text-primary-foreground">
              {formatCurrency(
                purchaseOrder.totalAmount,
                purchaseOrder.currency,
              )}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Budget Code
            </label>
            <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
              {purchaseOrder.budgetCode || "—"}
            </p>
          </div>

          {purchaseOrder.costCenter && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <Building className="h-3 w-3" />
                Cost Center
              </label>
              <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
                {purchaseOrder.costCenter}
              </p>
            </div>
          )}

          {purchaseOrder.projectCode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Project Code
              </label>
              <p className="text-sm font-medium font-mono bg-white/10 px-2 py-1 rounded text-primary-foreground">
                {purchaseOrder.projectCode}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created Date
            </label>
            <p className="text-sm font-medium text-primary-foreground">
              {new Date(purchaseOrder.createdAt).toLocaleDateString("en-ZM", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {purchaseOrder.updatedAt &&
            new Date(purchaseOrder.updatedAt).getTime() !==
              new Date(purchaseOrder.createdAt).getTime() && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Updated
                </label>
                <p className="text-sm font-medium text-primary-foreground">
                  {new Date(purchaseOrder.updatedAt).toLocaleDateString(
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

          {purchaseOrder.deliveryDate && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Delivery Date
              </label>
              <p
                className={`text-sm font-medium ${
                  new Date(purchaseOrder.deliveryDate) < new Date() &&
                  purchaseOrder.status?.toUpperCase() !== "COMPLETED"
                    ? "text-red-200 font-bold"
                    : "text-primary-foreground"
                }`}
              >
                {new Date(purchaseOrder.deliveryDate).toLocaleDateString(
                  "en-ZM",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
                {new Date(purchaseOrder.deliveryDate) < new Date() &&
                  purchaseOrder.status?.toUpperCase() !== "COMPLETED" && (
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
              {purchaseOrder.currentStage &&
              approvalData?.workflowStatus?.totalStages
                ? `${purchaseOrder.currentStage}/${approvalData.workflowStatus.totalStages}`
                : `${purchaseOrder.approvalStage || 0}/1`}
            </p>
          </div>

          {purchaseOrder.linkedRequisition && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3" /> Source Requisition
              </label>
              <a
                href={`/requisitions/${purchaseOrder.sourceRequisitionId || purchaseOrder.linkedRequisition}`}
                className="text-base font-medium text-primary-foreground underline underline-offset-2 hover:opacity-80"
              >
                {purchaseOrder.linkedRequisition}
              </a>
            </div>
          )}
        </div>

        {/* Description */}
        {purchaseOrder.description && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <label className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider block mb-2">
              Description
            </label>
            <p className="text-sm text-primary-foreground leading-relaxed">
              {purchaseOrder.description}
            </p>
          </div>
        )}
      </div>

      {/* Vendor Details Card — shown when vendor is selected */}
      {purchaseOrder.vendorId && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building className="h-4 w-4" />
            Supplier Details —{" "}
            {purchaseOrder.vendorName ||
              vendorDetails?.name ||
              "Unknown Vendor"}
          </h3>

          {/* Cost Comparison Section — always shown when vendor is selected */}
          {(() => {
            const estimated =
              purchaseOrder.estimatedCost || purchaseOrder.totalAmount;
            const selectedFileUrl = purchaseOrder.metadata
              ?.selectedQuotationFileUrl as string | undefined;
            const selectedQuotation = selectedFileUrl
              ? quotations.find((q) => q.fileUrl === selectedFileUrl)
              : undefined;
            const actual =
              selectedQuotation?.amount ?? purchaseOrder.totalAmount;
            const diff = actual - estimated;
            const pct = estimated > 0 ? (diff / estimated) * 100 : 0;
            const isOver = diff > 0;
            const isUnder = diff < 0;
            const color = isUnder
              ? "text-green-600 dark:text-green-400"
              : Math.abs(pct) <= 10
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400";
            const Icon = isUnder ? TrendingDown : isOver ? TrendingUp : Minus;
            return (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-3">
                <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
                  Cost Comparison
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                      {purchaseOrder.estimatedCost
                        ? "Estimated Cost (from REQ)"
                        : "PO Estimated Cost"}
                    </span>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(estimated, purchaseOrder.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                      Selected Supplier Price
                    </span>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(actual, purchaseOrder.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      Variance
                    </span>
                    <p className={`text-base font-bold ${color}`}>
                      {isUnder ? "−" : isOver ? "+" : ""}
                      {formatCurrency(Math.abs(diff), purchaseOrder.currency)}
                      <span className="text-sm font-normal ml-1">
                        ({isUnder ? "−" : isOver ? "+" : ""}
                        {Math.abs(pct).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Vendor Contact Details - only show if vendor details are available */}
          {vendorDetails &&
            (vendorDetails.contactPerson ||
              vendorDetails.email ||
              vendorDetails.phone ||
              vendorDetails.physicalAddress ||
              vendorDetails.bankName ||
              vendorDetails.accountNumber) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {vendorDetails.contactPerson && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Contact Person
                    </span>
                    <p className="font-medium">{vendorDetails.contactPerson}</p>
                  </div>
                )}
                {vendorDetails.email && (
                  <div>
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="font-medium">{vendorDetails.email}</p>
                  </div>
                )}
                {vendorDetails.phone && (
                  <div>
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <p className="font-medium">{vendorDetails.phone}</p>
                  </div>
                )}
                {vendorDetails.physicalAddress && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Address
                    </span>
                    <p className="font-medium">
                      {vendorDetails.physicalAddress}
                    </p>
                  </div>
                )}
                {vendorDetails.bankName && (
                  <div>
                    <span className="text-xs text-muted-foreground">Bank</span>
                    <p className="font-medium">{vendorDetails.bankName}</p>
                  </div>
                )}
                {vendorDetails.accountNumber && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Account Number
                    </span>
                    <p className="font-medium font-mono">
                      {vendorDetails.accountNumber}
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* Document Chain — shown once PO is pending or approved */}
      {["APPROVED", "PENDING"].includes(
        purchaseOrder.status?.toUpperCase() ?? "",
      ) && (
        <DocumentLinks
          currentDocument={purchaseOrder as unknown as WorkflowDocument}
          chain={chain}
          showViewLinks={userRole.toLowerCase() !== "requester"}
        />
      )}

      {/* Payment Voucher — shown only when PO is APPROVED */}
      {purchaseOrder.status?.toUpperCase() === "APPROVED" && (
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Payment Voucher</h3>
              <p className="text-xs text-muted-foreground">
                {purchaseOrder.linkedPV
                  ? "A payment voucher is linked to this PO"
                  : "No payment voucher yet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {purchaseOrder.linkedPV ? (
                <>
                  <StatusBadge
                    status={purchaseOrder.linkedPV.status}
                    type="document"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/payment-vouchers/${purchaseOrder.linkedPV!.id}`,
                      )
                    }
                  >
                    View PV
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/payment-vouchers/new?linkedPO=${purchaseOrder.documentNumber}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Create PV
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Tabbed Content ──────────────────────────────────────────── */}
      <Card className="p-6 border-0 shadow-sm">
        <Tabs defaultValue="items" className="w-full">
          <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
            <TabsList className="flex min-w-full h-auto">
              <TabsTrigger
                value="items"
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">PO</span> Items
                {purchaseOrder.items?.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs h-5 min-w-5 px-1.5"
                  >
                    {purchaseOrder.items.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
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
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
              >
                <CheckSquare className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Approval</span> Action
              </TabsTrigger>
              <TabsTrigger
                value="chain"
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
              >
                <GitBranch className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Approval</span> Chain
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
              >
                <Activity className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Activity</span> Log
                {purchaseOrder.actionHistory &&
                  purchaseOrder.actionHistory.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-xs h-5 min-w-5 px-1.5"
                    >
                      {purchaseOrder.actionHistory.length}
                    </Badge>
                  )}
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="gap-1.5 text-xs sm:text-sm px-2 py-2 flex-1 shrink-0 whitespace-nowrap"
              >
                <Truck className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Shipping</span> &amp; Tax
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab 1: PO Items ── */}
          <TabsContent value="items" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                Items ({purchaseOrder.items?.length || 0})
              </h2>
              {permissions.canEdit && !editingItems && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItems(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {purchaseOrder.items?.length ? "Edit Items" : "Add Items"}
                </Button>
              )}
            </div>

            {editingItems ? (
              <POItemsEditor
                poId={purchaseOrderId}
                items={(purchaseOrder.items ?? []).map((item, index) => ({
                  id: item.id || `item-${index}`,
                  description: item.description || "",
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  amount: item.totalPrice || item.amount || 0,
                  totalPrice: item.totalPrice || item.amount || 0,
                  unit: item.unit,
                  category: item.category,
                  notes: item.notes,
                }))}
                currency={purchaseOrder.currency || "ZMW"}
                onSaved={() => setEditingItems(false)}
                onCancel={() => setEditingItems(false)}
              />
            ) : purchaseOrder.items && purchaseOrder.items.length > 0 ? (
              <PurchaseOrderItemsList
                items={purchaseOrder.items}
                currency={purchaseOrder.currency}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Supporting Documents
                {attachments.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({attachments.length})
                  </span>
                )}
              </h2>
              {isDraft && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isUploading}
                    isLoading={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                </>
              )}
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(attachment.fileSize)}
                          </p>
                          {attachment.fromRequisition && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                              From Requisition
                            </span>
                          )}
                          {attachment.category && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                              {attachment.category.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
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
                    {isDraft
                      ? "No documents yet — upload supporting documents above"
                      : "No supporting documents attached"}
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}

            {/* Quotations section */}
            {!purchaseOrder.automationUsed && (
              <QuotationCollectionSection
                quotations={quotations}
                requisitionId={purchaseOrderId}
                currency={purchaseOrder.currency || "ZMW"}
                vendors={vendors}
                canEdit={canEditQuotations}
                onSave={handleSaveQuotations}
                selectedVendorId={purchaseOrder.vendorId}
                selectedQuotationFileId={
                  purchaseOrder.metadata?.selectedQuotationFileUrl as
                    | string
                    | undefined
                }
                onSelectVendor={handleSelectVendor}
                showVendorSelection={isDraft}
              />
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
              <>
                {purchaseOrder.quotationGateOverridden && (
                  <Alert className="border-amber-200 bg-amber-50 mb-4">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <p className="text-amber-800 font-medium text-sm">
                        Quotation Override Applied
                      </p>
                      {purchaseOrder.bypassJustification && (
                        <p className="text-amber-700 text-xs mt-1">
                          {purchaseOrder.bypassJustification}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <ApprovalActionContent
                  requisitionId={purchaseOrderId}
                  requisition={purchaseOrder as any}
                  workflowStatus={approvalData?.workflowStatus}
                  isLoading={approvalData?.isLoading || false}
                  onApprovalComplete={handleApprovalComplete}
                />
              </>
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
                  requisition={purchaseOrder as any}
                  approvalChain={purchaseOrder?.approvalChain}
                  approvalHistory={approvalData?.approvalHistory || []}
                  workflowStatus={approvalData?.workflowStatus}
                  availableApprovers={approvalData?.availableApprovers || []}
                  isLoading={approvalData?.isLoading || false}
                />
                <WorkflowStatusSummary
                  requisition={purchaseOrder as any}
                  workflowStatus={approvalData?.workflowStatus}
                />
              </>
            )}
          </TabsContent>

          {/* ── Tab 5: Activity Log (Timeline) ── */}
          <TabsContent value="activity" className="space-y-4 mt-6">
            <ActivityLogContent
              actionHistory={purchaseOrder?.actionHistory}
              auditEvents={auditEventsData}
            />
          </TabsContent>

          {/* ── Tab 6: Shipping & Tax ── */}
          <TabsContent value="shipping" className="mt-6">
            <POShippingEditor
              poId={purchaseOrderId}
              purchaseOrder={purchaseOrder}
              canEdit={
                permissions.canEdit ||
                ["admin", "finance"].includes(userRole?.toLowerCase())
              }
              onSaved={handleDocumentUpdated}
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
          fileName={`Purchase Order: ${purchaseOrder.documentNumber}`}
          onDownload={handleExportPDF}
        />
      )}

      {/* Submit Dialog */}
      <PurchaseOrderSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        purchaseOrder={purchaseOrder}
        onSubmit={handleSubmitForApproval}
        isSubmitting={submitMutation.isPending}
      />

      {/* Withdraw Confirmation Modal */}
      <ConfirmationModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        onConfirm={handleWithdraw}
        type="withdraw"
        title="Withdraw Purchase Order"
        description={`Are you sure you want to withdraw purchase order ${purchaseOrder.documentNumber || purchaseOrder.id}? It will be reverted to draft status and you can edit and re-submit it later.`}
        isLoading={withdrawMutation?.isPending || false}
      />

      {/* Attachment Preview Dialog */}
      <AttachmentPreviewDialog
        open={attachmentPreviewOpen}
        onOpenChange={setAttachmentPreviewOpen}
        attachment={selectedAttachment}
        attachments={attachments}
      />

      {/* Edit Purchase Order Dialog */}
      <EditPurchaseOrderDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        purchaseOrder={purchaseOrder}
        onSuccess={handleDocumentUpdated}
      />
    </div>
  );
}
