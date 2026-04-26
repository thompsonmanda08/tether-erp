"use client";

import { useState } from "react";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Search, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useApprovalTasks } from "@/hooks/use-approval-workflow";
import { useDebounce } from "@/hooks/use-debounce";
import { capitalize } from "@/lib/utils";
import { QUERY_KEYS } from "@/lib/constants";
import { WorkflowActionButtons } from "@/components/workflows/workflow-action-buttons";
import {
  claimWorkflowTask,
  approveApprovalTask,
  rejectApprovalTask,
  reassignApprovalTask,
} from "@/app/_actions/workflow-approval-actions";
import { Badge } from "@/components";
import { Skeleton } from "@/components/ui/skeleton";

// Define WorkflowTask interface locally to match backend response
interface WorkflowTask {
  id: string;
  status: string;
  claimedBy?: string;
  assignedRole?: string;
  assignedUserId?: string;
  assignedTo?: string;
  stageNumber?: number;
  stageName?: string;
  claimExpiry?: string;
  entityType?: string;
  entityId?: string;
  documentType?: string;
  documentId?: string;
  documentNumber?: string;
  title?: string;
  taskType?: string;
  priority?: string;
  dueAt?: string;
  dueDate?: string;
}

export function TasksTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [paginationState, setPaginationState] = React.useState({
    page: 1,
    page_size: 10,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Debounced search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Build filters object - React Query will automatically refetch when this changes
  const apiFilters = React.useMemo(
    () => ({
      status:
        statusFilter !== "all"
          ? (statusFilter.toUpperCase() as any)
          : undefined,
      documentType:
        documentTypeFilter !== "all" ? documentTypeFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
      assignedToMe: false,
    }),
    [statusFilter, documentTypeFilter, priorityFilter]
  );

  const { data: approvalData, isLoading } = useApprovalTasks(
    apiFilters,
    paginationState.page,
    paginationState.page_size
  );

  const tasks = approvalData?.data || [];
  const paginationMeta = approvalData?.pagination;

  // Client-side filtering for search only
  const filteredTasks = React.useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(searchLower) ||
          task.documentNumber?.toLowerCase().includes(searchLower) ||
          task.stageName?.toLowerCase().includes(searchLower) ||
          task.entityType?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [tasks, debouncedSearch]);

  // Memoized handlers
  const handleClaimTask = React.useCallback(
    async (taskId: string) => {
      const response = await claimWorkflowTask(taskId);
      if (!response.success) throw new Error(response.message);
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
    },
    [queryClient]
  );

  const handleApproveTask = React.useCallback(
    async (taskId: string, data?: { signature: string; comments: string }) => {
      const response = await approveApprovalTask(taskId, {
        signature: data?.signature || "",
        comments: data?.comments || "Approved",
        stageNumber: 1,
      });
      if (!response.success) throw new Error(response.message);
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
    },
    [queryClient]
  );

  const handleRejectTask = React.useCallback(
    async (
      taskId: string,
      data?: {
        signature: string;
        comments: string;
        rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
      }
    ) => {
      const response = await rejectApprovalTask(taskId, {
        signature: data?.signature || "",
        remarks: data?.comments || "Rejected",
        rejectionType: data?.rejectionType || "reject",
      });
      if (!response.success) throw new Error(response.message);
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
    },
    [queryClient]
  );

  const handleReassignTask = React.useCallback(
    async (taskId: string, newUserId: string, reason: string) => {
      const response = await reassignApprovalTask(taskId, {
        newApproverId: newUserId,
        reason,
      });
      if (!response.success) throw new Error(response.message);
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APPROVALS.ALL],
      });
    },
    [queryClient]
  );

  const handleRefresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
  }, [queryClient]);

  const getTaskTypeLabel = React.useCallback((type: string) => {
    const labels: Record<string, string> = {
      BUDGET_APPROVAL: "Budget Approval",
      REQUISITION_APPROVAL: "Requisition Approval",
      PURCHASE_ORDER_APPROVAL: "PO Approval",
      PAYMENT_VOUCHER_APPROVAL: "Payment Approval",
      GOODS_RECEIVED_NOTE_CONFIRMATION: "GRN Confirmation",
      GOODS_RECEIVED_NOTE_APPROVAL: "GRN Confirmation",
    };
    return (
      labels[type] ||
      type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Approval"
    );
  }, []);

  const columns = React.useMemo<ColumnDef<WorkflowTask>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3"
          >
            Task Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-semibold max-w-xs capitalize">
            {row.original.title ||
              `${capitalize(row.original.entityType || row.original.documentType || "").replaceAll("_", " ")} Requires Approval`}
          </div>
        ),
      },
      {
        accessorKey: "documentNumber",
        header: "Document",
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            {row.original.documentNumber ||
              `${row.original.entityType || row.original.documentType}-${(row.original.entityId || row.original.documentId || "").slice(-3)}`}
          </div>
        ),
      },
      {
        accessorKey: "stageName",
        header: "Stage",
        cell: ({ row }) => (
          <div className="text-sm">{row.original.stageName || "Unknown"}</div>
        ),
      },
      {
        accessorKey: "taskType",
        header: "Type",
        cell: ({ row }) => (
          <div className="text-sm">
            {getTaskTypeLabel(
              row.original.taskType ||
                (
                  row.original.entityType ||
                  row.original.documentType ||
                  ""
                )?.toUpperCase() + "_APPROVAL"
            )}
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.priority?.toUpperCase() == "HIGH"
                ? "destructive"
                : row.original.priority?.toUpperCase() == "MEDIUM"
                  ? "warning"
                  : "info"
            }
            className={`px-2 py-1 rounded text-xs uppercase font-medium `}
          >
            {row.original.priority || "MEDIUM"}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.getValue("status")} type="execution" />
        ),
      },
      {
        accessorKey: "dueAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3"
          >
            Due Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const dueDate = row.original.dueAt || row.original.dueDate;
          if (!dueDate) return <div>-</div>;

          const dueDateObj = new Date(dueDate);
          const now = new Date();
          const isOverdue =
            dueDateObj < now && row.original.status?.toUpperCase() !== "APPROVED";
          return (
            <div className={isOverdue ? "text-red-600 font-semibold" : ""}>
              {dueDateObj.toLocaleDateString()}
              {isOverdue && <span className="ml-2 text-xs">Overdue</span>}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const task = row.original;

          return (
            <WorkflowActionButtons
              task={task as any}
              onClaim={handleClaimTask}
              onApprove={handleApproveTask}
              onReject={handleRejectTask}
              onReassign={handleReassignTask}
              onRefresh={handleRefresh}
              variant="table"
              showViewButton={false}
              onView={(task) => {
                const docType = (
                  task.entityType ||
                  task.documentType ||
                  ""
                ).toLowerCase();
                const docId = task.entityId || task.documentId;
                const routes: Record<string, string> = {
                  requisition: `/requisitions/${docId}`,
                  purchase_order: `/purchase-orders/${docId}`,
                  payment_voucher: `/payment-vouchers/${docId}`,
                  goods_received_note: `/grn/${docId}`,
                  budget: `/budgets/${docId}`,
                };
                const url = routes[docType || ""] || `/tasks/${task.id}`;
                router.push(url);
              }}
            />
          );
        },
      },
    ],
    [
      getTaskTypeLabel,
      handleClaimTask,
      handleApproveTask,
      handleRejectTask,
      handleReassignTask,
      handleRefresh,
      router,
    ]
  );

  const table = useReactTable({
    data: filteredTasks as WorkflowTask[],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDocumentTypeFilter("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    documentTypeFilter !== "all" ||
    priorityFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-muted/40 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters Selects */}
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={documentTypeFilter}
              onValueChange={setDocumentTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="requisition">Requisition</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="payment_voucher">Payment Voucher</SelectItem>
                <SelectItem value="goods_received_note">GRN</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredTasks.length} tasks
          {hasActiveFilters && " (filtered)"}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {paginationMeta && (
        <CustomPagination
          pagination={{
            ...paginationMeta,
            page: paginationState.page,
            page_size: paginationState.page_size,
            limit: paginationMeta.limit || paginationState.page_size,
            totalCount: paginationMeta.totalCount || paginationMeta.total || 0,
            total_pages:
              paginationMeta.total_pages || paginationMeta.totalPages || 0,
            has_next:
              paginationMeta.has_next ?? paginationMeta.hasNext ?? false,
            has_prev:
              paginationMeta.has_prev ?? paginationMeta.hasPrev ?? false,
          }}
          updatePagination={(newPagination: {
            page: number;
            page_size?: number;
          }) => {
            setPaginationState((prev) => ({
              ...prev,
              page: newPagination.page,
              page_size: newPagination.page_size || prev.page_size,
            }));
          }}
          allowSetPageSize
          showDetails
        />
      )}
    </div>
  );
}
