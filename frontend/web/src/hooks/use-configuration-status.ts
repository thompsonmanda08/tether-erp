"use client";

import { useMemo } from "react";
import { useCategories } from "./use-category-queries";
import { useAllBudgets } from "./use-budget-queries";
import { useActiveDepartments } from "./use-department-queries";
import { useWorkflows } from "./use-workflow-queries";

export interface ConfigurationRequirement {
  id: string;
  label: string;
  description: string;
  isConfigured: boolean;
  count?: number;
  navigateTo?: string;
  isLoading?: boolean;
}

export interface ConfigurationStatus {
  requirements: ConfigurationRequirement[];
  allConfigured: boolean;
  missingCount: number;
  isLoading: boolean;
}

interface UseConfigurationStatusOptions {
  includeWorkflow?: boolean;
  workflowEntityType?:
    | "requisition"
    | "budget"
    | "purchase_order"
    | "payment_voucher"
    | "grn";
  excludeBudgets?: boolean; // Exclude budget requirement (for budget creation)
}

/**
 * Hook to check if required configurations are set up
 * Used to display configuration checklist banners
 */
export function useConfigurationStatus(
  options: UseConfigurationStatusOptions = {},
): ConfigurationStatus {
  const {
    includeWorkflow = false,
    workflowEntityType = "requisition",
    excludeBudgets = false,
  } = options;

  // Fetch configuration data
  const { data: departments = [], isLoading: departmentsLoading } =
    useActiveDepartments();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(
    1,
    50,
    true,
  );
  const { data: budgets = [], isLoading: budgetsLoading } = useAllBudgets();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows({
    filter: includeWorkflow
      ? { entityType: workflowEntityType, isActive: true }
      : undefined,
  });

  const requirements = useMemo<ConfigurationRequirement[]>(() => {
    const reqs: ConfigurationRequirement[] = [
      {
        id: "departments",
        label: "Departments",
        description: "At least one active department must be configured",
        isConfigured: Array.isArray(departments) && departments.length > 0,
        count: Array.isArray(departments) ? departments.length : 0,
        navigateTo: "/admin/departments",
        isLoading: departmentsLoading,
      },
      {
        id: "categories",
        label: "Categories",
        description: "At least one active category must be configured",
        isConfigured: Array.isArray(categories) && categories.length > 0,
        count: Array.isArray(categories) ? categories.length : 0,
        navigateTo: "/admin/categories",
        isLoading: categoriesLoading,
      },
    ];

    // Only include budget requirement if not excluded
    if (!excludeBudgets) {
      reqs.push({
        id: "budgets",
        label: "Budget Codes",
        description: "At least one budget must be configured",
        isConfigured: Array.isArray(budgets) && budgets.length > 0,
        count: Array.isArray(budgets) ? budgets.length : 0,
        navigateTo: "/budgets",
        isLoading: budgetsLoading,
      });
    }

    // Conditionally add workflow requirement
    if (includeWorkflow) {
      reqs.push({
        id: "workflows",
        label: `${workflowEntityType.charAt(0).toUpperCase() + workflowEntityType.slice(1)} Workflow`,
        description: `At least one active workflow for ${workflowEntityType} must be configured to submit for approval`,
        isConfigured: Array.isArray(workflows) && workflows.length > 0,
        count: Array.isArray(workflows) ? workflows.length : 0,
        navigateTo: "/admin/workflows",
        isLoading: workflowsLoading,
      });
    }

    return reqs;
  }, [
    departments,
    categories,
    budgets,
    workflows,
    departmentsLoading,
    categoriesLoading,
    budgetsLoading,
    workflowsLoading,
    includeWorkflow,
    workflowEntityType,
    excludeBudgets,
  ]);

  const allConfigured = requirements.every((req) => req.isConfigured);
  const missingCount = requirements.filter((req) => !req.isConfigured).length;
  const isLoading = requirements.some((req) => req.isLoading);

  return {
    requirements,
    allConfigured,
    missingCount,
    isLoading,
  };
}
