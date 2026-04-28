"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Tag, Pencil, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelectField } from "@/components/ui/search-select-field";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-category-queries";
import { useAllBudgets } from "@/hooks/use-budget-queries";
import { Category } from "@/app/_actions/categories";
import { PageHeader } from "@/components/base/page-header";
import { PlusCircle as PlusCircledIcon } from "lucide-react";

interface PaginationData {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface CategoriesTabProps {
  initialCategories: Category[];
  pagination: PaginationData;
}

export function CategoriesClient({
  initialCategories,
  pagination,
}: CategoriesTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>(
    Array.isArray(initialCategories) ? initialCategories : [],
  );
  const [openModal, setOpenModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  // Use the categories hook for real-time data
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const { data: liveCategories } = useCategories(page, limit, true);

  const deleteCategoryMutation = useDeleteCategory(
    categoryToDelete?.id || "",
    () => {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES.ALL] });
    },
  );

  const updatePagination = ({
    page,
    page_size,
  }: {
    page?: number;
    page_size?: number;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (page !== undefined) {
      params.set("page", String(page));
    }

    if (page_size !== undefined) {
      params.set("limit", String(page_size));
      params.set("page", "1");
    }

    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (liveCategories && Array.isArray(liveCategories)) {
      setCategories(liveCategories);
    } else if (initialCategories && Array.isArray(initialCategories)) {
      setCategories(initialCategories);
    } else {
      setCategories([]);
    }
  }, [liveCategories, initialCategories]);

  const customPaginationData = {
    page: pagination.page,
    page_size: pagination.page_size,
    total_pages: pagination.total_pages,
    totalCount: pagination.total,
    has_prev: pagination.has_prev,
    has_next: pagination.has_next,
    // Add missing properties for Pagination interface
    limit: pagination.page_size,
    total: pagination.total,
    totalPages: pagination.total_pages,
    hasNext: pagination.has_next,
    hasPrev: pagination.has_prev,
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete?.id) return;
    deleteCategoryMutation.mutate();
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Category Management"
          subtitle="Manage and track categories definitations for documents"
          showBackButton={false}
        />
        <Button
          onClick={() => {
            setEditingCategory(null);
            setOpenModal(true);
          }}
          className="mt-2 h-11"
        >
          <PlusCircledIcon className="h-4 w-4" />
          Create Category
        </Button>
      </div>

      <div className="rounded-md border overflow-clip">
        <Table>
          <TableHeader className="uppercase">
            <TableRow className="bg-slate-50/5 ">
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Budget Codes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!Array.isArray(categories) || categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Tag />
                      </EmptyMedia>
                      <EmptyTitle>No Categories Yet</EmptyTitle>
                      <EmptyDescription>
                        You haven&apos;t created any categories yet. Get started
                        by creating your first category.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingCategory(null);
                            setOpenModal(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Category
                        </Button>
                      </div>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">
                        {category.name || "Unnamed"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {category.description || "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {category.budgetCodes &&
                      Array.isArray(category.budgetCodes) &&
                      category.budgetCodes.length > 0 ? (
                        category.budgetCodes.map((code, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 dark:bg-blue-500/5 dark:text-blue-500 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No codes
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-medium",
                        category.active
                          ? "bg-green-100 text-green-700 dark:bg-green-500/5 dark:text-green-400"
                          : "bg-gray-100 text-gray-700",
                      )}
                    >
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          setEditingCategory(category);
                          setOpenModal(true);
                          e?.stopPropagation();
                        }}
                        className="h-8 gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          setCategoryToDelete(category);
                          setDeleteDialogOpen(true);
                          e?.stopPropagation();
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {Array.isArray(categories) && categories.length > 0 && (
        <CustomPagination
          pagination={customPaginationData}
          updatePagination={updatePagination}
          allowSetPageSize={true}
          showDetails={true}
          className="mt-4 border-t"
        />
      )}

      <CreateOrUpdateCategoryDialog
        openModal={openModal}
        setOpenModal={setOpenModal}
        initialData={editingCategory}
        setInitialData={setEditingCategory}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.CATEGORIES.ALL],
          });
        }}
      />

      <ConfirmationModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${categoryToDelete?.name || "Category"}`}
        description="Are you sure you want to delete this category? This action cannot be undone and may affect related data."
        onConfirm={handleDeleteConfirm}
        isLoading={deleteCategoryMutation.isPending}
        type="delete"
      />
    </>
  );
}

const CATEGORY_INITIAL_STATE = {
  name: "",
  description: "",
  budgetCodes: [] as string[],
};

interface CreateOrUpdateCategoryDialogProps {
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  initialData: Category | null;
  setInitialData: React.Dispatch<React.SetStateAction<Category | null>>;
  onSuccess: () => void;
}

function CreateOrUpdateCategoryDialog({
  openModal,
  setOpenModal,
  initialData,
  setInitialData,
  onSuccess,
}: CreateOrUpdateCategoryDialogProps) {
  const [error, setError] = useState<{ status: boolean; message: string }>({
    status: false,
    message: "",
  });
  const [formData, setFormData] = useState(CATEGORY_INITIAL_STATE);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");

  // Fetch all budgets for the dropdown
  const { data: budgets = [], isLoading: budgetsLoading } = useAllBudgets();

  const createMutation = useCreateCategory(() => {
    setOpenModal(false);
    setInitialData(null);
    setFormData(CATEGORY_INITIAL_STATE);
    setSelectedBudgetId("");
    onSuccess();
  });

  const updateMutation = useUpdateCategory(initialData?.id || "", () => {
    setOpenModal(false);
    setInitialData(null);
    setFormData(CATEGORY_INITIAL_STATE);
    setSelectedBudgetId("");
    onSuccess();
  });

  // PRE-POPULATE FORM DATA
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        budgetCodes: Array.isArray(initialData.budgetCodes)
          ? initialData.budgetCodes
          : [],
      });
    } else {
      setFormData(CATEGORY_INITIAL_STATE);
    }
    setError({ status: false, message: "" });
  }, [initialData, openModal]);

  // Reset form when modal closes
  useEffect(() => {
    if (!openModal) {
      const timer = setTimeout(() => {
        setFormData(CATEGORY_INITIAL_STATE);
        setError({ status: false, message: "" });
        setInitialData(null);
        setSelectedBudgetId("");
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [openModal, setInitialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError({ status: true, message: "Category name is required" });
      return;
    }

    if (formData.name.length < 3) {
      setError({
        status: true,
        message: "Category name must be at least 3 characters",
      });
      return;
    }

    const mutation = initialData ? updateMutation : createMutation;
    mutation.mutate(formData);
  };

  const addBudgetCode = () => {
    if (!selectedBudgetId) return;

    const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);
    if (!selectedBudget) return;

    const budgetCode = selectedBudget.budgetCode;
    const currentBudgetCodes = Array.isArray(formData.budgetCodes)
      ? formData.budgetCodes
      : [];

    if (budgetCode && !currentBudgetCodes.includes(budgetCode)) {
      setFormData((prev) => ({
        ...prev,
        budgetCodes: [...currentBudgetCodes, budgetCode],
      }));
      setSelectedBudgetId("");
    }
  };

  const removeBudgetCode = (codeToRemove: string) => {
    const currentBudgetCodes = Array.isArray(formData.budgetCodes)
      ? formData.budgetCodes
      : [];

    setFormData((prev) => ({
      ...prev,
      budgetCodes: currentBudgetCodes.filter((code) => code !== codeToRemove),
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={openModal}
      onOpenChange={(open) => {
        setOpenModal(open);
        if (!open) {
          setFormData(CATEGORY_INITIAL_STATE);
          setError({ status: false, message: "" });
          setInitialData(null);
          setSelectedBudgetId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Update Category" : "Create New Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Category Name"
            placeholder="e.g. Office Supplies, IT Equipment"
            value={formData.name}
            onChange={(e) => {
              setError({ status: false, message: "" });
              setFormData((c) => ({ ...c, name: e.target.value }));
            }}
            required
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Brief description of this category"
            value={formData.description}
            onChange={(e) => {
              setError({ status: false, message: "" });
              setFormData((c) => ({ ...c, description: e.target.value }));
            }}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Budget Codes (Optional)
            </label>
            <p className="text-xs text-muted-foreground">
              Select budgets to associate with this category
            </p>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <SearchSelectField
                  placeholder="Search budgets by name or code..."
                  value={selectedBudgetId}
                  onValueChange={setSelectedBudgetId}
                  isLoading={budgetsLoading}
                  options={budgets.map((budget) => ({
                    id: budget.id,
                    value: budget.id,
                    name: `${budget.budgetCode} - ${budget.name}`,
                    label: `${budget.budgetCode} - ${budget.name}`,
                  }))}
                  listItemName="name"
                />
              </div>
              <Button
                type="button"
                onClick={addBudgetCode}
                disabled={!selectedBudgetId || budgetsLoading}
                className="mt-0"
              >
                Add
              </Button>
            </div>

            {formData.budgetCodes &&
              Array.isArray(formData.budgetCodes) &&
              formData.budgetCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.budgetCodes.map((code, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {code}
                      <button
                        type="button"
                        onClick={() => removeBudgetCode(code)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
          </div>

          {error.status && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <TriangleAlert className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error.message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isLoading}
                onClick={() => setOpenModal(false)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              isLoading={isLoading}
              loadingText="Saving..."
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
