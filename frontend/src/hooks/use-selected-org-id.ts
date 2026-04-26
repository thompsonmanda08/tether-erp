"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "current-organization-id";

function readStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Lightweight hook managing the selected organization ID.
 * Persists to localStorage and syncs across the app via React state.
 */
export function useSelectedOrgId() {
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(
    readStoredOrgId,
  );

  const setSelectedOrgId = useCallback((orgId: string) => {
    setSelectedOrgIdState(orgId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, orgId);
    }
  }, []);

  const clearSelectedOrgId = useCallback(() => {
    setSelectedOrgIdState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Sync across tabs via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelectedOrgIdState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { selectedOrgId, setSelectedOrgId, clearSelectedOrgId };
}
