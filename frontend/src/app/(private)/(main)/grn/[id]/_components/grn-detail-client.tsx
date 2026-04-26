"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  FileText,
  AlertTriangle,
  AlertCircle,
  Plus,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/base/page-header";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { GRNItemsMatchingTable } from "./grn-items-matching-table";
import { QualityIssueReportDialog } from "./quality-issue-dialog";
import { useAddQualityIssueMutation } from "@/hooks/use-quality-issue-mutations";
import { useGRNDetail } from "@/hooks/use-grn-detail";
import { Badge } from "@/components";
import type { QualityIssue } from "@/types/goods-received-note";
import { GRNSubmitDialog } from "./grn-submit-dialog";

interface GRNDetailClientProps {
  grnId: string;
  userId: string;
  userRole: string;
}

export function GRNDetailClient({
  grnId,
  userId,
  userRole,
}: GRNDetailClientProps) {
  const router = useRouter();
  const [isQualityDialogOpen, setIsQualityDialogOpen] = useState(false);

  // Use the hook to manage document detail logic
  const {
    document: grn,
    isLoading,
    permissions,
    showSubmitDialog,
    setShowSubmitDialog,
    handleSubmitForApproval,
    submitMutation,
  } = useGRNDetail({
    grnId,
    userId,
    userRole,
  });

  // Mutation for adding quality issues (GRN-specific)
  const addQualityIssueMutation = useAddQualityIssueMutation(grnId);

  const handleConfirm = () => {
    toast.success("Navigating to confirmation...");
    router.push(`/grn/${grnId}/confirmation`);
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddQualityIssue = async (issue: Omit<QualityIssue, "id">) => {
    try {
      await addQualityIssueMutation.mutateAsync(issue);
      toast.success("Quality issue reported and saved");
    } catch (error) {
      console.error("Error saving quality issue:", error);
      toast.error("Failed to save quality issue");
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

  const hasQualityIssues = grn.qualityIssues.length > 0;
  const hasVariances = grn.items.some(
    (item: { variance: number }) => item.variance !== 0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={grn.documentNumber}
        subtitle="Goods Received Note"
        badges={[
          {
            status: grn.status,
            type: "document",
          },
        ]}
        onBackClick={handleBack}
        showBackButton={true}
      />

      {/* Status and Stage Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{grn.stageName}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Stage {grn.currentStage} of 2
            </p>
            <div className="flex gap-1 mt-3">
              {[1, 2].map((stage) => (
                <div
                  key={stage}
                  className={`h-2 flex-1 rounded-full ${
                    stage <= grn.currentStage ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grn.items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {
                grn.items.filter(
                  (i: { condition: string }) => i.condition === "GOOD",
                ).length
              }{" "}
              in good condition
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for Issues */}
      {(hasQualityIssues || hasVariances) && (
        <div className="space-y-2">
          {hasQualityIssues && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    Quality Issues Detected
                  </p>
                  <p className="text-sm text-yellow-800">
                    {grn.qualityIssues.length} issue(s) reported during
                    inspection
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {hasVariances && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">
                    Quantity Variances
                  </p>
                  <p className="text-sm text-orange-800">
                    Some items received differ from PO quantities
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* GRN Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GRN Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">PO Number</p>
            <p className="font-semibold">{grn.documentNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Warehouse Location</p>
            <p className="font-semibold">{grn.warehouseLocation}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Received Date</p>
            <p className="font-semibold">
              {new Date(grn.receivedDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Received By</p>
            <p className="font-semibold">{grn.receivedBy}</p>
          </div>
          {grn.approvedBy && (
            <div>
              <p className="text-sm text-muted-foreground">Approved By</p>
              <p className="font-semibold">{grn.approvedBy}</p>
            </div>
          )}
          {grn.linkedPV && (
            <div>
              <p className="text-sm text-muted-foreground">Source Payment Voucher</p>
              <p className="font-semibold font-mono">{grn.linkedPV}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Matching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items Received vs. Ordered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GRNItemsMatchingTable items={grn.items} />
        </CardContent>
      </Card>

      {/* Quality Issues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quality Issues Reported
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsQualityDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Report Issue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasQualityIssues ? (
            <div className="space-y-3">
              {grn.qualityIssues.map(
                (
                  issue: {
                    id?: string;
                    itemDescription: string;
                    issueType: string;
                    description: string;
                    severity: string;
                  },
                  index: number,
                ) => {
                  const severityColors = {
                    LOW: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    MEDIUM: "bg-orange-100 text-orange-800 border-orange-200",
                    HIGH: "bg-red-100 text-red-800 border-red-200",
                  };
                  return (
                    <div
                      key={issue.id || index}
                      className={`p-4 border rounded-lg ${severityColors[issue.severity as keyof typeof severityColors]}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {issue.itemDescription}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {issue.issueType}
                          </p>
                          <p className="text-sm mt-1">{issue.description}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No quality issues reported yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Report Issue" to add quality concerns during inspection
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {grn.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{grn.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button variant="outline" onClick={handleBack}>
          Cancel
        </Button>
        {permissions.canSubmit && (
          <Button onClick={() => setShowSubmitDialog(true)} className="gap-2">
            <Send className="h-4 w-4" />
            Submit for Approval
          </Button>
        )}
        {grn.status === "SUBMITTED" && (
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirm Receipt
          </Button>
        )}
      </div>

      {/* GRN Submit Dialog */}
      <GRNSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        grn={grn}
        onSubmit={handleSubmitForApproval}
        isSubmitting={submitMutation.isPending}
      />

      {/* Quality Issue Report Dialog */}
      <QualityIssueReportDialog
        open={isQualityDialogOpen}
        onOpenChange={setIsQualityDialogOpen}
        items={grn.items}
        onAddIssue={handleAddQualityIssue}
      />
    </div>
  );
}
