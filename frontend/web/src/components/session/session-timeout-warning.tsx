"use client";
/**
 * Session Timeout Warning Component
 *
 * Detects user idle time and displays a warning dialog before automatic logout.
 * Shows a countdown timer and allows the user to extend their session or log out.
 *
 * Uses:
 * - Local state for countdown timer (component-specific)
 * - Zustand store for global state (dialog visibility, loading state)
 * - react-idle-timer for idle detection
 */
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useIdleTimer } from "react-idle-timer";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  SESSION_CONFIG,
  SCREEN_LOCK_COUNTDOWN_SECONDS,
  PROGRESS_CIRCLE_TOTAL,
} from "@/lib/session-config";
import { logger } from "@/lib/logger";
import {
  checkScreenLockState,
  getRefreshToken,
  lockScreenOnUserIdle,
  logUserOut,
} from "@/app/_actions/auth";
import { AuthSession } from "@/types";
import { useTokenRefresh } from "@/hooks/use-auth-queries";
import { useSessionStore } from "@/stores/session-store";

const DEFAULT_TIMEOUT = SESSION_CONFIG.SCREEN_LOCK_COUNTDOWN;
const SESSION_LOCK_CHANNEL = "session-lock-state";

/**
 * Custom hook for countdown timer logic (local state)
 * Handles timer state, interval cleanup, and timeout callbacks
 */
const useCountdownTimer = (
  open: boolean,
  onTimeout: () => void,
  timeoutSeconds: number = DEFAULT_TIMEOUT / 1000,
) => {
  const [seconds, setSeconds] = useState(timeoutSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTimedOutRef = useRef(false);

  useEffect(() => {
    if (open) {
      setSeconds(timeoutSeconds);
      hasTimedOutRef.current = false;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prevSeconds) => {
        const newSeconds = prevSeconds - 1;

        if (newSeconds <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }

        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, timeoutSeconds]);

  useEffect(() => {
    if (seconds <= 0 && open && !hasTimedOutRef.current) {
      hasTimedOutRef.current = true;
      onTimeout();
    }
  }, [seconds, open, onTimeout]);

  return seconds;
};

/**
 * Session Timeout Warning Dialog Component
 */
function SessionTimeoutWarningDialog({
  onStillHere,
  onLogout,
}: {
  onStillHere: () => Promise<void>;
  onLogout: () => void;
}) {
  // Global state from Zustand
  const { isWarningOpen, isLoading, closeWarning, setLoading } =
    useSessionStore();

  // Local state for countdown
  const seconds = useCountdownTimer(isWarningOpen, onLogout);

  const handleRefreshAuthToken = useCallback(async () => {
    try {
      setLoading(true);
      await onStillHere();
      closeWarning();
      toast.success("Session extended. Welcome back!");
    } catch (error) {
      logger.error("Error in handleRefreshAuthToken", error, {
        component: "SessionTimeoutWarningDialog",
      });
      toast.error("Failed to extend session. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onStillHere, closeWarning, setLoading]);

  const handleLogout = useCallback(() => {
    setLoading(true);
    onLogout();
  }, [onLogout, setLoading]);

  const progress = useMemo(
    () => (seconds / SCREEN_LOCK_COUNTDOWN_SECONDS) * PROGRESS_CIRCLE_TOTAL,
    [seconds],
  );

  return (
    <Dialog open={isWarningOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            You have been idle for some time now, you will be logged out
            automatically in
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div className="relative h-36 w-36">
            <svg
              className="h-full w-full"
              width="32"
              height="32"
              viewBox="0 0 36 36"
            >
              <circle
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="4"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
              />
              <circle
                className="stroke-primary"
                strokeWidth="4"
                strokeDasharray={`${progress}, ${PROGRESS_CIRCLE_TOTAL}`}
                strokeLinecap="round"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "50% 50%",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black">{seconds}</span>
              <span className="text-muted-foreground border-input/50 mt-1 rounded-full border p-2 py-1 text-xs font-medium">
                seconds
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={handleLogout}
          >
            Log Out
          </Button>
          <Button
            disabled={isLoading}
            isLoading={isLoading}
            onClick={handleRefreshAuthToken}
          >
            I'm still here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Custom hook for multi-tab synchronization
 * Handles BroadcastChannel with localStorage fallback
 */
const useSessionLockSync = (loggedIn: boolean) => {
  const [isIdle, setIsIdle] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(Math.random().toString(36).substring(7));
  const thisTabInitiatedLock = useRef(false);

  const { isWarningOpen, openWarning, closeWarning } = useSessionStore();

  useEffect(() => {
    if (!loggedIn || typeof window === "undefined") return;

    let storageListener: ((e: StorageEvent) => void) | null = null;

    const syncState = (isLocked: boolean, sourceTabId?: string) => {
      const isFromOtherTab = sourceTabId && sourceTabId !== tabIdRef.current;

      logger.info("🔄 Session lock state sync received", {
        component: "useSessionLockSync",
        isLocked,
        sourceTabId: sourceTabId || "unknown",
        currentTabId: tabIdRef.current,
        isFromOtherTab,
        willApplyDialogLock: isFromOtherTab || !sourceTabId,
        thisTabInitiatedLock: thisTabInitiatedLock.current,
      });

      if ((isFromOtherTab || !sourceTabId) && !isLocked) {
        closeWarning();
      } else if (isFromOtherTab && isLocked && !thisTabInitiatedLock.current) {
        openWarning();
      } else if (!sourceTabId && isLocked) {
        openWarning();
      } else {
        logger.debug("⏭️ Ignoring lock event (same tab or already locked)", {
          component: "useSessionLockSync",
          isFromOtherTab,
          thisTabInitiatedLock: thisTabInitiatedLock.current,
        });
      }
    };

    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data.type === "SESSION_LOCK_CHANGED") {
        syncState(event.data.isLocked, event.data.sourceTabId);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_LOCK_CHANNEL) {
        try {
          const data = event.newValue ? JSON.parse(event.newValue) : null;
          if (data?.type === "SESSION_LOCK_CHANGED") {
            syncState(data.isLocked, data.sourceTabId);
          }
        } catch (error) {
          logger.debug("Failed to parse storage event data", {
            component: "useSessionLockSync",
          });
        }
      }
    };

    try {
      broadcastChannelRef.current = new BroadcastChannel(SESSION_LOCK_CHANNEL);
      broadcastChannelRef.current.addEventListener(
        "message",
        handleBroadcastMessage,
      );
      logger.debug("✅ BroadcastChannel initialized for multi-tab sync", {
        component: "useSessionLockSync",
      });
    } catch (error) {
      logger.warn(
        "⚠️ BroadcastChannel not supported, using localStorage fallback for multi-tab sync",
        {
          component: "useSessionLockSync",
          error: (error as Error)?.message,
        },
      );
    }

    window.addEventListener("storage", handleStorageChange);
    storageListener = handleStorageChange;

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener(
          "message",
          handleBroadcastMessage,
        );
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      if (storageListener) {
        window.removeEventListener("storage", storageListener);
        storageListener = null;
      }
    };
  }, [loggedIn, openWarning, closeWarning]);

  const broadcastState = useCallback((isLocked: boolean) => {
    if (isLocked) {
      thisTabInitiatedLock.current = true;
    } else {
      thisTabInitiatedLock.current = false;
    }

    const message = {
      type: "SESSION_LOCK_CHANGED",
      isLocked,
      sourceTabId: tabIdRef.current,
      timestamp: Date.now(),
    };

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(message);
        logger.debug(
          "📢 Broadcasted session lock state change via BroadcastChannel",
          {
            component: "useSessionLockSync",
            isLocked,
            sourceTabId: tabIdRef.current,
            thisTabInitiatedLock: thisTabInitiatedLock.current,
            method: "BroadcastChannel",
          },
        );
        return;
      } catch (error) {
        logger.debug(
          "Failed to broadcast via BroadcastChannel, falling back to localStorage",
          {
            component: "useSessionLockSync",
            error: (error as Error)?.message,
          },
        );
      }
    }

    try {
      localStorage.setItem(SESSION_LOCK_CHANNEL, JSON.stringify(message));
      logger.debug(
        "📢 Broadcasted session lock state change via localStorage",
        {
          component: "useSessionLockSync",
          isLocked,
          sourceTabId: tabIdRef.current,
          thisTabInitiatedLock: thisTabInitiatedLock.current,
          method: "localStorage",
        },
      );
    } catch (error) {
      logger.debug("Failed to broadcast via localStorage", {
        component: "useSessionLockSync",
        error: (error as Error)?.message,
      });
    }
  }, []);

  return { isIdle, setIsIdle, broadcastState };
};

/**
 * Session Timeout Container with Idle Detection
 */
export function SessionTimeoutContainer({
  session,
}: {
  session: AuthSession | null;
}) {
  const hasLoggedOutRef = useRef(false);

  const loggedIn = !!session?.access_token;

  const { openWarning, closeWarning, setLoading } = useSessionStore();
  const { isIdle, setIsIdle, broadcastState } = useSessionLockSync(loggedIn);

  useEffect(() => {
    logger.debug("📋 SessionTimeoutContainer logged-in status", {
      component: "SessionTimeoutContainer",
      loggedIn,
      hasAccessToken: !!session?.access_token,
      session: session
        ? {
            user_id: (session as any)?.user_id,
            user_type: (session as any)?.user_type,
          }
        : null,
    });
  }, [loggedIn, session]);

  // Check for persisted lock state on mount
  useEffect(() => {
    const checkPersistedLockState = async () => {
      try {
        const isLocked = await checkScreenLockState();
        logger.debug("🔍 Checking persisted lock state on mount", {
          component: "SessionTimeoutContainer",
          isLocked,
          loggedIn,
        });

        if (isLocked && loggedIn) {
          logger.info(
            "🔒 Session lock state detected from cookie, restoring lock",
            {
              component: "SessionTimeoutContainer",
              isLocked,
            },
          );
          setIsIdle(true);
          openWarning();
          broadcastState(true);
        } else if (!isLocked) {
          logger.debug("✅ No persisted lock state, starting fresh", {
            component: "SessionTimeoutContainer",
          });
        }
      } catch (error) {
        logger.error("❌ Error checking persisted lock state", error, {
          component: "SessionTimeoutContainer",
        });
      }
    };

    if (loggedIn) {
      checkPersistedLockState();
    }
  }, [loggedIn, setIsIdle, openWarning, broadcastState]);

  // Handle background token refresh errors
  const { refreshError } = useTokenRefresh(Boolean(loggedIn && !isIdle));

  useEffect(() => {
    if (refreshError) {
      logger.error(
        "🔄 Background token refresh failed - session may be expiring",
        refreshError,
        {
          component: "SessionTimeoutContainer",
        },
      );
      toast.warning(
        "⚠️ Your session may be expiring. Please save your work and log back in if needed.",
        { duration: 10000 },
      );
    }
  }, [refreshError]);

  // Idle timeout callback
  const onIdle = useCallback(async () => {
    logger.debug("🔒 Idle timeout detected, attempting to lock session", {
      component: "SessionTimeoutContainer.onIdle",
    });

    setIsIdle(true);
    openWarning();
    broadcastState(true);

    try {
      const lockSuccess = await lockScreenOnUserIdle(true);
      if (!lockSuccess) {
        logger.warn("Session lock cookie not set, but showing modal anyway", {
          component: "SessionTimeoutContainer.onIdle",
        });
      } else {
        logger.info("✅ Session lock activated successfully", {
          component: "SessionTimeoutContainer.onIdle",
        });
      }
    } catch (lockError) {
      logger.error(
        "Exception while setting session lock cookie - will show modal anyway",
        lockError,
        {
          component: "SessionTimeoutContainer.onIdle",
        },
      );
    }
  }, [broadcastState, setIsIdle, openWarning]);

  const onActive = useCallback(() => {
    if (isIdle) return;
    idleTimer.reset();
  }, [isIdle]);

  const idleTimer = useIdleTimer({
    onIdle,
    onActive,
    timeout: SESSION_CONFIG.IDLE_TIMEOUT,
    throttle: 500,
    disabled: !loggedIn || isIdle,
  });

  const handleUserLogOut = useCallback(async () => {
    if (hasLoggedOutRef.current) return;
    hasLoggedOutRef.current = true;

    setLoading(true);
    setIsIdle(false);
    closeWarning();
    broadcastState(false);

    try {
      logger.info("🚪 Logging user out - session timed out", {
        component: "SessionTimeoutContainer.handleUserLogOut",
      });

      const response = await logUserOut();

      if (response.success) {
        logger.info("✅ Logout successful", {
          component: "SessionTimeoutContainer.handleUserLogOut",
        });
      } else {
        logger.warn(
          "⚠️ Logout response indicated failure, but proceeding with redirect",
          {
            component: "SessionTimeoutContainer.handleUserLogOut",
          },
        );
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("current-organization-id");

          const storageKeys = [
            "tether-requisitions",
            "tether-purchase-orders",
            "tether-payment-vouchers",
            "tether-goods-received-notes",
            "tether-budgets",
            "tether-requisition-action-history",
          ];

          storageKeys.forEach((key) => {
            localStorage.removeItem(key);
          });

          const allKeys = Object.keys(localStorage);
          const permissionKeys = allKeys.filter(
            (key) =>
              key.startsWith("permissions_") ||
              key.startsWith("permissions_expiry_"),
          );
          permissionKeys.forEach((key) => {
            localStorage.removeItem(key);
          });

          logger.info("✅ Cleared all organizational data from localStorage", {
            component: "SessionTimeoutContainer.handleUserLogOut",
          });
        } catch (error) {
          logger.error("Failed to clear localStorage on logout", error, {
            component: "SessionTimeoutContainer.handleUserLogOut",
          });
        }
      }

      window.location.replace("/login");
    } catch (error) {
      logger.error("❌ Logout error", error, {
        component: "SessionTimeoutContainer.handleUserLogOut",
      });
      window.location.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [broadcastState, setIsIdle, closeWarning, setLoading]);

  const handleStillHere = useCallback(async () => {
    setLoading(true);
    try {
      logger.debug(
        "🔓 User clicked 'I'm still here' - attempting to unlock session",
        {
          component: "SessionTimeoutContainer.handleStillHere",
        },
      );

      const success = await lockScreenOnUserIdle(false);

      if (success) {
        logger.info("✅ Session unlocked and refreshed", {
          component: "SessionTimeoutContainer.handleStillHere",
        });
        setIsIdle(false);
        closeWarning();
        broadcastState(false);
        idleTimer.reset();
        return;
      }

      logger.warn(
        "Session unlock returned false, attempting fallback token refresh",
        {
          component: "SessionTimeoutContainer.handleStillHere",
        },
      );

      const refreshResponse = await getRefreshToken();

      if (refreshResponse.success) {
        logger.info("✅ Fallback: Token refreshed successfully", {
          component: "SessionTimeoutContainer.handleStillHere",
        });
        setIsIdle(false);
        closeWarning();
        broadcastState(false);
        idleTimer.reset();
        return;
      }

      logger.error("Both unlock and refresh failed", {
        component: "SessionTimeoutContainer.handleStillHere",
      });

      toast.error("Session expired. Please log in again.");
      await handleUserLogOut();
    } catch (error) {
      logger.error("❌ Critical error in handleStillHere", error, {
        component: "SessionTimeoutContainer.handleStillHere",
      });
      toast.error("An unexpected error occurred. Logging out...");
      await handleUserLogOut();
    } finally {
      setLoading(false);
    }
  }, [
    idleTimer,
    handleUserLogOut,
    broadcastState,
    setIsIdle,
    closeWarning,
    setLoading,
  ]);

  if (!loggedIn) return null;

  return (
    <SessionTimeoutWarningDialog
      onStillHere={handleStillHere}
      onLogout={handleUserLogOut}
    />
  );
}

export default SessionTimeoutContainer;
