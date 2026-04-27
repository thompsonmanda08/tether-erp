"use client";

import { useMemo, useEffect } from "react";
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
import { ArrowUpDown, Eye, FolderOpen } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useBudgets } from "@/hooks/use-budget-queries";
import { Budget } from "@/types/budget";
import { QUERY_KEYS } from "@/lib/constants";

const COLUMN_COUNT = 8; // matches the number of columns in the table

function BudgetsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border">
        {/* Header */}
        <div className="grid grid-cols-8 gap-4 p-4 border-b">
          {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-8 gap-4 p-4 border-b last:border-b-0"
          >
            {Array.from({ length: COLUMN_COUNT }).map((_, col) => (
              <div
                key={col}
                className="h-4 bg-muted rounded animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        <div className="flex space-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface BudgetsTableProps {
  userRole: string;
  refreshTrigger: number;
  onBudgetAction: () => void;
  initialData?: Budget[];
}

export function BudgetsTable({
  userRole,
  refreshTrigger,
  onBudgetAction,
  initialData,
}: BudgetsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: budgetsData,
    isLoading,
    refetch,
  } = useBudgets(initialData);

  // Defensive: queryFn should always return [], but guard against null
  const budgets = budgetsData ?? [];

  // Refetch when refreshTrigger changes (after budget creation)
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
    }
  }, [refreshTrigger, refetch, queryClient]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const columns: ColumnDef<Budget>[] = [
    {
      accessorKey: "budgetCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Budget Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-semibold">{row.getValue("budgetCode")}</div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <div>{row.getValue("department")}</div>,
    },
    {
      accessorKey: "totalBudget",
      header: "Total Budget",
      cell: ({ row }) => (
        <div className="font-medium">
          K{(row.original.totalBudget || 0).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "allocatedAmount",
      header: "Allocated Amount",
      cell: ({ row }) => (
        <div className="font-medium">
          K{(row.original.allocatedAmount || 0).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "fiscalYear",
      header: "Fiscal Year",
      cell: ({ row }) => <div>{row.getValue("fiscalYear")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} type="document" />
      ),
    },
    {
      accessorKey: "approvalStage",
      header: "Approval Stage",
      cell: ({ row }) => {
        const status = row.original.status;
        const stage = row.original.approvalStage;

        return (
          <div className="text-sm">
            {status?.toUpperCase() === "DRAFT"
              ? "Not submitted"
              : status?.toUpperCase() === "APPROVED"
                ? "Completed"
                : status?.toUpperCase() === "REJECTED"
                  ? "Rejected"
                  : stage > 0
                    ? `Stage ${stage}`
                    : "Pending"}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/budgets/${row.original.id}`)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: budgets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  // Derive pagination directly from table state
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();

  const paginationData = useMemo(
    () => ({
      page: pageIndex + 1,
      limit: pageSize,
      total: totalRows,
      totalPages,
      hasNext: pageIndex + 1 < totalPages,
      hasPrev: pageIndex > 0,
      page_size: pageSize,
      total_pages: totalPages,
      totalCount: totalRows,
      has_next: pageIndex + 1 < totalPages,
      has_prev: pageIndex > 0,
    }),
    [pageIndex, pageSize, totalRows, totalPages],
  );

  if (isLoading) {
    return <BudgetsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 p-0">
                  <Empty className="border-0">
                    <EmptyContent>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FolderOpen />
                        </EmptyMedia>
                        <EmptyTitle>
                          {isLoading
                            ? "Loading budgets..."
                            : "No budgets found"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {isLoading
                            ? "Please wait while we fetch your budgets."
                            : "You haven't created any budgets yet. Create your first budget to get started."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <CustomPagination
        pagination={paginationData}
        updatePagination={(newPagination) => {
          table.setPageIndex((newPagination.page ?? 1) - 1);
          if (newPagination.page_size) {
            table.setPageSize(newPagination.page_size);
          }
        }}
        allowSetPageSize
        showDetails
      />
    </div>
  );
}
