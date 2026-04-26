"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrders } from "@/app/_actions/purchase-orders";
import { PurchaseOrder } from "@/types/purchase-order";
import { QUERY_KEYS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CreatePVFromPODialog } from "./create-pv-from-po-dialog";
import { createPaymentVoucherFromPurchaseOrder } from "@/app/_actions/payment-vouchers";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ApprovedPurchaseOrdersTableProps {
  userId: string;
  userRole: string;
}

export function ApprovedPurchaseOrdersTable({
  userId,
  userRole,
}: ApprovedPurchaseOrdersTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit] = useState(5); // Default 5 items per page
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch approved purchase orders
  const {
    data: purchaseOrders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS.ALL, page, limit, "approved"],
    queryFn: async () => {
      const response = await getPurchaseOrders(page, limit, {
        status: "APPROVED",
      });
      return response.success ? response.data || [] : [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleCreatePV = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsCreateDialogOpen(true);
  };

  const handleConfirmCreate = async (
    workflowId: string,
    vendorId?: string,
    vendorName?: string,
    linkedGRNDocumentNumber?: string,
  ) => {
    if (!selectedPO) return;

    setIsCreating(true);
    try {
      const response = await createPaymentVoucherFromPurchaseOrder(
        selectedPO,
        workflowId,
        vendorId,
        vendorName,
        linkedGRNDocumentNumber,
      );

      if (response.success && response.data) {
        toast.success("Payment Voucher created successfully");
        setIsCreateDialogOpen(false);
        setSelectedPO(null);

        // Navigate to the new PV detail page
        router.push(`/payment-vouchers/${response.data.id}`);
      } else {
        toast.error(response.message || "Failed to create Payment Voucher");
      }
    } catch (error) {
      console.error("Error creating PV:", error);
      toast.error("An error occurred while creating the Payment Voucher");
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewPO = (poId: string) => {
    router.push(`/purchase-orders/${poId}`);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (purchaseOrders.length === limit) {
      setPage(page + 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">
            Loading approved purchase orders...
          </span>
        </div>
      </Card>
    );
  }

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Approved Purchase Orders
          </h3>
          <p className="text-muted-foreground mb-4">
            There are no approved purchase orders available to convert to
            payment vouchers.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/purchase-orders")}
          >
            View All Purchase Orders
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                Approved Purchase Orders
              </h3>
              <p className="text-sm text-muted-foreground">
                Select a purchase order to create a payment voucher
              </p>
            </div>
            <Badge variant="secondary">
              {purchaseOrders.length} purchase order
              {purchaseOrders.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">
                      {po.documentNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {po.vendorName}
                    </TableCell>
                    <TableCell>{po.department}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(po.totalAmount, po.currency)}
                    </TableCell>
                    <TableCell>{po.items?.length || 0}</TableCell>
                    <TableCell className="text-sm">
                      {po.updatedAt
                        ? new Date(po.updatedAt).toLocaleDateString("en-ZM", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPO(po.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCreatePV(po)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Create PV
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} • Showing {purchaseOrders.length} of{" "}
              {purchaseOrders.length} purchase orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={purchaseOrders.length < limit}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Create PV Dialog */}
      {selectedPO && (
        <CreatePVFromPODialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          purchaseOrder={selectedPO}
          onConfirm={handleConfirmCreate}
          isCreating={isCreating}
        />
      )}
    </>
  );
}
