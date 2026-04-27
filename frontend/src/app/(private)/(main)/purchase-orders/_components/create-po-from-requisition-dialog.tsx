"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Requisition } from "@/types/requisition";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowDownUp,
  AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkflowSelector } from "@/components/workflows/workflow-selector";
import { useConfigurationStatus } from "@/hooks/use-configuration-status";
import { ConfigurationChecklistBanner } from "@/components/ui/configuration-checklist-banner";
import { useVendors } from "@/hooks/use-vendor-queries";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Quotation } from "@/types/core";

interface CreatePOFromRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: Requisition;
  onConfirm: (
    workflowId: string,
    vendorId?: string,
    vendorName?: string,
    procurementFlow?: "" | "goods_first" | "payment_first",
  ) => Promise<void>;
  isCreating: boolean;
}

export function CreatePOFromRequisitionDialog({
  open,
  onOpenChange,
  requisition,
  onConfirm,
  isCreating,
}: CreatePOFromRequisitionDialogProps) {
  const [workflowId, setWorkflowId] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState(
    requisition.vendorId ?? "",
  );
  const [selectedVendorName, setSelectedVendorName] = useState(
    requisition.vendorName ?? "",
  );
  const [procurementFlow, setProcurementFlow] = useState<
    "" | "goods_first" | "payment_first"
  >("");

  const { data: vendors = [] } = useVendors();
  const reqQuotations: Quotation[] =
    (requisition.metadata?.quotations as Quotation[]) ?? [];

  // Check configuration status
  const configStatus = useConfigurationStatus({
    includeWorkflow: true,
    workflowEntityType: "purchase_order",
  });

  const canCreate =
    workflowId &&
    requisition.status?.toUpperCase() === "APPROVED" &&
    configStatus.allConfigured;

  const handleConfirm = async () => {
    // Validate workflow selection
    if (!workflowId) {
      setWorkflowError("Please select a workflow");
      return;
    }

    if (!canCreate) return;

    setWorkflowError(null);
    await onConfirm(
      workflowId,
      selectedVendorId || undefined,
      selectedVendorName || undefined,
      procurementFlow,
    );
    setWorkflowId("");
    setSelectedVendorId(requisition.vendorId ?? "");
    setSelectedVendorName(requisition.vendorName ?? "");
    setProcurementFlow("");
  };

  const handleClose = () => {
    if (!isCreating) {
      setWorkflowId("");
      setWorkflowError(null);
      setSelectedVendorId(requisition.vendorId ?? "");
      setSelectedVendorName(requisition.vendorName ?? "");
      setProcurementFlow("");
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-5xl! max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Select an approval workflow for the new purchase order. The PO will
            be created from the approved requisition below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Checklist Banner */}
          {!configStatus.allConfigured && (
            <ConfigurationChecklistBanner
              requirements={configStatus.requirements}
              title="Configuration Required"
              description="Complete the following configurations before creating a purchase order:"
            />
          )}

          {/* Workflow Selector */}
          <WorkflowSelector
            entityType="purchase_order"
            value={workflowId}
            onChange={setWorkflowId}
            disabled={isCreating}
            required
            error={workflowError || undefined}
            showDetails={true}
          />

          {/* Vendor / Quotation Selector */}
          {reqQuotations.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select Supplier from Quotations
              </Label>
              <p className="text-xs text-muted-foreground">
                {reqQuotations.length} quotation
                {reqQuotations.length !== 1 ? "s" : ""} collected on this
                requisition.
              </p>
              <div className="space-y-2">
                {reqQuotations.map((q, i) => {
                  const isSelected = selectedVendorId
                    ? selectedVendorId === q.vendorId
                    : selectedVendorName === q.vendorName;
                  return (
                    <button
                      key={`${q.vendorId}-${i}`}
                      type="button"
                      disabled={isCreating}
                      onClick={() => {
                        setSelectedVendorId(q.vendorId || "");
                        setSelectedVendorName(q.vendorName);
                      }}
                      className={`w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {q.vendorName}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {q.currency || requisition.currency}{" "}
                        {q.amount.toLocaleString("en-ZM", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!selectedVendorName && (
                <p className="text-xs text-amber-600">
                  Select a supplier above or leave blank to assign later.
                </p>
              )}
            </div>
          ) : (
            <>
              <Alert className="border-amber-200 bg-amber-50 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  No quotations on this requisition yet — select a vendor
                  manually or add quotations first.
                </AlertDescription>
              </Alert>
              <SelectField
                label="Vendor"
                placeholder="No vendor (optional)"
                value={selectedVendorId}
                onValueChange={handleVendorChange}
                isDisabled={isCreating}
                options={vendors
                  .filter((v) => v.active)
                  .map((v) => ({
                    value: v.id,
                    name: v.name,
                  }))}
              />
            </>
          )}

          {/* Procurement Flow Override */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <ArrowDownUp className="h-4 w-4" />
              Procurement Flow
            </Label>
            <p className="text-xs text-muted-foreground">
              Override the organization default for this purchase order only.
            </p>
            <RadioGroup
              value={procurementFlow}
              onValueChange={(v) =>
                setProcurementFlow(v as "" | "goods_first" | "payment_first")
              }
              disabled={isCreating}
              className="space-y-2"
            >
              <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem
                  value=""
                  id="po-flow-default"
                  className="mt-0.5"
                />
                <Label htmlFor="po-flow-default" className="cursor-pointer">
                  <span className="font-medium text-sm">
                    Use organization default
                  </span>
                  <p className="text-xs text-muted-foreground font-normal">
                    Follow the workspace-level procurement flow setting
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem
                  value="goods_first"
                  id="po-flow-goods"
                  className="mt-0.5"
                />
                <Label htmlFor="po-flow-goods" className="cursor-pointer">
                  <span className="font-medium text-sm">Goods-First</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    GRN must be approved before payment can be processed
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem
                  value="payment_first"
                  id="po-flow-payment"
                  className="mt-0.5"
                />
                <Label htmlFor="po-flow-payment" className="cursor-pointer">
                  <span className="font-medium text-sm">Payment-First</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    Payment is processed upfront; GRN confirms delivery later
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Requisition Summary */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Source Requisition</h4>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                Approved
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Document Number:</span>
              <span className="text-sm font-mono">
                {requisition.documentNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Title:</span>
              <span className="text-sm">{requisition.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{requisition.department}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-mono text-blue-600">
                {requisition.currency}{" "}
                {requisition.totalAmount?.toLocaleString("en-ZM", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Items:</span>
              <span className="text-sm">
                {requisition.items?.length || 0} item
                {requisition.items?.length !== 1 ? "s" : ""}
              </span>
            </div>

            {requisition.vendorName && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Preferred Vendor:</span>
                <span className="text-sm">{requisition.vendorName}</span>
              </div>
            )}
          </div>

          {/* Info Alert */}
          {canCreate && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                A new purchase order will be created with the selected workflow.
                The PO will be in draft status and can be edited before
                submission. Suppliers can be attached now or later from the
                purchase order record.
              </AlertDescription>
            </Alert>
          )}

          {requisition.status?.toUpperCase() !== "APPROVED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only approved requisitions can be converted to purchase orders.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <DialogFooter className="sticky bottom-0 z-50 bg-card/5 backdrop-blur-xs border-t py-4 sm:py-4 flex flex-col-reverse justify-end gap-3 p-4 sm:flex-row rounded-b-lg">
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
            <FileText className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
