"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge as CentralizedStatusBadge } from "@/components/status-badge";
import { WorkflowDocument } from "@/types/workflow";
import { PurchaseOrder } from "@/types/purchase-order";
import { usePurchaseOrders } from "@/hooks/use-purchase-order-queries";
import type { ActionButton } from "@/components/ui/action-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PurchaseOrdersTableProps {
  userId: string;
  userRole: string;
  refreshTrigger: number;
  onRefresh: () => void;
}

// Transform PurchaseOrder to WorkflowDocument for table compatibility
function transformPOToWorkflowDocument(po: PurchaseOrder): WorkflowDocument {
  return {
    id: po.id,
    type: "purchase_order",
    documentNumber: po.documentNumber,
    status: po.status?.toUpperCase() as any,
    currentStage: po.approvalStage,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    metadata: {
      vendorName: po.vendorName,
      amount: po.totalAmount,
      currency: po.currency,
      deliveryDate: po.deliveryDate,
      department: po.department,
      linkedRequisition: po.linkedRequisition,
      createdBy: po.createdBy,
    },
  };
}

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
        PO Number
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("documentNumber")}</div>
    ),
  },
  {
    id: "vendor",
    accessorKey: "metadata.vendorName",
    header: "Vendor",
    cell: ({ row }) => <div>{row.original.metadata?.vendorName || "-"}</div>,
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
        K {(row.original.metadata?.amount || 0).toLocaleString()}
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
    cell: ({ row }) => {
      const status = row.original.status?.toUpperCase();
      if (status === "DRAFT" || !row.original.currentStage) {
        return <span className="text-xs text-muted-foreground">Draft</span>;
      }
      return (
        <StageIndicator
          currentStage={row.original.currentStage}
          totalStages={4}
        />
      );
    },
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
function PoOptionsMenu({
  po,
  router,
}: {
  po: WorkflowDocument;
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
          onClick={() => router.push(`/purchase-orders/${po.id}`)}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        {po.status === "IN_REVIEW" && (
          <>
            <DropdownMenuItem
              onClick={() => router.push(`/purchase-orders/${po.id}/approval`)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/purchase-orders/${po.id}/approval`)}
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

export function PurchaseOrdersTable({
  userId,
  userRole,
  refreshTrigger: _refreshTrigger,
  onRefresh: _onRefresh,
}: PurchaseOrdersTableProps) {
  const router = useRouter();
  const { data: purchaseOrders = [], refetch } = usePurchaseOrders(); // Get all purchase orders

  // Refetch when refreshTrigger changes
  useEffect(() => {
    refetch();
  }, [_refreshTrigger, refetch]);

  // Transform PurchaseOrder data to WorkflowDocument format for table compatibility
  const data = useMemo(() => {
    if (purchaseOrders && purchaseOrders.length > 0) {
      return purchaseOrders.map(transformPOToWorkflowDocument);
    }
    return [];
  }, [purchaseOrders]);

  const getActions = useCallback(
    (po: WorkflowDocument): ActionButton[] => {
      return [
        {
          icon: <Eye className="h-3.5 w-3.5" />,
          label: "View",
          tooltip: "View Details",
          onClick: () => router.push(`/purchase-orders/${po.id}`),
        },
      ];
    },
    [router],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      actions={getActions}
      hideSearchBar={false}
      renderRowActions={(po: WorkflowDocument) => (
        <PoOptionsMenu po={po} router={router} />
      )}
    />
  );
}
