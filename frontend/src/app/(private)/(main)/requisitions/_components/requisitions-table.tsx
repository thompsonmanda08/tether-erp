"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Send,
  PlusCircle,
  FileText,
  Undo2,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Requisition } from "@/types/requisition";
import { useRequisitions } from "@/hooks/use-requisition-queries";
import { useWithdrawRequisition } from "@/hooks/use-requisition-mutations";
import { useApprovalWorkflowStatus } from "@/hooks/use-approval-history";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { formatCurrency } from "@/lib/utils";

import { RequisitionFilters } from "./requisitions-filters";

interface RequisitionsTableProps {
  userId: string;
  userRole: string;
  refreshTrigger: number;
  onEditRequisition: (requisition: Requisition) => void;
  onCreateRequisition: () => void;
  filters?: RequisitionFilters;
  initialData?: Requisition[];
}

const columns: ColumnDef<Requisition>[] = [
  {
    accessorKey: "documentNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3"
      >
        Document Number
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-semibold uppercase">
        {row.original.documentNumber || row.original.id}
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="max-w-[200px] truncate capitalize font-medium cursor-help">
            {row.original.title || "-"}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{row.original.title || "No title"}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {row.original.description.substring(0, 100)}
              {row.original.description.length > 100 ? "..." : ""}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    ),
  },
  // {
  //   accessorKey: 'requesterName',
  //   header: 'Requested By',
  //   cell: ({ row }) => (
  //     <div>{row.original.requesterName || '-'}</div>
  //   ),
  // },
  // {
  //   accessorKey: 'requestedFor',
  //   header: 'Requested For',
  //   cell: ({ row }) => (
  //     <div className="text-sm text-muted-foreground">
  //       {row.original.requestedFor || '-'}
  //     </div>
  //   ),
  // },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => (
      <div className="font-medium capitalize">
        {row.original.department || "-"}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.original.priority?.toLowerCase();
      const priorityColors = {
        urgent: "bg-red-100 text-red-800 border-red-200",
        high: "bg-orange-100 text-orange-800 border-orange-200",
        medium: "bg-blue-100 text-blue-800 border-blue-200",
        low: "bg-gray-100 text-gray-800 border-gray-200",
      };

      return (
        <span
          className={`inline-flex capitalize items-center px-2 py-1 rounded-full text-xs font-medium border ${
            priorityColors[priority as keyof typeof priorityColors] ||
            priorityColors.medium
          }`}
        >
          {row.original.priority || "Medium"}
        </span>
      );
    },
  },
  {
    id: "itemsCount",
    header: "Items",
    cell: ({ row }) => {
      const itemsCount = row.original.items?.length || 0;
      return (
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-foreground/5 rounded-full">
            {itemsCount}
          </span>
        </div>
      );
    },
  },
  {
    id: "totalAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3"
      >
        Estimated Cost
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.totalAmount;
      return (
        <div className="font-medium">
          {amount ? formatCurrency(amount, row.original.currency) : "-"}
        </div>
      );
    },
  },
  // {
  //   accessorKey: 'budgetCode',
  //   header: 'Budget Code',
  //   cell: ({ row }) => (
  //     <div className="text-sm font-mono">
  //       {row.original.budgetCode || '-'}
  //     </div>
  //   ),
  // },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} type="document" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3"
      >
        Dates
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const createdDate = new Date(row.original.createdAt);

      const requiredByDate = row.original.requiredByDate
        ? new Date(row.original.requiredByDate)
        : null;
      const now = new Date();
      const isOverdue =
        requiredByDate &&
        requiredByDate < now &&
        row.original.status?.toUpperCase() !== "COMPLETED";
      const isUrgent =
        requiredByDate &&
        requiredByDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

      return (
        <div className="space-y-0.5">
          <div className="text-sm text-muted-foreground">
            {createdDate.toLocaleDateString()}
          </div>
          {requiredByDate && (
            <div
              className={`text-xs ${
                isOverdue
                  ? "text-red-600 font-medium"
                  : isUrgent
                    ? "text-orange-600"
                    : "text-muted-foreground/70"
              }`}
            >
              Due: {requiredByDate.toLocaleDateString()}
              {isOverdue && <span className="ml-1">(Overdue)</span>}
            </div>
          )}
        </div>
      );
    },
  },
];

// Options dropdown component
function ReqOptionsMenu({
  req,
  router,
  onEditRequisition,
  userId,
  userRole,
  onRefresh,
}: {
  req: Requisition;
  router: ReturnType<typeof useRouter>;
  onEditRequisition: (requisition: Requisition) => void;
  userId: string;
  userRole: string;
  onRefresh: () => void;
}) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const withdrawMutation = useWithdrawRequisition(onRefresh);
  const { data: workflowStatus } = useApprovalWorkflowStatus(req.id);

  const handleWithdraw = async () => {
    try {
      await withdrawMutation.mutateAsync(req.id);
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Withdraw error:", error);
    }
  };

  const reqStatus = req.status?.toUpperCase();
  const canSubmit = reqStatus === "DRAFT" && req.requesterId === userId;
  const canWithdraw = reqStatus === "PENDING" && req.requesterId === userId;
  const canEdit = reqStatus === "DRAFT" && req.requesterId === userId;
  const canApprove = workflowStatus?.canApprove && reqStatus === "PENDING";
  const canReject = workflowStatus?.canReject && reqStatus === "PENDING";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"outline"}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => router.push(`/requisitions/${req.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem onClick={() => onEditRequisition(req)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Requisition
            </DropdownMenuItem>
          )}

          {canSubmit && (
            <DropdownMenuItem
              onClick={() => router.push(`/requisitions/${req.id}`)}
            >
              <Send className="mr-2 h-4 w-4 text-blue-600" />
              Submit for Approval
            </DropdownMenuItem>
          )}

          {canWithdraw && (
            <DropdownMenuItem
              onClick={() => setShowWithdrawModal(true)}
              className="text-amber-600 focus:text-amber-600"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Withdraw
            </DropdownMenuItem>
          )}

          {canApprove && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/requisitions/${req.id}?tab=approvals`)
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Approve
            </DropdownMenuItem>
          )}

          {canReject && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/requisitions/${req.id}?tab=approvals`)
              }
            >
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Reject
            </DropdownMenuItem>
          )}

          {reqStatus === "DRAFT" && req.requesterId === userId && (
            <DropdownMenuItem
              onClick={() => router.push(`/requisitions/${req.id}`)}
              className="text-red-600 focus:text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}

          {/* Show additional info */}
          {req.categoryName && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
              Category: {req.categoryName}
            </div>
          )}
          {req.otherCategoryText && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Custom: {req.otherCategoryText}
            </div>
          )}

          {/* Show workflow status */}
          {workflowStatus && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
              Workflow: Stage {workflowStatus.currentStage}/
              {workflowStatus.totalStages}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Withdraw Confirmation Modal */}
      <ConfirmationModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        onConfirm={handleWithdraw}
        type="withdraw"
        title="Withdraw Requisition"
        description={`Are you sure you want to withdraw requisition ${req.documentNumber || req.id}? It will be reverted to draft status and you can edit and re-submit it later.`}
        isLoading={withdrawMutation.isPending}
      />
    </>
  );
}

export function RequisitionsTable({
  userId,
  userRole,
  refreshTrigger,
  onEditRequisition,
  onCreateRequisition,
  filters = {},
  initialData,
}: RequisitionsTableProps) {
  const router = useRouter();
  const {
    data: requisitions = [],
    isLoading,
    refetch,
  } = useRequisitions(
    1,
    100,
    filters.status
      ? { status: filters.status, department: filters.department }
      : undefined,
    initialData,
  );

  // Refetch when refreshTrigger changes
  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  // Apply client-side filters
  const filteredData = useMemo(() => {
    if (!requisitions || requisitions.length === 0) return [];

    let filtered = [...requisitions];

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.documentNumber?.toLowerCase().includes(searchLower) ||
          req.title?.toLowerCase().includes(searchLower) ||
          req.requesterName?.toLowerCase().includes(searchLower),
      );
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(
        (req) =>
          req.priority?.toLowerCase() === filters.priority?.toLowerCase(),
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (req) => new Date(req.createdAt) >= filters.startDate!,
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (req) => new Date(req.createdAt) <= filters.endDate!,
      );
    }

    return filtered;
  }, [requisitions, filters]);

  return (
    <DataTable
      columns={columns}
      data={filteredData}
      isLoading={isLoading}
      emptyState={{
        title: "No Requisitions Found",
        description:
          filters.status || filters.department || filters.searchTerm
            ? "No requisitions match your current filters. Try adjusting your search criteria."
            : "Get started by creating your first requisition",
        icon: <FileText className="h-10 w-10 text-muted-foreground" />,
        action: (
          <Button onClick={onCreateRequisition}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Requisition
          </Button>
        ),
      }}
      renderRowActions={(req: Requisition) => (
        <>
          <ReqOptionsMenu
            req={req}
            router={router}
            onEditRequisition={onEditRequisition}
            userId={userId}
            userRole={userRole}
            onRefresh={refetch}
          />
        </>
      )}
    />
  );
}
