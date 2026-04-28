"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Eye, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { useBudgets } from "@/hooks/use-budget-queries";
import { Budget } from "@/types/budget";
import { QUERY_KEYS } from "@/lib/constants";

interface BudgetsTableProps {
  userRole: string;
  refreshTrigger: number;
  onBudgetAction: () => void;
  initialData?: Budget[];
}

export function BudgetsTable({
  refreshTrigger,
  initialData,
}: BudgetsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: budgetsData, isLoading, refetch } = useBudgets(initialData);
  const budgets = budgetsData ?? [];

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
    }
  }, [refreshTrigger, refetch, queryClient]);

  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        accessorKey: "budgetCode",
        header: ({ column }) => (
          <Button
            variant="light"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="-ml-3 h-8 gap-1 px-2 text-xs"
          >
            Budget Code
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{row.getValue("budgetCode")}</span>
        ),
      },
      {
        accessorKey: "department",
        header: "Department",
      },
      {
        accessorKey: "totalBudget",
        header: "Total Budget",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            K{(row.original.totalBudget || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "allocatedAmount",
        header: "Allocated",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            K{(row.original.allocatedAmount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "fiscalYear",
        header: "FY",
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
        header: "Stage",
        cell: ({ row }) => {
          const status = row.original.status;
          const stage = row.original.approvalStage;
          if (status?.toUpperCase() === "DRAFT") return "Not submitted";
          if (status?.toUpperCase() === "APPROVED") return "Completed";
          if (status?.toUpperCase() === "REJECTED") return "Rejected";
          return stage > 0 ? `Stage ${stage}` : "Pending";
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="bordered"
            onClick={() => router.push(`/budgets/${row.original.id}`)}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <DataTable<Budget, unknown>
      columns={columns}
      data={budgets}
      isLoading={isLoading}
      hideSearchBar
      onRowClick={(row) => router.push(`/budgets/${row.id}`)}
      emptyState={{
        title: "No budgets found",
        description:
          "You haven't created any budgets yet. Create your first budget to get started.",
        icon: <FolderOpen className="h-6 w-6" />,
      }}
    />
  );
}
