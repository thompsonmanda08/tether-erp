"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/base/page-header";
import { ApprovalActionPanel } from "@/components/workflows/approval-action-panel";
import { usePaymentVoucherById } from "@/hooks/use-payment-voucher-queries";
import { useApprovalTasks } from "@/hooks/use-approval-workflow";
import type { ApprovalTask } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface PVApprovalClientProps {
  pvId: string;
  userId: string;
  userRole: string;
}

const PAYMENT_METHODS: Record<string, string> = {
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
};

export function PVApprovalClient({ pvId }: PVApprovalClientProps) {
  const router = useRouter();

  // Fetch real PV data from backend
  const { data: pv, isLoading } = usePaymentVoucherById(pvId);

  // Fetch approval tasks to find the one for this PV
  const { data: approvalData } = useApprovalTasks(
    { documentType: "PAYMENT_VOUCHER" },
    1,
    100,
  );

  const approvalTasks = approvalData?.data || [];

  // Find the approval task for this PV
  const approvalTask = approvalTasks.find(
    (task: any) => task.documentId === pvId,
  ) as ApprovalTask | undefined;

  const handleBack = () => {
    router.back();
  };

  if (isLoading || !pv) {
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
        title={pv.documentNumber}
        subtitle="Payment Voucher Approval"
        onBackClick={handleBack}
        showBackButton={true}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Payment Voucher Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Payment Voucher Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {pv.vendorName && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Name</p>
                  <p className="font-semibold">{pv.vendorName}</p>
                </div>
              )}
              {pv.invoiceNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Invoice Number
                  </p>
                  <p className="font-semibold">{pv.invoiceNumber}</p>
                </div>
              )}
              {pv.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-semibold text-sm">{pv.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(
                    pv.amount || pv.totalAmount || 0,
                    pv.currency || "ZMW",
                  )}
                </p>
              </div>
              {pv.paymentDueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Due Date
                  </p>
                  <p className="font-semibold">
                    {new Date(pv.paymentDueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Details */}
          {pv.paymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-semibold">
                    {PAYMENT_METHODS[pv.paymentMethod] || pv.paymentMethod}
                  </p>
                </div>
                {pv.bankDetails && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-semibold">{pv.bankDetails.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Account Holder
                      </p>
                      <p className="font-semibold">
                        {pv.bankDetails.accountHolder}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Account Number
                      </p>
                      <p className="font-semibold font-mono text-sm">
                        {pv.bankDetails.accountNumber}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Items if available */}
          {pv.items && pv.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left font-semibold py-3 px-4">
                          Description
                        </th>
                        <th className="text-right font-semibold py-3 px-4">
                          Quantity
                        </th>
                        <th className="text-right font-semibold py-3 px-4">
                          Unit Price
                        </th>
                        <th className="text-right font-semibold py-3 px-4">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pv.items.map((item: any, index: number) => (
                        <tr
                          key={item.id || index}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="py-3 px-4 font-medium">
                            {item.description || item.itemDescription}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.quantity || 1}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(
                              item.unitPrice || 0,
                              pv.currency || "ZMW",
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {formatCurrency(
                              item.totalPrice ||
                                (item.quantity || 1) * (item.unitPrice || 0),
                              pv.currency || "ZMW",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30">
                      <tr>
                        <td
                          colSpan={3}
                          className="py-3 px-4 font-semibold text-right"
                        >
                          Total:
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          K
                          {(pv.amount || pv.totalAmount || 0).toLocaleString(
                            "en-ZM",
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Approval Panel */}
        <div>
          {approvalTask ? (
            <ApprovalActionPanel
              task={approvalTask}
              onApprovalComplete={() => {
                toast.success("Payment voucher approved successfully");
                router.push("/payment-vouchers");
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p>
                    No pending approval task found for this payment voucher.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
