"use client";

import { PageHeader } from "@/components/base/page-header";
import { ApprovedRequisitionsTable } from "./approved-requisitions-table";
import { PurchaseOrdersTable } from "./purchase-orders-table";
import { Separator } from "@/components/ui/separator";

interface PurchaseOrdersClientProps {
  userId: string;
  userRole: string;
}

export function PurchaseOrdersClient({
  userId,
  userRole,
}: PurchaseOrdersClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Purchase Orders"
        subtitle="Create purchase orders from approved requisitions and manage existing POs"
        showBackButton={false}
      />

      {/* Approved Requisitions Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Approved Requisitions</h2>
          <p className="text-sm text-muted-foreground">
            Select a requisition to create a purchase order
          </p>
        </div>
        <ApprovedRequisitionsTable userId={userId} userRole={userRole} />
      </div>

      <Separator className="my-8" />

      {/* Purchase Orders Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all purchase orders
          </p>
        </div>
        <PurchaseOrdersTable
          userId={userId}
          userRole={userRole}
          refreshTrigger={0}
          onRefresh={() => {}}
        />
      </div>
    </div>
  );
}
