"use client";

import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Download, Eye, Pencil, Trash2, MoreVertical } from "lucide-react";
import { WorkflowDocument } from "@/types/workflow";
import { GoodsReceivedNote } from "@/types/goods-received-note";
import type { ActionButton } from "@/components/ui/action-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGRNs } from "@/hooks/use-grn-queries";

interface GrnTableProps {
  userId: string;
  userRole: string;
  refreshTrigger: number;
  onRefresh: () => void;
}

// Transform GRN to WorkflowDocument for table compatibility
function transformGRNToWorkflowDocument(grn: any): WorkflowDocument {
  return {
    id: grn.id,
    type: "goods_received_note",
    documentNumber: grn.documentNumber,
    status: grn.status?.toUpperCase() as any,
    currentStage: grn.currentStage || grn.approvalStage || 0,
    createdAt: grn.createdAt ? new Date(grn.createdAt) : new Date(),
    updatedAt: grn.updatedAt ? new Date(grn.updatedAt) : new Date(),
    metadata: {
      poNumber: grn.poNumber,
      poId: grn.metadata?.poId,
      vendorName: grn.metadata?.vendorName || "Unknown Vendor",
      amount: grn.metadata?.amount || 0,
      receivedBy: grn.receivedBy,
      receivedDate: grn.receivedDate,
      createdBy: grn.createdBy,
    },
  };
}

const GRN_EDIT_ROLES = ["admin", "finance"];

// Options dropdown component
function GrnOptionsMenu({
  grn,
  router,
  canModify,
}: {
  grn: WorkflowDocument;
  router: ReturnType<typeof useRouter>;
  canModify: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 rounded-md border border-input bg-background px-2 py-1.5 hover:bg-accent hover:text-accent-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/grn/${grn.id}`)}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        {grn.status?.toUpperCase() === "PENDING" && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/grn/${grn.id}`)}>
              <div className="mr-2 h-4 w-4 text-green-600">✓</div>
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/grn/${grn.id}`)}>
              <div className="mr-2 h-4 w-4 text-red-600">✕</div>
              Reject
            </DropdownMenuItem>
          </>
        )}
        {grn.status?.toUpperCase() !== "APPROVED" && canModify && (
          <DropdownMenuItem
            onClick={() => router.push(`/grn/${grn.id}`)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<WorkflowDocument>[] = [
  {
    accessorKey: "documentNumber",
    header: "GRN Number",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.documentNumber || "N/A"}</div>
    ),
  },
  {
    accessorKey: "metadata.poNumber",
    header: "PO Reference",
    cell: ({ row }) => (
      <div className="text-sm">
        <Link
          href={`/purchase-orders/${row.original.metadata?.poId || "#"}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.metadata?.poNumber || "N/A"}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "metadata.vendorName",
    header: "Vendor",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.metadata?.vendorName || "Unknown"}
      </div>
    ),
  },
  {
    accessorKey: "metadata.amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        K {(row.original.metadata?.amount || 0).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status || "DRAFT"} type="document" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Received Date",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "N/A"}
      </div>
    ),
  },
];

export function GrnTable({
  userId,
  userRole,
  refreshTrigger,
  onRefresh: _onRefresh,
}: GrnTableProps) {
  const router = useRouter();
  const { data: grns = [], refetch } = useGRNs(1, 50); // Get first 50 GRNs

  // Refetch when refreshTrigger changes
  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  // Transform GRN data to WorkflowDocument format for table compatibility
  const data = useMemo(() => {
    if (grns && grns.length > 0) {
      return grns.map(transformGRNToWorkflowDocument);
    }
    return [];
  }, [grns]);

  const getActions = useCallback(
    (grn: WorkflowDocument): ActionButton[] => {
      const canModify =
        grn.metadata?.createdBy === userId ||
        grn.metadata?.receivedBy === userId ||
        GRN_EDIT_ROLES.includes(userRole);
      return [
        {
          icon: <Eye className="h-3.5 w-3.5" />,
          label: "View",
          tooltip: "View Details",
          onClick: () => router.push(`/grn/${grn.id}`),
        },
        ...(grn.status?.toUpperCase() !== "APPROVED" && canModify
          ? [
              {
                icon: <Pencil className="h-3.5 w-3.5" />,
                label: "Edit",
                tooltip: "Edit GRN",
                onClick: () => router.push(`/grn/${grn.id}/edit`),
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
      renderRowActions={(grn: WorkflowDocument) => {
        const canModify =
          grn.metadata?.createdBy === userId ||
          grn.metadata?.receivedBy === userId ||
          GRN_EDIT_ROLES.includes(userRole);
        return (
          <GrnOptionsMenu grn={grn} router={router} canModify={canModify} />
        );
      }}
    />
  );
}
