/**
 * Custom hook for DataTable state management
 *
 * This hook provides common state management patterns for the DataTable component,
 * making it even more reusable and easier to implement.
 */

import { useState, useMemo, useEffect } from "react";
import {
  RowSelectionState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

export interface UseDataTableProps {
  initialPageSize?: number;
  initialPage?: number;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

export interface UseDataTableReturn {
  // Pagination state
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handlePaginationChange: (page: number, pageSize: number) => void;

  // Selection state
  rowSelection: RowSelectionState;
  setRowSelection: (
    selection:
      | RowSelectionState
      | ((old: RowSelectionState) => RowSelectionState),
  ) => void;
  selectedRowIds: string[];
  selectedRowCount: number;
  clearSelection: () => void;

  // Sorting state
  sorting: SortingState;
  setSorting: (
    sorting: SortingState | ((old: SortingState) => SortingState),
  ) => void;

  // Filtering state
  columnFilters: ColumnFiltersState;
  setColumnFilters: (
    filters:
      | ColumnFiltersState
      | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;

  // Visibility state
  columnVisibility: VisibilityState;
  setColumnVisibility: (
    visibility: VisibilityState | ((old: VisibilityState) => VisibilityState),
  ) => void;

  // Reset functions
  resetPagination: () => void;
  resetFilters: () => void;
  resetAll: () => void;
}

export function useDataTable({
  initialPageSize = 10,
  initialPage = 1,
  enableSelection = false,
  enableSorting = true,
  enableFiltering = true,
}: UseDataTableProps = {}): UseDataTableReturn {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filtering state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Derived values
  const selectedRowIds = useMemo(
    () => Object.keys(rowSelection),
    [rowSelection],
  );
  const selectedRowCount = selectedRowIds.length;

  // Handlers
  const handlePaginationChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
  };

  const clearSelection = () => {
    setRowSelection({});
  };

  const resetPagination = () => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
  };

  const resetFilters = () => {
    setColumnFilters([]);
    setGlobalFilter("");
  };

  const resetAll = () => {
    resetPagination();
    resetFilters();
    clearSelection();
    setSorting([]);
    setColumnVisibility({});
  };

  return {
    // Pagination
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    handlePaginationChange,

    // Selection
    rowSelection,
    setRowSelection,
    selectedRowIds,
    selectedRowCount,
    clearSelection,

    // Sorting
    sorting,
    setSorting,

    // Filtering
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,

    // Visibility
    columnVisibility,
    setColumnVisibility,

    // Reset functions
    resetPagination,
    resetFilters,
    resetAll,
  };
}

// Additional utility hooks for common patterns

/**
 * Hook for server-side data table management
 */
export function useServerDataTable<T = any>({
  fetchData,
  initialPageSize = 10,
  enableSelection = false,
}: {
  fetchData: (params: {
    page: number;
    pageSize: number;
    search?: string;
    sort?: SortingState;
    filters?: ColumnFiltersState;
  }) => Promise<{ data: T[]; total: number; totalPages: number }>;
  initialPageSize?: number;
  enableSelection?: boolean;
}) {
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tableState = useDataTable({ initialPageSize, enableSelection });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchData({
        page: tableState.currentPage,
        pageSize: tableState.pageSize,
        search: tableState.globalFilter,
        sort: tableState.sorting,
        filters: tableState.columnFilters,
      });

      setData(result.data);
      setTotalCount(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [
    tableState.currentPage,
    tableState.pageSize,
    tableState.globalFilter,
    tableState.sorting,
    tableState.columnFilters,
  ]);

  return {
    ...tableState,
    data,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: loadData,
  };
}

/**
 * Hook for bulk operations
 */
export function useBulkOperations<T = any>(
  selectedRowIds: string[],
  data: T[],
  getRowId: (row: T) => string = (row: any) => row.id,
) {
  const selectedRows = useMemo(() => {
    return data.filter((row) => selectedRowIds.includes(getRowId(row)));
  }, [selectedRowIds, data, getRowId]);

  const bulkDelete = async (
    deleteFunction: (ids: string[]) => Promise<void>,
  ) => {
    if (selectedRowIds.length === 0) return;
    await deleteFunction(selectedRowIds);
  };

  const bulkUpdate = async (
    updateFunction: (ids: string[], updates: Partial<T>) => Promise<void>,
    updates: Partial<T>,
  ) => {
    if (selectedRowIds.length === 0) return;
    await updateFunction(selectedRowIds, updates);
  };

  const bulkExport = (exportFunction: (rows: T[]) => void) => {
    if (selectedRows.length === 0) return;
    exportFunction(selectedRows);
  };

  return {
    selectedRows,
    selectedCount: selectedRowIds.length,
    bulkDelete,
    bulkUpdate,
    bulkExport,
    hasSelection: selectedRowIds.length > 0,
  };
}
