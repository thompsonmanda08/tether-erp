"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, Plus, ClipboardListIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/base/page-header";
import { usePurchaseOrders } from "@/hooks/use-purchase-order-queries";
import { useSavePaymentVoucher } from "@/hooks/use-payment-voucher-queries";
import { CreatePaymentVoucherRequest } from "@/types/payment-voucher";
import { PurchaseOrder } from "@/types/purchase-order";
import { toast } from "sonner";

interface PVCreateClientProps {
  userId: string;
  userName: string;
  userRole: string;
}

export function PVCreateClient({
  userId,
  userName,
  userRole,
}: PVCreateClientProps) {
  const router = useRouter();
  const { data: purchaseOrders, isLoading: isLoadingPOs } = usePurchaseOrders();
  const savePVMutation = useSavePaymentVoucher(() => {
    router.push("/payment-vouchers");
  });

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filter to show only APPROVED purchase orders
  const approvedPOs =
    purchaseOrders?.filter((po) => po.status?.toUpperCase() === "APPROVED") ||
    [];

  const handleSelectPO = (poId: string) => {
    const po = approvedPOs.find((p) => p.id === poId);
    setSelectedPO(po || null);
  };

  const handleCreatePV = async () => {
    if (!selectedPO) {
      toast.error("Please select a purchase order");
      return;
    }

    setIsCreating(true);
    try {
      const pvData = {
        vendorId: selectedPO.vendorId,
        invoiceNumber: selectedPO.documentNumber || "INV-" + Date.now(),
        amount: selectedPO.totalAmount || 0,
        currency: selectedPO.currency || "ZMW",
        paymentMethod: "bank_transfer",
        glCode: selectedPO.budgetCode || "GL-001",
        description:
          selectedPO.description || `Payment for ${selectedPO.documentNumber}`,
        linkedPO: selectedPO.id,
      } as unknown as CreatePaymentVoucherRequest;

      await savePVMutation.mutateAsync(pvData);
    } catch (error) {
      console.error("Error creating payment voucher:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Create Payment Voucher"
        subtitle="Create a new payment voucher from an approved purchase order"
        showBackButton={true}
      />

      {approvedPOs.length === 0 ? (
        <Card className="bg-canvas/50 border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-8 py-12">
            <div className="relative mb-4">
              <div className="bg-primary/10 absolute inset-0 rounded-full blur-2xl" />
              <div className="bg-canvas border-primary/20 relative rounded-2xl border-2 p-6">
                <ClipboardListIcon
                  className="text-primary h-16 w-16"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            <h3 className="text-foreground mb-2 text-2xl font-semibold">
              No Approved Purchase Orders
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md text-center">
              Payment vouchers are created from approved purchase orders. To
              create a payment voucher, you first need to create and approve a
              purchase order.
            </p>

            <div className="mb-8 grid w-full max-w-2xl grid-cols-3 gap-4 text-xs">
              <div className="bg-canvas border-border rounded-lg border p-4 text-center">
                <div className="text-primary mb-1 font-mono font-semibold">
                  CREATE
                </div>
                <div className="text-muted-foreground">Requisition Request</div>
              </div>
              <div className="bg-canvas border-border rounded-lg border p-4 text-center">
                <div className="text-primary mb-1 font-mono font-semibold">
                  APPROVE
                </div>
                <div className="text-muted-foreground">Purchase Order</div>
              </div>
              <div className="bg-canvas border-border rounded-lg border p-4 text-center">
                <div className="text-primary mb-1 font-mono font-semibold">
                  CREATE
                </div>
                <div className="text-muted-foreground">Payment Voucher</div>
              </div>
            </div>

            <Button size="lg" className="gap-2" asChild>
              <Link href="/purchase-orders">
                <Plus className="h-4 w-4" />
                Go to Purchase Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* PO Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Purchase Order</CardTitle>
              <CardDescription>
                Choose an approved purchase order to create a payment voucher
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Order *</label>
                <Select
                  value={selectedPO?.id || ""}
                  onValueChange={handleSelectPO}
                  disabled={isLoadingPOs}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchase order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedPOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.documentNumber} - {po.vendorName} ({po.currency}{" "}
                        {po.totalAmount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* PO Details Preview */}
          {selectedPO && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Order Details</CardTitle>
                  <CardDescription>{selectedPO.documentNumber}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                        Vendor
                      </h4>
                      <p className="text-sm">{selectedPO.vendorName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                        Department
                      </h4>
                      <p className="text-sm">{selectedPO.department}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                        Total Amount
                      </h4>
                      <p className="text-sm font-semibold">
                        {selectedPO.currency}{" "}
                        {selectedPO.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                        Status
                      </h4>
                      <Badge className="bg-green-100 text-green-800">
                        {selectedPO.status}
                      </Badge>
                    </div>
                  </div>

                  {selectedPO.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                        Description
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded">
                        {selectedPO.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    {selectedPO.items?.length || 0} items to be included in the
                    payment voucher
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.itemNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {item.description}
                              </p>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.category}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {selectedPO.currency}{" "}
                            {item.unitPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono font-semibold">
                            {selectedPO.currency}{" "}
                            {(item.totalPrice || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">
                        Total Amount
                      </p>
                      <p className="text-xl font-bold font-mono">
                        {selectedPO.currency}{" "}
                        {selectedPO.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePV}
                  disabled={
                    !selectedPO || isCreating || savePVMutation.isPending
                  }
                  className="bg-green-600 hover:bg-green-700 flex-1 gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isCreating || savePVMutation.isPending
                    ? "Creating..."
                    : "Create Payment Voucher"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isCreating || savePVMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
