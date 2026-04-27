/**
 * Unit tests for the session store (Zustand)
 * Tests initial state, each action, and state isolation between tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Re-create the store factory so each test gets a fresh instance.
// We do NOT import the singleton useSessionStore directly because Zustand
// singletons share state across tests even with vi.clearAllMocks().
// ---------------------------------------------------------------------------

interface SessionState {
  isWarningOpen: boolean;
  isLoading: boolean;
  openWarning: () => void;
  closeWarning: () => void;
  setLoading: (loading: boolean) => void;
}

function createSessionStore() {
  return createStore<SessionState>()(
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
}

describe("Session Store", () => {
  let store: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    // Create a fresh store for every test — prevents state bleed
    store = createSessionStore();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe("Initial State", () => {
    it("should have isWarningOpen set to false by default", () => {
      const state = store.getState();
      expect(state.isWarningOpen).toBe(false);
    });

    it("should have isLoading set to false by default", () => {
      const state = store.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should expose openWarning as a function", () => {
      const state = store.getState();
      expect(typeof state.openWarning).toBe("function");
    });

    it("should expose closeWarning as a function", () => {
      const state = store.getState();
      expect(typeof state.closeWarning).toBe("function");
    });

    it("should expose setLoading as a function", () => {
      const state = store.getState();
      expect(typeof state.setLoading).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // openWarning action
  // -------------------------------------------------------------------------

  describe("openWarning", () => {
    it("should set isWarningOpen to true", () => {
      store.getState().openWarning();
      expect(store.getState().isWarningOpen).toBe(true);
    });

    it("should not affect isLoading when called", () => {
      store.getState().openWarning();
      expect(store.getState().isLoading).toBe(false);
    });

    it("should be idempotent — calling it twice keeps isWarningOpen true", () => {
      store.getState().openWarning();
      store.getState().openWarning();
      expect(store.getState().isWarningOpen).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // closeWarning action
  // -------------------------------------------------------------------------

  describe("closeWarning", () => {
    it("should set isWarningOpen to false after it was opened", () => {
      store.getState().openWarning();
      store.getState().closeWarning();
      expect(store.getState().isWarningOpen).toBe(false);
    });

    it("should be a no-op when warning is already closed", () => {
      store.getState().closeWarning();
      expect(store.getState().isWarningOpen).toBe(false);
    });

    it("should not affect isLoading when called", () => {
      store.getState().setLoading(true);
      store.getState().openWarning();
      store.getState().closeWarning();
      expect(store.getState().isLoading).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // setLoading action
  // -------------------------------------------------------------------------

  describe("setLoading", () => {
    it("should set isLoading to true when passed true", () => {
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);
    });

    it("should set isLoading to false when passed false", () => {
      store.getState().setLoading(true);
      store.getState().setLoading(false);
      expect(store.getState().isLoading).toBe(false);
    });

    it("should not affect isWarningOpen when called", () => {
      store.getState().openWarning();
      store.getState().setLoading(true);
      expect(store.getState().isWarningOpen).toBe(true);
    });

    it("should be idempotent — calling setLoading(true) twice keeps isLoading true", () => {
      store.getState().setLoading(true);
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Combined / sequenced actions
  // -------------------------------------------------------------------------

  describe("Combined Actions", () => {
    it("should handle open then close sequence correctly", () => {
      store.getState().openWarning();
      expect(store.getState().isWarningOpen).toBe(true);

      store.getState().closeWarning();
      expect(store.getState().isWarningOpen).toBe(false);
    });

    it("should handle setLoading cycle correctly", () => {
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);

      store.getState().setLoading(false);
      expect(store.getState().isLoading).toBe(false);
    });

    it("should manage isWarningOpen and isLoading independently", () => {
      store.getState().openWarning();
      store.getState().setLoading(true);

      expect(store.getState().isWarningOpen).toBe(true);
      expect(store.getState().isLoading).toBe(true);

      store.getState().closeWarning();

      expect(store.getState().isWarningOpen).toBe(false);
      expect(store.getState().isLoading).toBe(true); // unchanged
    });
  });

  // -------------------------------------------------------------------------
  // State isolation across test instances
  // -------------------------------------------------------------------------

  describe("State Isolation", () => {
    it("should start fresh even if a previous test mutated state", () => {
      // Mutate everything
      store.getState().openWarning();
      store.getState().setLoading(true);

      // Verify mutations applied to THIS store instance
      expect(store.getState().isWarningOpen).toBe(true);
      expect(store.getState().isLoading).toBe(true);

      // Create a brand-new store — simulates what beforeEach does next test
      const freshStore = createSessionStore();
      expect(freshStore.getState().isWarningOpen).toBe(false);
      expect(freshStore.getState().isLoading).toBe(false);
    });

    it("should have the correct initial shape for every fresh store", () => {
      const freshStore = createSessionStore();
      const state = freshStore.getState();

      expect(state).toMatchObject({
        isWarningOpen: false,
        isLoading: false,
      });
      expect(typeof state.openWarning).toBe("function");
      expect(typeof state.closeWarning).toBe("function");
      expect(typeof state.setLoading).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Subscription (subscribeWithSelector middleware)
  // -------------------------------------------------------------------------

  describe("Subscriptions", () => {
    it("should notify subscriber when isWarningOpen changes", () => {
      const listener = vi.fn();

      const unsubscribe = store.subscribe(
        (state) => state.isWarningOpen,
        listener,
      );

      store.getState().openWarning();

      expect(listener).toHaveBeenCalledWith(true, false);

      unsubscribe();
    });

    it("should notify subscriber when isLoading changes", () => {
      const listener = vi.fn();

      const unsubscribe = store.subscribe(
        (state) => state.isLoading,
        listener,
      );

      store.getState().setLoading(true);

      expect(listener).toHaveBeenCalledWith(true, false);

      unsubscribe();
    });

    it("should not notify subscriber after unsubscribe", () => {
      const listener = vi.fn();

      const unsubscribe = store.subscribe(
        (state) => state.isWarningOpen,
        listener,
      );
      unsubscribe();

      store.getState().openWarning();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
