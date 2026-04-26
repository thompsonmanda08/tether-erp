"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Download, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/base/page-header";
import { DocumentLoadingPage } from "@/components/base/document-loading-page";
import ErrorDisplay from "@/components/base/error-display";
import { RequisitionItemsList } from "@/app/(private)/(main)/requisitions/_components/requisition-items-list";
import { POItemsEditor } from "../../_components/po-items-editor";
import { PDFPreviewDialog } from "@/components/modals/pdf-preview-dialog";
import { usePurchaseOrderDetail } from "@/hooks/use-purchase-order-detail";

interface PODetailClientProps {
  poId: string;
  userId: string;
  userRole: string;
}

export function PODetailClient({
  poId,
  userId,
  userRole,
}: PODetailClientProps) {
  const router = useRouter();
  const [editingItems, setEditingItems] = useState(false);

  // Use the hook to manage all document detail logic
  const {
    document: po,
    isLoading,
    isExporting,
    previewOpen,
    setPreviewOpen,
    previewBlob,
    handlePreviewPDF,
    handleExportPDF,
    permissions,
  } = usePurchaseOrderDetail({
    poId,
    userId,
    userRole,
  });

  const handleApprove = () => {
    router.push(`/purchase-orders/${poId}/approval`);
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) return <DocumentLoadingPage />;

  if (!po)
    return (
      <ErrorDisplay
        title="Purchase Order Not Found"
        message="The purchase order you're looking for doesn't exist."
      />
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={po.documentNumber}
          subtitle="Purchase Order Details"
          badges={[
            {
              status: po.status,
              type: "document",
            },
          ]}
          onBackClick={handleBack}
          showBackButton={true}
        />
        <div className="flex gap-2 mt-2">
          <Button
            onClick={handlePreviewPDF}
            disabled={isExporting}
            variant="outline"
            className="gap-2 h-11"
            isLoading={isExporting}
            loadingText="Loading..."
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="gap-2 h-11"
            isLoading={isExporting}
            loadingText="Exporting..."
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Vendor Information */}
      {(po.vendor || po.vendorName) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Vendor Name</p>
              <p className="font-semibold">
                {po.vendor?.name || po.vendorName}
              </p>
            </div>
            {po.vendor?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-blue-600">{po.vendor.email}</p>
              </div>
            )}
            {po.vendor?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{po.vendor.phone}</p>
              </div>
            )}
            {po.vendor?.city && po.vendor?.country && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">
                  {po.vendor.city}, {po.vendor.country}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PO Details and Total Amount (unified card) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Purchase Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Created Date</p>
                <p className="font-semibold">
                  {new Date(po.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-semibold">
                  {new Date(po.deliveryDate).toLocaleDateString()}
                </p>
              </div>
              {po.department && (
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-semibold">{po.department}</p>
                </div>
              )}
              {po.priority && (
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-semibold capitalize">{po.priority}</p>
                </div>
              )}
            </div>

            <div className="border-l border-muted/30 pl-4 md:pl-8">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">
                K{po.totalAmount?.toLocaleString("en-ZM") || "0"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {po.items?.length || 0} item{po.items?.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              PO Items {po.items?.length ? `(${po.items.length})` : ""}
            </CardTitle>
            {permissions.canEdit && !editingItems && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItems(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {po.items?.length ? "Edit Items" : "Add Items"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingItems ? (
            <POItemsEditor
              poId={poId}
              items={(po.items ?? []).map((item, index) => ({
                id: item.id || `item-${index}`,
                description: item.description || item.itemCode || "",
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                amount: item.totalPrice || item.amount || 0,
                totalPrice: item.totalPrice || item.amount || 0,
                unit: item.unit,
                category: item.category,
                notes: item.notes,
              }))}
              currency={po.currency || "ZMW"}
              onSaved={() => setEditingItems(false)}
              onCancel={() => setEditingItems(false)}
            />
          ) : po.items && po.items.length > 0 ? (
            <RequisitionItemsList
              items={po.items.map((item, index) => ({
                id: item.id || `item-${index}`,
                description: item.description || item.itemCode || "—",
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                amount: item.totalPrice || item.amount || 0,
                totalPrice: item.totalPrice || item.amount || 0,
                unit: item.unit || "unit",
                category: item.category,
                notes: item.notes,
              }))}
              currency={po.currency || "K"}
              isEstimate={false}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No items added yet.
              {permissions.canEdit && (
                <button
                  className="ml-1 text-primary underline"
                  onClick={() => setEditingItems(true)}
                >
                  Add items
                </button>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        {po.status?.toUpperCase() === "PENDING" && (
          <Button
            onClick={handleApprove}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Review & Approve
          </Button>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {previewBlob && (
        <PDFPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          pdfBlob={previewBlob}
          fileName={`Purchase Order: ${po.documentNumber}`}
          onDownload={handleExportPDF}
        />
      )}
    </div>
  );
}
