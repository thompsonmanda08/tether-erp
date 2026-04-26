import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOrganizationContext } from "./use-organization";

export interface DocumentDetailConfig<TDocument, TAttachment = any> {
  documentId: string;
  userId: string;
  userRole: string;
  initialDocument?: TDocument;
  documentType:
    | "requisition"
    | "purchase-order"
    | "payment-voucher"
    | "grn"
    | "budget";

  // Query hooks
  useDocumentQuery: (
    id: string,
    initial?: TDocument,
  ) => {
    data: TDocument | null | undefined;
    isLoading: boolean;
    refetch: () => Promise<any>;
  };
  useChainQuery?: (id: string) => { data: any };
  useApprovalDataQuery?: (
    id: string,
    type: string,
  ) => {
    approvalHistory: any[];
    availableApprovers: any[];
    workflowStatus: any;
    isLoading: boolean;
    hasError: boolean;
    refetchAll: () => void;
  };

  // Mutation hooks
  useSubmitMutation: (
    id: string,
    onSuccess: () => void,
  ) => {
    mutateAsync: (data: any) => Promise<any>;
    isPending: boolean;
  };
  useWithdrawMutation?: (onSuccess: () => void) => {
    mutateAsync: (id: string) => Promise<any>;
    isPending: boolean;
  };

  // PDF export functions
  exportPDF: (doc: TDocument, options?: any) => Promise<Blob>;
  getPDFBlob: (doc: TDocument, options?: any) => Promise<Blob>;

  // Storage hook (optional)
  useStorage?: () => {
    saveToStorage: (doc: TDocument) => void;
  };

  // Permission checks
  getPermissions: (
    doc: TDocument,
    userId: string,
    userRole: string,
  ) => {
    isCreator: boolean;
    canEdit: boolean;
    canSubmit: boolean;
    canWithdraw: boolean;
  };

  // Auto-routing after submit (optional)
  getAutoRouteAfterSubmit?: (result: any) => string | null;
}

export function useDocumentDetail<
  TDocument extends Record<string, any>,
  TAttachment = any,
>(config: DocumentDetailConfig<TDocument, TAttachment>) {
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<TAttachment | null>(null);

  // Queries
  const {
    data: document,
    isLoading,
    refetch,
  } = config.useDocumentQuery(config.documentId, config.initialDocument);

  const chainQuery = config.useChainQuery?.(config.documentId);
  const approvalData = config.useApprovalDataQuery?.(
    config.documentId,
    config.documentType.toUpperCase(),
  );

  // Mutations
  const submitMutation = config.useSubmitMutation(config.documentId, () => {
    refetch();
  });

  const withdrawMutation = config.useWithdrawMutation?.(() => {
    refetch();
  });

  // Storage
  const storage = config.useStorage?.();

  // Handlers
  // Enriches a document with approvalHistory from workflowStatus.stageProgress when
  // the document's own approvalHistory field is empty (the JSONB field is never updated after creation).
  const buildPdfData = (dataToUse: TDocument): TDocument => {
    if ((dataToUse as any).approvalHistory?.length) return dataToUse;
    const stageProgress = approvalData?.workflowStatus?.stageProgress as any[] | undefined;
    const approvedStages =
      stageProgress?.filter(
        (s: any) => s.status?.toUpperCase() === "APPROVED" && s.approverName,
      ) ?? [];
    if (approvedStages.length === 0) return dataToUse;
    return {
      ...dataToUse,
      approvalHistory: approvedStages.map((s: any) => ({
        approverName: s.approverName,
        assignedRole: s.approverRole || s.requiredRole,
        status: "APPROVED",
        approvedAt: s.completedAt,
        comments: s.comments || "",
        stageNumber: s.stageNumber,
        stageName: s.stageName,
      })),
    };
  };

  const handlePreviewPDF = async () => {
    if (!document) return;
    try {
      setIsExporting(true);

      const { data: latestDocument } = await refetch();
      const pdfData = buildPdfData(latestDocument || document);

      const blob = await config.getPDFBlob(pdfData, {
        logoUrl: currentOrganization?.logoUrl,
        orgName: currentOrganization?.name,
        tagline: currentOrganization?.tagline,
      });
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (error) {
      console.error("PDF preview error:", error);
      toast.error("Failed to generate PDF preview");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!document) return;
    try {
      setIsExporting(true);

      const { data: latestDocument } = await refetch();
      const pdfData = buildPdfData(latestDocument || document);

      await config.exportPDF(pdfData, {
        logoUrl: currentOrganization?.logoUrl,
        orgName: currentOrganization?.name,
        tagline: currentOrganization?.tagline,
      });
      toast.success(`${config.documentType.replace("-", " ")} exported as PDF`);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmitForApproval = async (
    workflowId: string,
    comments?: string,
    additionalData?: any,
  ) => {
    if (!document) return;

    try {
      const result = await submitMutation.mutateAsync({
        workflowId,
        comments:
          comments ||
          `Submitted for approval on ${new Date().toLocaleDateString()}`,
        ...additionalData,
      });

      // Check for auto-routing
      const autoRoute = config.getAutoRouteAfterSubmit?.(result);
      if (autoRoute) {
        setShowSubmitDialog(false);
        router.push(autoRoute);
        return;
      }

      // Save to storage if available
      if (result?.data && storage) {
        storage.saveToStorage(result.data);
      }

      setShowSubmitDialog(false);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDocumentUpdated = () => {
    setIsEditDialogOpen(false);
    refetch();
  };

  const handleWithdraw = async () => {
    if (!document || !withdrawMutation) return;
    try {
      await withdrawMutation.mutateAsync(config.documentId);
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Withdraw error:", error);
    }
  };

  const handleApprovalComplete = () => {
    approvalData?.refetchAll();
    refetch();
  };

  const handleAttachmentPreview = (attachment: TAttachment) => {
    setSelectedAttachment(attachment);
    setAttachmentPreviewOpen(true);
  };

  // Permissions
  const permissions = document
    ? config.getPermissions(document, config.userId, config.userRole)
    : {
        isCreator: false,
        canEdit: false,
        canSubmit: false,
        canWithdraw: false,
      };

  return {
    // Data
    document,
    isLoading,
    chain: chainQuery?.data,
    approvalData,

    // State
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

    // Handlers
    handlePreviewPDF,
    handleExportPDF,
    handleSubmitForApproval,
    handleEdit,
    handleDocumentUpdated,
    handleWithdraw,
    handleApprovalComplete,
    handleAttachmentPreview,
    refetch,

    // Permissions
    permissions,

    // Mutations
    submitMutation,
    withdrawMutation,

    // Organization
    currentOrganization,
  };
}
