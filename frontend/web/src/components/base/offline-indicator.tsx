'use client';

import { useOfflineStatus, useQueueStats } from '@/hooks/use-offline-queue-processor';
import { AlertCircle, WifiOff, CheckCircle2 } from 'lucide-react';

/**
 * Offline Indicator Component
 * Shows when user is offline and displays sync status
 *
 * Usage:
 * Import and add to your root layout or providers:
 * <OfflineIndicator />
 */
export function OfflineIndicator() {
  const isOffline = useOfflineStatus();
  const stats = useQueueStats();

  if (!isOffline && stats.total === 0) {
    return null; // Don't show if online and no pending operations
  }

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <WifiOff className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">You are offline</p>
          <p className="text-xs opacity-90">Changes will sync when connection is restored</p>
        </div>
        {stats.total > 0 && (
          <span className="text-xs font-medium bg-amber-700 px-2 py-1 rounded">
            {stats.pending} pending
          </span>
        )}
      </div>
    );
  }

  // Show if there are failed operations
  if (stats.failed > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Sync Issues</p>
          <p className="text-xs opacity-90">
            {stats.failed} changes failed to sync. Retrying automatically...
          </p>
        </div>
        <span className="text-xs font-medium bg-red-700 px-2 py-1 rounded">{stats.failed} failed</span>
      </div>
    );
  }

  // Show if there are pending operations but online
  if (stats.pending > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <CheckCircle2 className="h-5 w-5 animate-pulse" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Syncing Changes</p>
          <p className="text-xs opacity-90">Syncing {stats.pending} pending change(s)...</p>
        </div>
      </div>
    );
  }

  return null;
}
