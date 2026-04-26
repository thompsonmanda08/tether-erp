"use client";

import {
  useOfflineStatus,
  useQueueStats,
} from "@/hooks/use-offline-queue-processor";
import { useNetwork } from "@/hooks/use-network";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  WifiOff,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

/**
 * Offline status indicator component
 * Shows network status and pending sync operations
 */
export function OfflineIndicator() {
  const { online } = useNetwork();
  const isOffline = useOfflineStatus();
  const stats = useQueueStats();

  // Don't show anything if online and no pending operations
  if (online && stats.total === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${
            isOffline
              ? "text-orange-600 hover:text-orange-700"
              : stats.pending > 0
                ? "text-blue-600 hover:text-blue-700"
                : "text-green-600 hover:text-green-700"
          }`}
        >
          {isOffline ? (
            <WifiOff className="h-4 w-4" />
          ) : stats.processing > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}

          {isOffline ? (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            >
              Offline
            </Badge>
          ) : stats.pending > 0 ? (
            <Badge
              variant="secondary"
              className="bg-blue-600 text-white dark:bg-blue-900/30 dark:text-blue-300"
            >
              {stats.pending} pending
            </Badge>
          ) : stats.processing > 0 ? (
            <Badge
              variant="secondary"
              className="bg-blue-600 text-white dark:bg-blue-900/30 dark:text-blue-300"
            >
              Syncing...
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {isOffline ? (
              <>
                <WifiOff className="h-5 w-5 text-orange-600" />
                <div>
                  <h4 className="font-semibold text-orange-800">
                    You're offline
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Changes will sync when connection is restored
                  </p>
                </div>
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Connected</h4>
                  <p className="text-sm text-muted-foreground">
                    All changes are being synced
                  </p>
                </div>
              </>
            )}
          </div>

          {stats.total > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h5 className="font-medium">Sync Status</h5>

              <div className="space-y-2">
                {stats.pending > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <Badge variant="secondary">{stats.pending}</Badge>
                  </div>
                )}

                {stats.processing > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      <span className="text-sm">Syncing</span>
                    </div>
                    <Badge variant="secondary">{stats.processing}</Badge>
                  </div>
                )}

                {stats.completed > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <Badge variant="secondary">{stats.completed}</Badge>
                  </div>
                )}

                {stats.failed > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Failed</span>
                    </div>
                    <Badge variant="destructive">{stats.failed}</Badge>
                  </div>
                )}
              </div>

              {stats.failed > 0 && (
                <p className="text-xs text-muted-foreground">
                  Failed operations will be retried automatically
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple offline banner for full-width notifications
 */
export function OfflineBanner() {
  const isOffline = useOfflineStatus();
  const stats = useQueueStats();

  if (!isOffline && stats.pending === 0) {
    return null;
  }

  return (
    <div
      className={`w-full px-4 py-2 text-center text-sm ${
        isOffline
          ? "bg-orange-50 text-orange-800 border-b border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50"
          : "bg-blue-600 text-white border-b border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50"
      }`}
    >
      {isOffline ? (
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Changes will sync when connected.</span>
          {stats.pending > 0 && (
            <Badge variant="secondary" className="ml-2">
              {stats.pending} pending
            </Badge>
          )}
        </div>
      ) : stats.pending > 0 ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing {stats.pending} offline changes...</span>
        </div>
      ) : null}
    </div>
  );
}
