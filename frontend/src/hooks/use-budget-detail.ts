import { useDocumentDetail } from "./use-document-detail";
import { useBudgetById } from "./use-budget-queries";
import { Budget } from "@/types/budget";

interface UseBudgetDetailProps {
  budgetId: string;
  userId: string;
  userRole: string;
  initialBudget?: Budget;
}

export function useBudgetDetail({
  budgetId,
  userId,
  userRole,
  initialBudget,
}: UseBudgetDetailProps) {
  return useDocumentDetail<Budget>({
    documentId: budgetId,
    userId,
    userRole,
    initialDocument: initialBudget,
    documentType: "budget",

    // Query hooks
    useDocumentQuery: useBudgetById,

    // Mutation hooks - Budget doesn't have PDF export yet
    useSubmitMutation: () => ({
      mutateAsync: async () => ({}),
      isPending: false,
    }),

    // PDF export - Budget doesn't have PDF export functions yet
    exportPDF: async () => {
      throw new Error("Budget PDF export not implemented");
    },
    getPDFBlob: async () => {
      throw new Error("Budget PDF export not implemented");
    },

    // Permissions
    getPermissions: (budget, userId, userRole) => {
      const isCreator = budget.ownerId === userId;
      const canEdit = budget.status?.toUpperCase() === "DRAFT" && isCreator;
      const canSubmit = budget.status?.toUpperCase() === "DRAFT" && isCreator;
      const canWithdraw = budget.status?.toUpperCase() === "PENDING" && isCreator;

      return {
        isCreator,
        canEdit,
        canSubmit,
        canWithdraw,
      };
    },
  });
}
