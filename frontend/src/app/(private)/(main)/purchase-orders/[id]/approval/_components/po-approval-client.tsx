"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/base/page-header";
import { ApprovalActionPanel } from "@/components/workflows/approval-action-panel";
import { POItemsTable } from "./po-items-table";
import { usePurchaseOrderById } from "@/hooks/use-purchase-order-queries";
import { useApprovalTasks } from "@/hooks/use-approval-workflow";
import type { ApprovalTask } from "@/types";
import type { PurchaseOrder } from "@/types/purchase-order";

interface POApprovalClientProps {
  poId: string;
  userId: string;
  userRole: string;
}

export function POApprovalClient({
  poId,
  userId,
  userRole,
}: POApprovalClientProps) {
  const router = useRouter();

  // Fetch real PO data from backend
  const { data: po, isLoading } = usePurchaseOrderById(poId);

  // Fetch approval tasks to find the one for this PO
  const { data: approvalData } = useApprovalTasks(
    { documentType: "PURCHASE_ORDER" },
    1,
    100
  );

  const approvalTasks = approvalData?.data || [];

  // Find the approval task for this PO
  const approvalTask = approvalTasks.find(
    (task: any) => task.documentId === poId
  ) as ApprovalTask | undefined;

  const handleBack = () => {
    router.back();
  };

  if (isLoading || !po) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.documentNumber}
        subtitle="Purchase Order Approval"
        onBackClick={handleBack}
        showBackButton={true}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Vendor Name</p>
                <p className="font-semibold">{po.vendor?.name || po.vendorName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-semibold">{po.vendor?.contactPerson || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-blue-600">{po.vendor?.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{po.vendor?.phone || "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <POItemsTable items={po.items} />
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">
                    K
                    {(po.subtotal || po.totalAmount || 0).toLocaleString(
                      "en-ZM"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (10%):</span>
                  <span className="font-semibold">
                    K{(po.tax || 0).toLocaleString("en-ZM")}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-green-600">
                    K{(po.total || po.totalAmount || 0).toLocaleString("en-ZM")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Panel */}
        <div>
          {approvalTask ? (
            <ApprovalActionPanel
              task={approvalTask}
              onApprovalComplete={() => {
                toast.success("Purchase order approved successfully");
                router.push("/purchase-orders");
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p>No pending approval task found for this purchase order.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
