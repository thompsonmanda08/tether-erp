"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  submitBudgetForApproval,
} from "@/app/_actions/budgets";
import { Budget, CreateBudgetRequest } from "@/types/budget";
import { useBudgetStorage } from "@/hooks/use-budget-storage";
import { toast } from "sonner";

/**
 * Fetch all budgets for the organization
 * Standard data - 5 minute refresh interval
 *
 * @param initialBudgets - Optional initial data from server component
 * @returns Query result with budgets array
 *
 * @example
 * const { data: budgets, isLoading } = useBudgets(initialBudgets)
 */
export const useBudgets = (initialBudgets?: Budget[]) =>
  useQuery({
    queryKey: [QUERY_KEYS.BUDGETS.ALL],
    queryFn: async () => {
      const response = await getBudgets({}, 1, 100);
      return response.success && Array.isArray(response.data)
        ? response.data
        : [];
    },
    // Only seed cache when server actually returned data.
    // Passing [] as initialData would hide the loading state and
    // prevent React Query from showing isLoading=true on first mount.
    ...(initialBudgets?.length
      ? { initialData: initialBudgets, initialDataUpdatedAt: Date.now() }
      : {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch all budgets (for dropdowns and selection)
 * Delegates to useBudgets to avoid duplicate queryFn for the same query key
 *
 * @param initialBudgets - Optional initial data from server component
 * @returns Query result with budgets array
 *
 * @example
 * const { data: budgets, isLoading } = useAllBudgets()
 */
export const useAllBudgets = (initialBudgets?: Budget[]) =>
  useBudgets(initialBudgets || []);

/**
 * Fetch a specific budget by ID
 *
 * @param budgetId - Budget ID to fetch
 * @returns Query result with single budget
 *
 * @example
 * const { data: budget } = useBudgetById(budgetId)
 */
export const useBudgetById = (budgetId: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.BUDGETS.BY_ID, budgetId],
    queryFn: async () => {
      const response = await getBudgetById(budgetId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Create budget mutation
 *
 * @param onSuccess - Callback after successful mutation
 * @returns Mutation object with mutate and mutateAsync
 *
 * @example
 * const saveMutation = useSaveBudget(() => {
 *   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.BY_USER] })
 * })
 *
 * // Create
 * await saveMutation.mutateAsync({ name: 'Q1 Budget' })
 */
export const useSaveBudget = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBudgetRequest) => {
      const response = await createBudget(data);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      const isUpdate = (response.data as Budget & { id?: string })?.id;
      toast.success(
        isUpdate
          ? "Budget updated successfully"
          : "Budget created successfully",
      );

      // Invalidate budget queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.STATS] });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save budget");
    },
  });
};

/**
 * Submit budget for approval mutation
 *
 * @param budgetId - Budget ID to submit
 * @param onSuccess - Callback after successful submission
 * @returns Mutation object
 *
 * @example
 * const submitMutation = useSubmitBudgetForApproval(budgetId)
 * await submitMutation.mutateAsync({ submittingUserId: userId })
 */
export const useSubmitBudgetForApproval = (
  budgetId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      submittingUserId: string;
      workflowId: string;
    }) => {
      const response = await submitBudgetForApproval({
        budgetId,
        workflowId: data.workflowId,
        submittedBy: data.submittingUserId,
        submittedByRole: "requester",
        submittingUserId: data.submittingUserId,
      });

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Budget submitted for approval");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BUDGETS.BY_ID, budgetId],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit budget");
    },
  });
};

/**
 * Update budget mutation (for items, metadata, etc.)
 *
 * @param budgetId - Budget ID to update
 * @param onSuccess - Callback after successful update
 * @returns Mutation object
 *
 * @example
 * const updateMutation = useUpdateBudget(budgetId)
 * await updateMutation.mutateAsync({
 *   items: [...updatedItems],
 *   name: 'Updated budget name'
 * })
 */
export const useUpdateBudget = (budgetId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { saveToStorage } = useBudgetStorage();

  return useMutation({
    mutationFn: async (updates: Partial<Budget>) => {
      const response = await updateBudget(budgetId, updates);

      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      // Save to localStorage
      if (response.data) {
        saveToStorage(response.data);
      }

      toast.success("Budget updated successfully");

      // Invalidate budget queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BUDGETS.BY_ID, budgetId],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS.ALL] });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update budget");
    },
  });
};
