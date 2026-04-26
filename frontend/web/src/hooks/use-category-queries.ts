"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/app/_actions/categories";
import { QUERY_KEYS } from "@/lib/constants";

/**
 * Fetch all categories with pagination
 * Standard data - 5 minute refresh interval
 *
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 50)
 * @param activeOnly - Only fetch active categories (default: true)
 * @returns Query result with categories array
 *
 * @example
 * const { data: categories } = useCategories(1, 50, true)
 */
export const useCategories = (
  page: number = 1,
  limit: number = 50,
  activeOnly: boolean = true,
) =>
  useQuery({
    queryKey: [
      QUERY_KEYS.CATEGORIES?.ALL || "categories",
      page,
      limit,
      activeOnly,
    ],
    queryFn: async () => {
      const response = await getCategories(page, limit, activeOnly);
      if (
        response.success &&
        response.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Fetch a specific category by ID
 *
 * @param categoryId - Category ID to fetch
 * @param initialData - Optional initial data
 * @returns Query result with single category
 *
 * @example
 * const { data: category } = useCategoryById(categoryId)
 */
export const useCategoryById = (categoryId: string, initialData?: Category) =>
  useQuery({
    queryKey: [QUERY_KEYS.CATEGORIES?.BY_ID || "category", categoryId],
    queryFn: async () => {
      const response = await getCategoryById(categoryId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!categoryId,
  });

/**
 * Create category mutation
 *
 * @param onSuccess - Callback after successful creation
 * @returns Mutation object
 *
 * @example
 * const createMutation = useCreateCategory(() => {
 *   queryClient.invalidateQueries({ queryKey: ['categories'] })
 * })
 * await createMutation.mutateAsync({
 *   name: 'Office Supplies',
 *   description: 'General office supplies and equipment'
 * })
 */
export const useCreateCategory = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const response = await createCategory(data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Category created successfully");

      // Invalidate category queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CATEGORIES?.ALL || "categories"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create category");
    },
  });
};

/**
 * Update category mutation
 *
 * @param categoryId - Category ID to update
 * @param onSuccess - Callback after successful update
 * @returns Mutation object
 *
 * @example
 * const updateMutation = useUpdateCategory(categoryId)
 * await updateMutation.mutateAsync({
 *   name: 'Updated Office Supplies',
 *   description: 'Updated description'
 * })
 */
export const useUpdateCategory = (
  categoryId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCategoryRequest) => {
      const response = await updateCategory(categoryId, data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Category updated successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CATEGORIES?.BY_ID || "category", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CATEGORIES?.ALL || "categories"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update category");
    },
  });
};

/**
 * Delete category mutation
 *
 * @param categoryId - Category ID to delete
 * @param onSuccess - Callback after successful deletion
 * @returns Mutation object
 *
 * @example
 * const deleteMutation = useDeleteCategory(categoryId)
 * await deleteMutation.mutateAsync()
 */
export const useDeleteCategory = (
  categoryId: string,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await deleteCategory(categoryId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Category deleted successfully");

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CATEGORIES?.ALL || "categories"],
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete category");
    },
  });
};
