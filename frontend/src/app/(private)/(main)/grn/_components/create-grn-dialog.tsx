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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Package, AlertCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganizationSettingsQuery } from "@/hooks/use-organization-queries";
import { useSession } from "@/hooks/use-session";
import { usePurchaseOrders } from "@/hooks/use-purchase-order-queries";
import { usePaymentVouchers } from "@/hooks/use-payment-voucher-queries";
import { createGRNAction } from "@/app/_actions/grn-actions";
import type { GRNItem } from "@/types/goods-received-note";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PaymentVoucher } from "@/types/payment-voucher";
import { formatCurrency } from "@/lib/utils";

interface CreateGRNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ItemRow extends GRNItem {
  _key: string;
}

function buildItemsFromPOItems(poItems: PurchaseOrder["items"]): ItemRow[] {
  return (poItems ?? []).map((item, i) => ({
    _key: `item-${i}`,
    description: item.description,
    quantityOrdered: item.quantity,
    quantityReceived: item.quantity,
    variance: 0,
    condition: "good",
    notes: "",
  }));
}

export function CreateGRNDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGRNDialogProps) {
  const { user } = useSession();
  const { data: orgSettings } = useOrganizationSettingsQuery();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: paymentVouchers = [] } = usePaymentVouchers();

  const [selectedPOId, setSelectedPOId] = useState("");
  const [selectedPVDocNumber, setSelectedPVDocNumber] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const orgFlow = orgSettings?.procurementFlow ?? "goods_first";

  // Approved POs for goods_first mode
  const approvedPOs = useMemo(
    () =>
      (purchaseOrders as PurchaseOrder[]).filter(
        (po) => po.status?.toUpperCase() === "APPROVED",
      ),
    [purchaseOrders],
  );

  // Approved / paid PVs for payment_first mode (only PVs linked to a PO)
  const approvedPVs = useMemo(
    () =>
      (paymentVouchers as PaymentVoucher[]).filter(
        (pv) =>
          (pv.status?.toUpperCase() === "APPROVED" ||
            pv.status?.toUpperCase() === "PAID") &&
          pv.linkedPO,
      ),
    [paymentVouchers],
  );

  const selectedPO = useMemo(
    () => approvedPOs.find((po) => po.id === selectedPOId),
    [approvedPOs, selectedPOId],
  );

  const selectedPV = useMemo(
    () => approvedPVs.find((pv) => pv.documentNumber === selectedPVDocNumber),
    [approvedPVs, selectedPVDocNumber],
  );

  // For payment_first, find the PO linked to the selected PV
  const pvLinkedPO = useMemo(() => {
    if (!selectedPV) return undefined;
    return (purchaseOrders as PurchaseOrder[]).find(
      (po) => po.documentNumber === selectedPV.linkedPO,
    );
  }, [selectedPV, purchaseOrders]);

  // The effective PO for item population
  const effectivePO = orgFlow === "payment_first" ? pvLinkedPO : selectedPO;

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const po = approvedPOs.find((p) => p.id === poId);
    if (po) {
      setItems(buildItemsFromPOItems(po.items));
    } else {
      setItems([]);
    }
  };

  const handlePVSelect = (pvDocNumber: string) => {
    setSelectedPVDocNumber(pvDocNumber);
    const pv = approvedPVs.find((p) => p.documentNumber === pvDocNumber);
    if (pv) {
      const linkedPO = (purchaseOrders as PurchaseOrder[]).find(
        (po) => po.documentNumber === pv.linkedPO,
      );
      setItems(buildItemsFromPOItems(linkedPO?.items ?? []));
    } else {
      setItems([]);
    }
  };

  const updateItem = (
    key: string,
    field: keyof GRNItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantityReceived" || field === "quantityOrdered") {
          updated.variance =
            Number(updated.quantityReceived) - Number(updated.quantityOrdered);
        }
        return updated;
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _key: `item-${Date.now()}`,
        description: "",
        quantityOrdered: 0,
        quantityReceived: 0,
        variance: 0,
        condition: "good",
        notes: "",
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i._key !== key));
  };

  const poDocumentNumber =
    orgFlow === "payment_first"
      ? (pvLinkedPO?.documentNumber ?? "")
      : (selectedPO?.documentNumber ?? "");

  const canCreate =
    poDocumentNumber !== "" &&
    items.length > 0 &&
    items.every((i) => i.description.trim() !== "") &&
    (orgFlow === "goods_first" || selectedPVDocNumber !== "");

  const handleCreate = async () => {
    if (!canCreate || !user) return;

    setIsCreating(true);
    try {
      const grnItems: GRNItem[] = items.map(({ _key: _, ...item }) => item);
      const response = await createGRNAction(
        poDocumentNumber,
        grnItems,
        user.id,
        warehouseLocation,
        notes,
        orgFlow === "payment_first" ? selectedPVDocNumber : undefined,
      );

      if (response.success) {
        toast.success("GRN created successfully");
        handleClose();
        onSuccess?.();
      } else {
        toast.error(response.message || "Failed to create GRN");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create GRN");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setSelectedPOId("");
      setSelectedPVDocNumber("");
      setItems([]);
      setWarehouseLocation("");
      setNotes("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Goods Received Note
          </DialogTitle>
          <DialogDescription>
            Record goods received against a purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Flow indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Procurement flow:</span>
            <Badge
              variant={orgFlow === "goods_first" ? "default" : "secondary"}
            >
              {orgFlow === "goods_first" ? "Goods-First" : "Payment-First"}
            </Badge>
          </div>

          {/* Source document selector */}
          {orgFlow === "goods_first" ? (
            <div className="space-y-1.5">
              <Label htmlFor="po-select">
                Purchase Order <span className="text-destructive">*</span>
              </Label>
              {approvedPOs.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No approved purchase orders available.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedPOId}
                  onValueChange={handlePOSelect}
                  disabled={isCreating}
                >
                  <SelectTrigger id="po-select">
                    <SelectValue placeholder="Select approved PO" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedPOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.documentNumber} — {po.title || po.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedPO && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span>{selectedPO.vendorName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{selectedPO.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(
                        selectedPO.totalAmount,
                        selectedPO.currency,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="pv-select">
                Payment Voucher (approved / paid){" "}
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Payment-first flow: select the PV that funded this delivery.
              </p>
              {approvedPVs.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No approved or paid payment vouchers available.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedPVDocNumber}
                  onValueChange={handlePVSelect}
                  disabled={isCreating}
                >
                  <SelectTrigger id="pv-select">
                    <SelectValue placeholder="Select approved / paid PV" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedPVs.map((pv) => (
                      <SelectItem key={pv.id} value={pv.documentNumber}>
                        {pv.documentNumber} — PO: {pv.linkedPO} ({pv.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedPV && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Linked PO:</span>
                    <span className="font-mono">{selectedPV.linkedPO}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span>{selectedPV.vendorName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(selectedPV.amount, selectedPV.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Receipt details */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Warehouse Location"
              id="warehouse-location"
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              placeholder="e.g. Warehouse A, Bay 3"
              disabled={isCreating}
            />
            <Input
              label="Notes"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              disabled={isCreating}
            />
          </div>

          <Separator />

          {/* Items */}
          {effectivePO || items.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Items <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={isCreating}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                  No items. Add items manually or select a PO above.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_80px_80px_100px_auto] gap-2 text-xs text-muted-foreground px-1">
                    <span>Description</span>
                    <span>Ordered</span>
                    <span>Received</span>
                    <span>Condition</span>
                    <span />
                  </div>
                  {items.map((item) => (
                    <div
                      key={item._key}
                      className="grid grid-cols-[1fr_80px_80px_100px_auto] gap-2 items-center"
                    >
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item._key, "description", e.target.value)
                        }
                        placeholder="Item description"
                        disabled={isCreating}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        value={String(item.quantityOrdered ?? "")}
                        onChange={(e) =>
                          updateItem(
                            item._key,
                            "quantityOrdered",
                            Number(e.target.value),
                          )
                        }
                        disabled={isCreating}
                        className="text-sm"
                        min={0}
                      />
                      <Input
                        type="number"
                        value={String(item.quantityReceived ?? "")}
                        onChange={(e) =>
                          updateItem(
                            item._key,
                            "quantityReceived",
                            Number(e.target.value),
                          )
                        }
                        disabled={isCreating}
                        className="text-sm"
                        min={0}
                      />
                      <Select
                        value={item.condition}
                        onValueChange={(v) =>
                          updateItem(item._key, "condition", v)
                        }
                        disabled={isCreating}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="missing">Missing</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item._key)}
                        disabled={isCreating}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

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
            onClick={handleCreate}
            disabled={isCreating || !canCreate}
            isLoading={isCreating}
            loadingText="Creating..."
          >
            <Package className="mr-2 h-4 w-4" />
            Create GRN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
