"use client";

import { useState } from "react";
import { Download, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApprovalConfirmationDialog } from "@/components/modals/approval-confirmation-dialog";
import { exportGrnPDF } from "@/lib/pdf/pdf-export";
import { useOrganizationContext } from "@/hooks/use-organization";
import { useGRNById } from "@/hooks/use-grn-queries";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import Link from "next/link";

interface GrnDetailProps {
  grnId: string;
  userId: string;
  userRole: string;
}

export function GrnDetail({ grnId, userId, userRole }: GrnDetailProps) {
  const { currentOrganization } = useOrganizationContext();

  // Fetch real GRN data from backend
  const { data: grn, isLoading, refetch } = useGRNById(grnId);

  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!grn) return;

    setIsDownloadingPDF(true);
    try {
      // Refetch latest data before export
      const { data: freshGRN } = await refetch();

      if (freshGRN) {
        await exportGrnPDF(freshGRN as any, {
          logoUrl: currentOrganization?.logoUrl,
          orgName: currentOrganization?.name,
          tagline: currentOrganization?.tagline,
        });
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleApproveSubmit = async (data: any) => {
    try {
      await refetch();
      setShowApprovalDialog(false);
    } catch (error) {
      console.error("Error approving GRN:", error);
    }
  };

  if (isLoading) return <DocumentLoadingPage />;

  if (!grn)
    return (
      <ErrorDisplay
        title="GRN Not Found"
        message="The goods received note you're looking for doesn't exist."
      />
    );

  const canApprove = grn.status === "SUBMITTED";
  const statusVariant =
    grn.status === "APPROVED"
      ? "default"
      : grn.status === "REJECTED"
        ? "destructive"
        : grn.status === "SUBMITTED"
          ? "secondary"
          : "outline";

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/grn">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to GRNs
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{grn.documentNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Received on{" "}
              {grn.receivedDate
                ? new Date(grn.receivedDate).toLocaleDateString()
                : grn.createdAt
                  ? new Date(grn.createdAt).toLocaleDateString()
                  : "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant}>{grn.status}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="gap-2"
            isLoading={isDownloadingPDF}
            loadingText="Generating..."
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - GRN Details (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Order Reference */}
          {grn.poDocumentNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-4 rounded border border-blue-200">
                  <div>
                    <p className="text-sm text-muted-foreground">PO Number</p>
                    <p className="font-medium">{grn.poDocumentNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goods Received Details */}
          <Card>
            <CardHeader>
              <CardTitle>Goods Received Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <div>
                  <p className="text-sm text-muted-foreground">Received Date</p>
                  <p className="font-medium">
                    {grn.receivedDate
                      ? new Date(grn.receivedDate).toLocaleDateString()
                      : grn.createdAt
                        ? new Date(grn.createdAt).toLocaleDateString()
                        : "Unknown"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Warehouse Location
                </p>
                <p className="font-medium">{grn.warehouseLocation || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received By</p>
                <p className="font-medium">{grn.receivedBy || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          {grn.items && grn.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items Received</CardTitle>
                <CardDescription>
                  {grn.items.length} items received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Description</th>
                        <th className="text-right py-2 px-2">PO Qty</th>
                        <th className="text-right py-2 px-2">Received Qty</th>
                        <th className="text-right py-2 px-2">Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grn.items.map((item: any) => (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-3 px-2">
                            {item.description || item.itemDescription}
                          </td>
                          <td className="text-right py-3 px-2">
                            {item.poQuantity || item.quantity}
                          </td>
                          <td className="text-right py-3 px-2">
                            <span
                              className={
                                item.receivedQuantity ===
                                (item.poQuantity || item.quantity)
                                  ? "text-green-600 font-medium"
                                  : "text-orange-600 font-medium"
                              }
                            >
                              {item.receivedQuantity}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2">
                            <Badge
                              variant={
                                item.condition === "GOOD"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {item.condition || "GOOD"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality Issues */}
          {grn.qualityIssues && grn.qualityIssues.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle>Quality Issues</CardTitle>
                <CardDescription>
                  {grn.qualityIssues.length} issue(s) reported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {grn.qualityIssues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="p-3 bg-white dark:bg-gray-900 rounded border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{issue.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Item: {issue.itemId}
                          </p>
                        </div>
                        <Badge
                          variant={
                            issue.severity === "HIGH"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Status & Actions (1/3 width) */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm text-muted-foreground">Document Status</p>
                <Badge
                  variant={statusVariant}
                  className="w-full justify-center py-2"
                >
                  {grn.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Approval Actions */}
          {canApprove && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-green-900 dark:text-green-100">
                  Your Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  This GRN is waiting for your approval.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={() => setShowApprovalDialog(true)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve with Signature
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">
                      {grn.createdAt
                        ? new Date(grn.createdAt).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-xs text-muted-foreground">
                      {grn.updatedAt
                        ? new Date(grn.updatedAt).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Dialog */}
      <ApprovalConfirmationDialog
        open={showApprovalDialog}
        documentId={grn.id}
        documentType="GRN"
        documentNumber={grn.documentNumber}
        vendor=""
        amount=""
        stageNumber={grn.currentStage || 1}
        totalStages={1}
        stageName="Warehouse Manager"
        onApprove={handleApproveSubmit}
        onCancel={() => setShowApprovalDialog(false)}
      />
    </div>
  );
}
