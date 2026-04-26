"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PurchaseOrder } from "@/types/purchase-order";
import { FileText, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { useConfigurationStatus } from "@/hooks/use-configuration-status";
import { ConfigurationChecklistBanner } from "@/components/ui/configuration-checklist-banner";
import { useVendors } from "@/hooks/use-vendor-queries";
import { useGRNs } from "@/hooks/use-grn-queries";
import { useOrganizationSettingsQuery } from "@/hooks/use-organization-queries";
import { formatCurrency } from "@/lib/utils";

interface CreatePVFromPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  onConfirm: (
    workflowId: string,
    vendorId?: string,
    vendorName?: string,
    linkedGRNDocumentNumber?: string,
  ) => Promise<void>;
  isCreating: boolean;
}

export function CreatePVFromPODialog({
  open,
  onOpenChange,
  purchaseOrder,
  onConfirm,
  isCreating,
}: CreatePVFromPODialogProps) {
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState(
    purchaseOrder.vendorId ?? "",
  );
  const [selectedVendorName, setSelectedVendorName] = useState(
    purchaseOrder.vendorName ?? "",
  );
  const [selectedGRNDocNumber, setSelectedGRNDocNumber] = useState("");

  const { data: vendors = [] } = useVendors();
  const { data: orgSettings } = useOrganizationSettingsQuery();

  // Resolve effective procurement flow: PO override → org default → "goods_first"
  const effectiveFlow = useMemo(() => {
    if (purchaseOrder.procurementFlow) {
      return purchaseOrder.procurementFlow;
    }
    return orgSettings?.procurementFlow ?? "goods_first";
  }, [purchaseOrder.procurementFlow, orgSettings?.procurementFlow]);

  const isGoodsFirst = effectiveFlow === "goods_first";

  // Fetch approved GRNs for this PO (only needed for goods_first)
  const { data: grns = [] } = useGRNs(1, 50, {
    status: "APPROVED",
    poDocumentNumber: purchaseOrder.documentNumber,
  });

  // Check configuration status
  const configStatus = useConfigurationStatus({
    includeWorkflow: true,
    workflowEntityType: "payment_voucher",
  });

  const canCreate =
    workflowId &&
    purchaseOrder.status?.toUpperCase() === "APPROVED" &&
    configStatus.allConfigured &&
    (!isGoodsFirst || selectedGRNDocNumber !== "");

  const handleConfirm = async () => {
    if (!workflowId) {
      setWorkflowError("Please select a workflow");
      return;
    }

    if (isGoodsFirst && !selectedGRNDocNumber) {
      return; // GRN selection is enforced by canCreate
    }

    if (!canCreate) return;

    setWorkflowError(null);
    await onConfirm(
      workflowId,
      selectedVendorId || undefined,
      selectedVendorName || undefined,
      isGoodsFirst ? selectedGRNDocNumber : undefined,
    );
    setWorkflowId("");
    setSelectedVendorId(purchaseOrder.vendorId ?? "");
    setSelectedVendorName(purchaseOrder.vendorName ?? "");
    setSelectedGRNDocNumber("");
  };

  const handleClose = () => {
    if (!isCreating) {
      setWorkflowId("");
      setWorkflowError(null);
      setSelectedVendorId(purchaseOrder.vendorId ?? "");
      setSelectedVendorName(purchaseOrder.vendorName ?? "");
      setSelectedGRNDocNumber("");
      onOpenChange(false);
    }
  };

  const handleVendorChange = (value: string) => {
    setSelectedVendorId(value);
    if (value === "") {
      setSelectedVendorName("");
    } else {
      const vendor = vendors.find((v) => v.id === value);
      setSelectedVendorName(vendor?.name ?? "");
    }
  };

  const selectedGRN = grns.find(
    (g) => g.documentNumber === selectedGRNDocNumber,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Payment Voucher
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow for the new payment voucher. The PV will
            be created from the approved purchase order below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration Checklist Banner */}
          {!configStatus.allConfigured && (
            <ConfigurationChecklistBanner
              requirements={configStatus.requirements}
              title="Configuration Required"
              description="Complete the following configurations before creating a payment voucher:"
            />
          )}

          {/* Flow indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Procurement flow:</span>
            <Badge variant={isGoodsFirst ? "default" : "secondary"}>
              {isGoodsFirst ? "Goods-First" : "Payment-First"}
            </Badge>
            {purchaseOrder.procurementFlow && (
              <span className="text-xs text-muted-foreground">
                (PO override)
              </span>
            )}
          </div>

          {/* Workflow Selector */}
          <WorkflowSelector
            entityType="payment_voucher"
            value={workflowId}
            onChange={setWorkflowId}
            disabled={isCreating}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          {/* Vendor Selector (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="vendor-select">Vendor</Label>
            <Select
              value={selectedVendorId}
              onValueChange={handleVendorChange}
              disabled={isCreating}
            >
              <SelectTrigger id="vendor-select">
                <SelectValue placeholder="No vendor (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No vendor</SelectItem>
                {vendors
                  .filter((v) => v.active)
                  .map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* GRN Selector — required for goods_first flow */}
          {isGoodsFirst && (
            <div className="space-y-1.5">
              <Label htmlFor="grn-select" className="flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                Linked GRN <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Goods-first flow requires an approved GRN for this PO before
                payment can be processed.
              </p>
              {grns.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No approved GRNs found for PO {purchaseOrder.documentNumber}
                    . Goods must be received and the GRN approved before
                    creating a payment voucher.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedGRNDocNumber}
                  onValueChange={setSelectedGRNDocNumber}
                  disabled={isCreating}
                >
                  <SelectTrigger id="grn-select">
                    <SelectValue placeholder="Select approved GRN" />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn.id} value={grn.documentNumber}>
                        {grn.documentNumber} — received{" "}
                        {new Date(grn.receivedDate).toLocaleDateString("en-ZM")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedGRN && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Received by:</span>
                    <span>{selectedGRN.receivedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{selectedGRN.items?.length ?? 0}</span>
                  </div>
                  {selectedGRN.warehouseLocation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedGRN.warehouseLocation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Purchase Order Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Source Purchase Order</h4>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                Approved
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">PO Number:</span>
              <span className="text-sm font-mono">
                {purchaseOrder.documentNumber}
              </span>
            </div>
            {purchaseOrder.vendorName && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">PO Vendor:</span>
                <span className="text-sm">{purchaseOrder.vendorName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{purchaseOrder.department}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-mono text-blue-600">
                {formatCurrency(
                  purchaseOrder.totalAmount,
                  purchaseOrder.currency,
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items:</span>
              <span className="text-sm">
                {purchaseOrder.items?.length || 0} item
                {purchaseOrder.items?.length !== 1 ? "s" : ""}
              </span>
            </div>

            {purchaseOrder.deliveryDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Delivery Date:</span>
                <span className="text-sm">
                  {new Date(purchaseOrder.deliveryDate).toLocaleDateString(
                    "en-ZM",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Info Alert */}
          {canCreate && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                A new payment voucher will be created with the selected
                workflow. The PV will be in draft status and can be edited
                before submission.
              </AlertDescription>
            </Alert>
          )}

          {purchaseOrder.status?.toUpperCase() !== "APPROVED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only approved purchase orders can be converted to payment
                vouchers.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating || !canCreate}
            isLoading={isCreating}
            loadingText="Creating..."
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Payment Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
