"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Clock,
  User,
  Building2,
  XCircle,
  Download,
  Eye,
} from "lucide-react";
import Image from "next/image";
import {
  VerificationResult as VerificationResultType,
  getDocumentForPDF,
} from "@/app/_actions/verification";
import {
  getRequisitionPDFBlob,
  getPurchaseOrderPDFBlob,
  getPaymentVoucherPDFBlob,
  getGrnPDFBlob,
  downloadBlob,
  type DocumentHeader,
} from "@/lib/pdf/pdf-export";
import Logo from "@/components/base/logo";

// Dynamic import to avoid SSR issues with react-pdf (uses browser-only APIs like DOMMatrix)
const PDFPreviewDialog = dynamic(
  () =>
    import("@/components/modals/pdf-preview-dialog").then(
      (mod) => mod.PDFPreviewDialog,
    ),
  { ssr: false },
);

interface VerificationResultProps {
  documentNumber: string;
  result: VerificationResultType;
}

const getDocumentTypeLabel = (type: string) => {
  switch (type) {
    case "REQUISITION":
      return "Purchase Requisition";
    case "PURCHASE_ORDER":
      return "Purchase Order";
    case "PAYMENT_VOUCHER":
      return "Payment Voucher";
    case "GRN":
      return "Goods Received Note";
    default:
      return type;
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
    case "SUBMITTED":
    case "IN_REVIEW":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "DRAFT":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

export function VerificationResult({
  documentNumber,
  result,
}: VerificationResultProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchDocumentAndGeneratePDF = async (): Promise<Blob | null> => {
    try {
      const docData = await getDocumentForPDF(documentNumber);
      if (!docData) {
        console.error("Failed to fetch document data");
        return null;
      }

      const documentHeader: DocumentHeader = {
        orgName: docData.organization?.name,
        logoUrl: docData.organization?.logoUrl,
        tagline: docData.organization?.tagline,
      };

      switch (docData.documentType) {
        case "REQUISITION":
          return getRequisitionPDFBlob(docData.document, documentHeader);
        case "PURCHASE_ORDER":
          return getPurchaseOrderPDFBlob(docData.document, documentHeader);
        case "PAYMENT_VOUCHER":
          return getPaymentVoucherPDFBlob(docData.document, documentHeader);
        case "GRN":
          return getGrnPDFBlob(docData.document, documentHeader);
        default:
          console.error(
            "Unsupported document type for PDF:",
            docData.documentType,
          );
          return null;
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  };

  const handlePreview = async () => {
    setIsLoadingPDF(true);
    try {
      const blob = await fetchDocumentAndGeneratePDF();
      if (blob) {
        setPdfBlob(blob);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error("Error previewing PDF:", error);
    } finally {
      setIsLoadingPDF(false);
    }
  };

  // Reuse the already-generated blob if available; otherwise regenerate
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = pdfBlob ?? (await fetchDocumentAndGeneratePDF());
      if (blob) {
        downloadBlob(blob, `${documentNumber}.pdf`);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClosePreview = (open: boolean) => {
    if (!open) {
      setIsPreviewOpen(false);
      setPdfBlob(null);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo isFull />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Document Verification
        </h1>
        <p className="text-muted-foreground mt-1">
          Verify the authenticity of government documents
        </p>
      </div>

      {/* Verification Card */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Verification Result</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Number Display */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              DOCUMENT NUMBER
            </p>
            <p className="font-mono text-lg font-semibold">{documentNumber}</p>
          </div>

          {/* Error State */}
          {!result.success && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-destructive mb-2">
                Verification Failed
              </h3>
              <p className="text-sm text-destructive/80">{result.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Verification Result */}
          {result.success && (
            <>
              {result.verified && result.document ? (
                <>
                  {/* Success Banner */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-800">
                          Document Verified
                        </h3>
                        <p className="text-sm text-green-700">
                          This document is authentic and exists in the Tether-ERP
                          system
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Document Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Details
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          DOCUMENT TYPE
                        </p>
                        <p className="font-medium">
                          {getDocumentTypeLabel(result.document.documentType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          STATUS
                        </p>
                        <Badge
                          variant="outline"
                          className={getStatusColor(result.document.status)}
                        >
                          {result.document.status?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {result.document.title && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          TITLE
                        </p>
                        <p className="font-medium">{result.document.title}</p>
                      </div>
                    )}

                    {result.document.department && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            DEPARTMENT
                          </p>
                          <p className="font-medium">
                            {result.document.department}
                          </p>
                        </div>
                      </div>
                    )}

                    {result.document.totalAmount && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          TOTAL AMOUNT
                        </p>
                        <p className="font-semibold text-lg">
                          {result.document.currency || "ZMW"}{" "}
                          {result.document.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            CREATED
                          </p>
                          <p className="text-sm">
                            {new Date(
                              result.document.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {(result.document.createdByName ||
                        result.document.requesterName) && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              CREATED BY
                            </p>
                            <p className="text-sm">
                              {result.document.createdByName ||
                                result.document.requesterName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {result.document.approvalStage !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          APPROVAL PROGRESS
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${
                                  ((result.document.approvalStage || 0) /
                                    (result.document.totalApprovalStages ||
                                      1)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Stage {result.document.approvalStage} of{" "}
                            {result.document.totalApprovalStages}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* PDF Actions */}
                  {[
                    "REQUISITION",
                    "PURCHASE_ORDER",
                    "PAYMENT_VOUCHER",
                    "GRN",
                  ].includes(result.document.documentType) && (
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={isLoadingPDF}
                        isLoading={isLoadingPDF}
                        loadingText="Loading..."
                      >
                        <Eye className="h-4 w-4" />
                        Preview PDF
                      </Button>
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        isLoading={isDownloading}
                        loadingText="Downloading..."
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Verification Timestamp */}
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Verified on {new Date(result.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                /* Not Found State */
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg text-red-800 mb-2">
                    Document Not Found
                  </h3>
                  <p className="text-sm text-red-700">{result.message}</p>
                  <p className="text-xs text-red-600 mt-2">
                    Please ensure the document number is correct or contact
                    support if you believe this is an error.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-8 text-xs text-muted-foreground">
        <p>Tether-ERP Document Verification System</p>
        <p className="mt-1">Powered by Tether-ERP</p>
      </div>

      {/* PDF Preview Dialog */}
      {pdfBlob && (
        <PDFPreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleClosePreview}
          pdfBlob={pdfBlob}
          fileName={`${documentNumber}.pdf`}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
