'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Budget } from '@/types/budget';
import { WorkflowDocument } from '@/types/workflow';
import { QUERY_KEYS } from '@/lib/constants';

const BUDGET_STORAGE_KEY = 'tether_budgets';

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Load all budgets from localStorage
 */
function loadBudgetsFromStorage(): Budget[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load budgets from storage:', error);
    return [];
  }
}

/**
 * Save budget to localStorage
 */
function saveBudgetToStorage(budget: Budget): void {
  try {
    if (typeof window === 'undefined') return;
    const budgets = loadBudgetsFromStorage();
    const index = budgets.findIndex(r => r.id === budget.id);
    if (index >= 0) {
      budgets[index] = budget;
    } else {
      budgets.push(budget);
    }
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.error('Failed to save budget to storage:', error);
  }
}

/**
 * Get a specific budget by ID from localStorage
 */
function getBudgetFromStorage(budgetId: string): Budget | null {
  try {
    if (typeof window === 'undefined') return null;
    const budgets = loadBudgetsFromStorage();
    return budgets.find(r => r.id === budgetId) || null;
  } catch (error) {
    console.error('Failed to get budget from storage:', error);
    return null;
  }
}

/**
 * Delete a budget from localStorage
 */
function deleteBudgetFromStorage(budgetId: string): void {
  try {
    if (typeof window === 'undefined') return;
    const budgets = loadBudgetsFromStorage();
    const filtered = budgets.filter(r => r.id !== budgetId);
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete budget from storage:', error);
  }
}

/**
 * Clear all budgets from localStorage
 */
function clearBudgetsStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BUDGET_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear budgets storage:', error);
  }
}

// ============================================================================
// DATA CONVERSION
// ============================================================================

/**
 * Convert a Budget to a WorkflowDocument for display in tables
 */
function budgetToWorkflowDocument(budget: Budget): WorkflowDocument {
  const allocated = budget.items.reduce((sum, item) => sum + item.allocatedAmount, 0);
  const spent = budget.items.reduce((sum, item) => sum + item.spentAmount, 0);
  const remaining = allocated - spent;

  return {
    id: budget.id,
    type: 'PURCHASE_ORDER', // Use PURCHASE_ORDER as budget workflow type
    documentNumber: `BUDGET-${budget.id.substring(0, 8).toUpperCase()}`,
    status: budget.status as any,
    currentStage: 1,
    createdBy: budget.createdBy,
    createdAt: budget.createdAt instanceof Date ? budget.createdAt : new Date(budget.createdAt),
    updatedAt: budget.updatedAt instanceof Date ? budget.updatedAt : new Date(budget.updatedAt),
    metadata: {
      department: budget.department,
      amount: budget.totalAmount,
      totalAmount: budget.totalAmount,
      allocated,
      spent,
      remaining,
      fiscalYear: budget.fiscalYear,
    },
  };
}

/**
 * Public export of conversion function for use in components
 */
export function convertBudgetToWorkflowDocument(budget: Budget): WorkflowDocument {
  return budgetToWorkflowDocument(budget);
}

// ============================================================================
// BUDGET ITEM HELPERS
// ============================================================================

/**
 * Update a budget item within a budget immutably
 */
export function updateBudgetItem(
  budget: Budget,
  itemId: string,
  updates: Partial<import('@/types/budget').BudgetItem>
): Budget {
  return {
    ...budget,
    items: budget.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...updates,
            updatedAt: new Date(),
          }
        : item
    ),
    updatedAt: new Date(),
  };
}

/**
 * Delete a budget item from a budget immutably
 */
export function deleteBudgetItem(budget: Budget, itemId: string): Budget {
  return {
    ...budget,
    items: budget.items.filter((item) => item.id !== itemId),
    updatedAt: new Date(),
  };
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to manage budget data with localStorage persistence
 */
export function useBudgetStorage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    loadFromStorage: loadBudgetsFromStorage,
    loadOneFromStorage: getBudgetFromStorage,
    saveToStorage: saveBudgetToStorage,
    deleteFromStorage: deleteBudgetFromStorage,
    clearStorage: clearBudgetsStorage,
  };
}

/**
 * React Query hook for fetching all budgets with localStorage fallback
 */
export const useBudgetsWithStorage = (includeStorageData = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.BUDGETS?.ALL || 'BUDGETS', 'with-storage'],
    queryFn: async () => {
      let allBudgets: Budget[] = [];

      // Load from localStorage only (mock data)
      if (typeof window !== 'undefined') {
        try {
          const storedBudgets = loadBudgetsFromStorage();
          if (storedBudgets && storedBudgets.length > 0) {
            allBudgets = storedBudgets;
          }
        } catch (storageError) {
          console.error('Failed to load budgets from storage:', storageError);
        }
      }

      return allBudgets;
    },
    staleTime: 0, // Always refetch (since we're using localStorage)
    gcTime: 10 * 60 * 1000,
  });

/**
 * React Query hook for fetching budgets as workflow documents
 */
export const useBudgetsAsWorkflowDocuments = (includeStorageData = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.BUDGETS?.ALL || 'BUDGETS', 'as-documents'],
    queryFn: async () => {
      const budgets = loadBudgetsFromStorage();
      return budgets.map(budgetToWorkflowDocument);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
