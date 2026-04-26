"use client";

import { PageHeader } from "@/components/base/page-header";
import { ApprovedPurchaseOrdersTable } from "./approved-purchase-orders-table";
import { PaymentVouchersTable } from "./payment-vouchers-table";
import { Separator } from "@/components/ui/separator";

interface PaymentVouchersClientProps {
  userId: string;
  userRole: string;
}

export function PaymentVouchersClient({
  userId,
  userRole,
}: PaymentVouchersClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Payment Vouchers"
        subtitle="Create payment vouchers from approved purchase orders and manage existing PVs"
        showBackButton={false}
      />

      {/* Approved Purchase Orders Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Approved Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">
            Select a purchase order to create a payment voucher
          </p>
        </div>
        <ApprovedPurchaseOrdersTable userId={userId} userRole={userRole} />
      </div>

      <Separator className="my-8" />

      {/* Payment Vouchers Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Payment Vouchers</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all payment vouchers
          </p>
        </div>
        <PaymentVouchersTable
          userId={userId}
          userRole={userRole}
          refreshTrigger={0}
          onRefresh={() => {}}
        />
      </div>
    </div>
  );
}
