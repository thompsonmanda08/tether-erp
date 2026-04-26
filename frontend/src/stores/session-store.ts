"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface SessionState {
  // State
  isWarningOpen: boolean;
  isLoading: boolean;

  // Actions
  openWarning: () => void;
  closeWarning: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    isWarningOpen: false,
    isLoading: false,

    // Actions
    openWarning: () => set({ isWarningOpen: true }),
    closeWarning: () => set({ isWarningOpen: false }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
  })),
);
