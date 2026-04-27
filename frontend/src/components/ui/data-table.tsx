"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
  RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
import { ArrowLeft, ClipboardXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { CustomPagination } from "./custom-pagination";
import { ActionButtons, type ActionButton } from "./action-buttons";
import { cn } from "@/lib/utils";

// Enhanced interfaces for better reusability
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Search functionality
  searchKey?: string;
  searchPlaceholder?: string;
  hideSearchBar?: boolean;

  // Actions
  actions?: (row: TData) => ActionButton[];
  renderRowActions?: (row: TData) => React.ReactNode;

  // Pagination
  hidePagination?: boolean;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
  onPaginationChange?: (page: number, pageSize: number) => void;

  // Selection
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (
    updaterOrValue:
      | RowSelectionState
      | ((old: RowSelectionState) => RowSelectionState),
  ) => void;

  // Visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (
    updaterOrValue:
      | VisibilityState
      | ((old: VisibilityState) => VisibilityState),
  ) => void;

  // Empty state customization
  emptyState?: {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };

  // Loading state
  isLoading?: boolean;
  loadingRows?: number;

  // Styling
  className?: string;
  tableClassName?: string;

  // Row interactions
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;

  // Advanced features
  enableSorting?: boolean;
  enableFiltering?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
}

// Loading skeleton component
const LoadingSkeleton = ({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <TableCell key={colIndex}>
            <div className="h-4 bg-muted animate-pulse rounded" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  actions,
  renderRowActions,
  hideSearchBar = false,
  hidePagination = false,
  totalCount,
  currentPage = 1,
  pageSize = 10,
  totalPages,
  onPaginationChange,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  emptyState,
  isLoading = false,
  loadingRows = 5,
  className,
  tableClassName,
  onRowClick,
  getRowId,
  enableSorting = true,
  enableFiltering = true,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});

  const router = useRouter();

  // Use controlled or internal state for row selection
  const currentRowSelection = rowSelection ?? internalRowSelection;
  const handleRowSelectionChange =
    onRowSelectionChange ?? setInternalRowSelection;

  // Use controlled or internal state for column visibility
  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  // Add actions column if actions or renderRowActions are provided
  const finalColumns = React.useMemo(() => {
    const cols = [...columns];

    // Add selection column if enabled
    if (enableRowSelection) {
      cols.unshift({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded border border-input"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            className="rounded border border-input"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      } as ColumnDef<TData, TValue>);
    }

    // Add actions column if provided
    if (actions || renderRowActions) {
      cols.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end max-w-max ml-auto gap-2">
            {actions && (
              <ActionButtons actions={actions(row.original)} align="end" />
            )}
            {renderRowActions && renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      } as ColumnDef<TData, TValue>);
    }

    return cols;
  }, [columns, actions, renderRowActions, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    onRowSelectionChange: handleRowSelectionChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: {
      sorting,
      columnFilters,
      rowSelection: currentRowSelection,
      columnVisibility: currentColumnVisibility,
    },
    enableSorting,
    enableColumnFilters: enableFiltering,
    manualPagination,
    manualSorting,
    manualFiltering,
  });

  // Default empty state
  const defaultEmptyState = {
    title: "No Results",
    description: "There is nothing to show here yet",
    icon: <ClipboardXIcon />,
    action: (
      <Button onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    ),
  };

  const currentEmptyState = { ...defaultEmptyState, ...emptyState };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {searchKey && !hideSearchBar && (
        <div className="flex items-center justify-between">
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          {/* Selection info */}
          {enableRowSelection &&
            Object.keys(currentRowSelection).length > 0 && (
              <div className="text-sm text-muted-foreground">
                {Object.keys(currentRowSelection).length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected
              </div>
            )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingSkeleton
                rows={loadingRows}
                columns={finalColumns.length}
              />
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined
                  }
                  onClick={() => onRowClick?.(row.original)}
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
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-24 text-center"
                >
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        {currentEmptyState.icon}
                      </EmptyMedia>
                      <EmptyTitle>{currentEmptyState.title}</EmptyTitle>
                      <EmptyDescription>
                        {currentEmptyState.description}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>{currentEmptyState.action}</EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!hidePagination && !isLoading && (
        <CustomPagination
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: totalCount ?? data.length,
            totalPages:
              totalPages ?? Math.ceil((totalCount ?? data.length) / pageSize),
            hasNext:
              currentPage <
              (totalPages ?? Math.ceil((totalCount ?? data.length) / pageSize)),
            hasPrev: currentPage > 1,
            page_size: pageSize,
            totalCount: totalCount ?? data.length,
            total_pages:
              totalPages ?? Math.ceil((totalCount ?? data.length) / pageSize),
            has_next:
              currentPage <
              (totalPages ?? Math.ceil((totalCount ?? data.length) / pageSize)),
            has_prev: currentPage > 1,
          }}
          updatePagination={({ page, page_size }) => {
            if (onPaginationChange) {
              onPaginationChange(page, page_size || pageSize);
            }
          }}
          allowSetPageSize={true}
          showDetails={true}
        />
      )}
    </div>
  );
}

// Export types for external use
export type { ActionButton } from "./action-buttons";
