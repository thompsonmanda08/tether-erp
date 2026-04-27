"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Requisition, ActionHistoryEntry } from "@/types";
import { WorkflowDocument } from "@/types/workflow";
import { getRequisitions } from "@/app/_actions/requisitions";
import { QUERY_KEYS } from "@/lib/constants";

const REQUISITIONS_STORAGE_KEY = "tether_requisitions";
const ACTION_HISTORY_STORAGE_KEY = "tether_action_history";

// ============================================================================
// STORAGE UTILITIES - BASIC OPERATIONS
// ============================================================================

/**
 * Load all requisitions from localStorage
 */
function loadRequisitionsFromStorage(): Requisition[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(REQUISITIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load requisitions from storage:", error);
    return [];
  }
}

/**
 * Save requisition to localStorage with deep merge of existing data
 */
function saveRequisitionToStorage(requisition: Requisition): void {
  try {
    if (typeof window === "undefined") return;
    const requisitions = loadRequisitionsFromStorage();
    const index = requisitions.findIndex((r) => r.id === requisition.id);
    if (index >= 0) {
      // Deep merge: preserve actionHistory if not provided
      requisitions[index] = {
        ...requisitions[index],
        ...requisition,
        actionHistory:
          requisition.actionHistory || requisitions[index].actionHistory,
      };
    } else {
      requisitions.push(requisition);
    }
    localStorage.setItem(
      REQUISITIONS_STORAGE_KEY,
      JSON.stringify(requisitions)
    );
  } catch (error) {
    console.error("Failed to save requisition to storage:", error);
  }
}

/**
 * Save multiple requisitions to localStorage
 */
function saveRequisitionsToStorage(requisitions: Requisition[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      REQUISITIONS_STORAGE_KEY,
      JSON.stringify(requisitions)
    );
  } catch (error) {
    console.error("Failed to save requisitions to storage:", error);
  }
}

/**
 * Get a specific requisition by ID from localStorage
 */
function getRequisitionFromStorage(requisitionId: string): Requisition | null {
  try {
    if (typeof window === "undefined") return null;
    const requisitions = loadRequisitionsFromStorage();
    return requisitions.find((r) => r.id === requisitionId) || null;
  } catch (error) {
    console.error("Failed to get requisition from storage:", error);
    return null;
  }
}

/**
 * Delete a requisition from localStorage
 */
function deleteRequisitionFromStorage(requisitionId: string): void {
  try {
    if (typeof window === "undefined") return;
    const requisitions = loadRequisitionsFromStorage();
    const filtered = requisitions.filter((r) => r.id !== requisitionId);
    localStorage.setItem(REQUISITIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete requisition from storage:", error);
  }
}

/**
 * Clear all requisitions from localStorage
 */
function clearRequisitionsStorage(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(REQUISITIONS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear requisitions storage:", error);
  }
}

// ============================================================================
// ACTION HISTORY UTILITIES
// ============================================================================

/**
 * Generate unique ID for action history entries
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load all action history from localStorage
 */
function loadActionHistoryFromStorage(): ActionHistoryEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(ACTION_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load action history from storage:", error);
    return [];
  }
}

/**
 * Get action history for a specific requisition
 */
function getActionHistoryForRequisition(
  requisitionId: string
): ActionHistoryEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const requisition = getRequisitionFromStorage(requisitionId);
    return requisition?.actionHistory || [];
  } catch (error) {
    console.error("Failed to get action history for requisition:", error);
    return [];
  }
}

/**
 * Add action to requisition's action history
 */
function addActionToRequisition(
  requisitionId: string,
  action: Omit<ActionHistoryEntry, "id" | "performedAt">
): ActionHistoryEntry | null {
  try {
    if (typeof window === "undefined") return null;

    const requisition = getRequisitionFromStorage(requisitionId);
    if (!requisition) {
      console.error("Requisition not found:", requisitionId);
      return null;
    }

    const actionEntry: ActionHistoryEntry = {
      ...action,
      id: generateActionId(),
      performedAt: new Date(),
    };

    if (!requisition.actionHistory) {
      requisition.actionHistory = [];
    }

    requisition.actionHistory.push(actionEntry);
    saveRequisitionToStorage(requisition);

    return actionEntry;
  } catch (error) {
    console.error("Failed to add action to requisition:", error);
    return null;
  }
}

/**
 * Clear action history for a requisition
 */
function clearActionHistoryForRequisition(requisitionId: string): void {
  try {
    if (typeof window === "undefined") return;
    const requisition = getRequisitionFromStorage(requisitionId);
    if (requisition) {
      requisition.actionHistory = [];
      saveRequisitionToStorage(requisition);
    }
  } catch (error) {
    console.error("Failed to clear action history:", error);
  }
}

// ============================================================================
// DATA CONVERSION
// ============================================================================

/**
 * Convert a Requisition to a WorkflowDocument for display in tables
 */
function requisitionToWorkflowDocument(
  requisition: Requisition
): WorkflowDocument {
  return {
    id: requisition.id,
    type: "REQUISITION",
    documentNumber: requisition.documentNumber,
    status: requisition.status as any,
    currentStage: requisition.currentApprovalStage || 1,
    createdBy: requisition.requestedBy,
    createdAt:
      requisition.requestedDate instanceof Date
        ? requisition.requestedDate
        : new Date(requisition.requestedDate),
    updatedAt: new Date(),
    metadata: {
      title: requisition.title,
      description: requisition.description,
      department: requisition.department,
      requestedFor: requisition.title,
      totalAmount: requisition.totalAmount,
      amount: requisition.totalAmount,
      priority: requisition.priority,
      itemCount: requisition.items?.length || 0,
    },
  };
}

/**
 * Public export of conversion function for use in components
 */
export function convertRequisitionToWorkflowDocument(
  requisition: Requisition
): WorkflowDocument {
  return requisitionToWorkflowDocument(requisition);
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to manage requisition data with localStorage persistence
 * Syncs data between server state and browser localStorage
 *
 * @returns Object with hydration state and storage functions
 *
 * @example
 * const { isHydrated, loadFromStorage, saveToStorage, addAction } = useRequisitionStorage()
 */
export function useRequisitionStorage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    // Basic operations
    loadFromStorage: loadRequisitionsFromStorage,
    loadOneFromStorage: getRequisitionFromStorage,
    saveToStorage: saveRequisitionToStorage,
    saveMultiple: saveRequisitionsToStorage,
    deleteFromStorage: deleteRequisitionFromStorage,
    clearStorage: clearRequisitionsStorage,
    // Action history operations
    getActionHistory: getActionHistoryForRequisition,
    addAction: addActionToRequisition,
    clearActionHistory: clearActionHistoryForRequisition,
  };
}

/**
 * Hook to sync requisition changes to localStorage automatically
 * Useful for auto-save functionality
 *
 * @param requisitionId - ID of requisition to sync
 * @param requisition - The requisition data to sync
 * @param enabled - Whether syncing is enabled (default: true)
 * @param debounceMs - Debounce time in milliseconds (default: 500)
 *
 * @example
 * const { syncedAt } = useSyncRequisitionToStorage(requisitionId, requisition)
 */
export function useSyncRequisitionToStorage(
  requisitionId: string,
  requisition: Requisition | null | undefined,
  enabled = true,
  debounceMs = 500
) {
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!enabled || !requisition) return;

    const timer = setTimeout(() => {
      setIsSyncing(true);
      saveRequisitionToStorage(requisition);
      setSyncedAt(new Date());
      setIsSyncing(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [requisition, enabled, debounceMs]);

  return {
    syncedAt,
    isSyncing,
  };
}

/**
 * Hook to manage action history for a requisition
 * Provides functions to add, retrieve, and clear actions
 *
 * @param requisitionId - ID of the requisition
 * @returns Object with action history functions
 *
 * @example
 * const { actions, addAction, clearActions } = useRequisitionActionHistory(requisitionId)
 */
export function useRequisitionActionHistory(requisitionId: string) {
  const [actions, setActions] = useState<ActionHistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial action history
  useEffect(() => {
    const history = getActionHistoryForRequisition(requisitionId);
    setActions(history);
    setIsHydrated(true);
  }, [requisitionId]);

  const addAction = (
    action: Omit<ActionHistoryEntry, "id" | "performedAt">
  ): ActionHistoryEntry | null => {
    const newAction = addActionToRequisition(requisitionId, action);
    if (newAction) {
      setActions((prev) => [...prev, newAction]);
    }
    return newAction;
  };

  const clearActions = () => {
    clearActionHistoryForRequisition(requisitionId);
    setActions([]);
  };

  return {
    actions,
    isHydrated,
    addAction,
    clearActions,
    actionCount: actions.length,
  };
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * React Query hook for fetching all requisitions with localStorage fallback
 * Merges API data with localStorage data for complete view
 *
 * @param includeStorageData - Whether to include localStorage data (default: true)
 * @returns Query result with merged requisitions array
 *
 * @example
 * const { data: requisitions, isLoading } = useRequisitionsWithStorage()
 */
export const useRequisitionsWithStorage = (includeStorageData = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.REQUISITIONS.ALL, "with-storage"],
    queryFn: async () => {
      let allRequisitions: Requisition[] = [];

      // Load from API
      try {
        const response = await getRequisitions();
        if (response.success && response.data) {
          allRequisitions = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch requisitions from API:", error);
      }

      // Also load from localStorage
      if (includeStorageData && typeof window !== "undefined") {
        try {
          const storedRequisitions = loadRequisitionsFromStorage();
          if (storedRequisitions && storedRequisitions.length > 0) {
            // Merge: prioritize API data, add missing from localStorage
            const apiIds = new Set(allRequisitions.map((r) => r.id));
            const localOnlyRequisitions = storedRequisitions.filter(
              (r) => !apiIds.has(r.id)
            );

            allRequisitions = [...allRequisitions, ...localOnlyRequisitions];
          }
        } catch (storageError) {
          console.error(
            "Failed to load requisitions from storage:",
            storageError
          );
        }
      }

      return allRequisitions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

/**
 * React Query hook for fetching a specific requisition with localStorage fallback
 *
 * @param requisitionId - ID of the requisition to fetch
 * @param initialData - Optional initial data from server component
 * @returns Query result with single requisition
 *
 * @example
 * const { data: requisition } = useRequisitionWithStorage(requisitionId)
 */
export const useRequisitionWithStorage = (
  requisitionId: string,
  initialData?: Requisition
) =>
  useQuery({
    queryKey: [QUERY_KEYS.REQUISITIONS.BY_ID, requisitionId, "with-storage"],
    queryFn: async () => {
      // First try localStorage
      if (typeof window !== "undefined") {
        const stored = getRequisitionFromStorage(requisitionId);
        if (stored) {
          return stored;
        }
      }

      // Then try API (will be handled by existing hook)
      return null;
    },
    initialData,
    enabled: !!requisitionId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

/**
 * Hook to convert requisitions to workflow documents for table display
 * Combines localStorage and API requisitions with format conversion
 *
 * @param includeStorageData - Whether to include localStorage data (default: true)
 * @returns Query result with WorkflowDocument array
 *
 * @example
 * const { data: documents } = useRequisitionsAsWorkflowDocuments()
 */
export const useRequisitionsAsWorkflowDocuments = (includeStorageData = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.REQUISITIONS.ALL, "as-documents"],
    queryFn: async () => {
      let allRequisitions: Requisition[] = [];

      // Load from API
      try {
        const response = await getRequisitions();
        if (response.success && response.data) {
          allRequisitions = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch requisitions from API:", error);
      }

      // Also load from localStorage
      if (includeStorageData && typeof window !== "undefined") {
        try {
          const storedRequisitions = loadRequisitionsFromStorage();
          if (storedRequisitions && storedRequisitions.length > 0) {
            // Merge: prioritize API data, add missing from localStorage
            const apiIds = new Set(allRequisitions.map((r) => r.id));
            const localOnlyRequisitions = storedRequisitions.filter(
              (r) => !apiIds.has(r.id)
            );

            allRequisitions = [...allRequisitions, ...localOnlyRequisitions];
          }
        } catch (storageError) {
          console.error(
            "Failed to load requisitions from storage:",
            storageError
          );
        }
      }

      return allRequisitions.map(requisitionToWorkflowDocument);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
