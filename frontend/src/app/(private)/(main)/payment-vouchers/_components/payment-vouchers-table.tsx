"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Download,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge as CentralizedStatusBadge } from "@/components/status-badge";
import { usePaymentVouchers } from "@/hooks/use-payment-voucher-queries";
import { WorkflowDocument } from "@/types/workflow";
import { PaymentVoucher } from "@/types/payment-voucher";
import type { ActionButton } from "@/components/ui/action-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaymentVouchersTableProps {
  userId: string;
  userRole: string;
  refreshTrigger: number;
  onRefresh: () => void;
}

// Transform PaymentVoucher to WorkflowDocument for table compatibility
function transformPVToWorkflowDocument(pv: PaymentVoucher): WorkflowDocument {
  return {
    id: pv.id,
    type: "payment_voucher",
    documentNumber: pv.documentNumber,
    status: pv.status?.toUpperCase() as any,
    currentStage: pv.approvalStage,
    createdAt: pv.createdAt,
    updatedAt: pv.updatedAt,
    metadata: {
      vendorName: pv.vendorName,
      amount: pv.amount,
      currency: pv.currency,
      invoiceNumber: pv.invoiceNumber,
      paymentMethod: pv.paymentMethod,
      glCode: pv.glCode,
      createdBy: pv.createdBy,
    },
  };
}

const FINANCE_EDIT_ROLES = ["admin", "finance"];

// Stage indicator
function StageIndicator({
  currentStage,
  totalStages,
}: {
  currentStage: number;
  totalStages: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium">{currentStage}</span>
      <span className="text-xs text-muted-foreground">of {totalStages}</span>
    </div>
  );
}

// Columns definition
const columns: ColumnDef<WorkflowDocument>[] = [
  {
    id: "documentNumber",
    accessorKey: "documentNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Voucher No.
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("documentNumber")}</div>
    ),
  },
  {
    id: "vendor",
    accessorKey: "metadata.payeeName",
    header: "Payee",
    cell: ({ row }) => <div>{row.original.metadata?.payeeName || "-"}</div>,
  },
  {
    id: "amount",
    accessorKey: "metadata.amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.metadata?.currency || "ZMW"}{" "}
        {(row.original.metadata?.amount || 0).toLocaleString()}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <CentralizedStatusBadge status={row.getValue("status")} type="document" />
    ),
  },
  {
    id: "stage",
    accessorKey: "currentStage",
    header: "Stage",
    cell: ({ row }) => (
      <StageIndicator
        currentStage={row.original.currentStage || 1}
        totalStages={3}
      />
    ),
  },
  {
    id: "createdDate",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "N/A"}
      </div>
    ),
  },
];

// Options dropdown component
function PvOptionsMenu({
  pv,
  router,
}: {
  pv: WorkflowDocument;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 rounded-md border border-input bg-background px-2 py-1.5 hover:bg-accent hover:text-accent-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/payment-vouchers/${pv.id}`)}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        {pv.status === "IN_REVIEW" && (
          <>
            <DropdownMenuItem
              onClick={() => router.push(`/payment-vouchers/${pv.id}/approval`)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/payment-vouchers/${pv.id}/approval`)}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Reject
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PaymentVouchersTable({
  userId,
  userRole,
  refreshTrigger,
  onRefresh: _onRefresh,
}: PaymentVouchersTableProps) {
  const router = useRouter();
  const { data: paymentVouchers = [], refetch } = usePaymentVouchers(); // Get payment vouchers

  // Refetch when refreshTrigger changes
  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  // Transform PaymentVoucher data to WorkflowDocument format for table compatibility
  const data = useMemo(() => {
    if (paymentVouchers && paymentVouchers.length > 0) {
      return paymentVouchers.map(transformPVToWorkflowDocument);
    }
    return [];
  }, [paymentVouchers]);

  const getActions = useCallback(
    (pv: WorkflowDocument): ActionButton[] => {
      const canEdit =
        pv.metadata?.createdBy === userId ||
        FINANCE_EDIT_ROLES.includes(userRole);
      return [
        {
          icon: <Eye className="h-3.5 w-3.5" />,
          label: "View",
          tooltip: "View Details",
          onClick: () => router.push(`/payment-vouchers/${pv.id}`),
        },
        ...(canEdit
          ? [
              {
                icon: <Pencil className="h-3.5 w-3.5" />,
                label: "Edit",
                tooltip: "Edit Voucher",
                onClick: () => router.push(`/payment-vouchers/${pv.id}/edit`),
              },
            ]
          : []),
      ];
    },
    [router, userId, userRole],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      actions={getActions}
      hideSearchBar={false}
      renderRowActions={(pv: WorkflowDocument) => (
        <PvOptionsMenu pv={pv} router={router} />
      )}
    />
  );
}
