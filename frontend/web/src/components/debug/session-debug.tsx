"use client";

import { useEffect, useState } from "react";
import { useTokenRefresh } from "@/hooks/use-auth-queries";
import { useSession } from "@/hooks/use-session";

export function SessionDebug() {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated } = useSession();
  const { session, needsRefresh, isRefreshing, refreshError, refreshData } =
    useTokenRefresh();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const timeUntilExpiry = session?.expiresAt
    ? Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
    : null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50">
      <h3 className="font-bold mb-2 text-yellow-400">Session Debug</h3>

      <div className="space-y-1">
        <div>Auth: {isAuthenticated ? "✅" : "❌"}</div>
        <div>User: {user?.name || "None"}</div>
        <div>Has Access Token: {session?.access_token ? "✅" : "❌"}</div>
        <div>Has Refresh Token: {session?.refresh_token ? "✅" : "❌"}</div>
        <div>
          Expires At:{" "}
          {session?.expiresAt
            ? new Date(session.expiresAt).toLocaleString()
            : "N/A"}
        </div>
        <div>
          Time Until Expiry: {timeUntilExpiry ? `${timeUntilExpiry}s` : "N/A"}
        </div>
        <div>Needs Refresh: {needsRefresh ? "🔄" : "✅"}</div>
        <div>Is Refreshing: {isRefreshing ? "🔄" : "❌"}</div>

        {refreshError && (
          <div className="text-red-400 mt-2">
            <div>Refresh Error:</div>
            <div className="text-xs">{refreshError.message}</div>
          </div>
        )}

        {refreshData && (
          <div className="text-green-400 mt-2">
            <div>Last Refresh: ✅</div>
            <div className="text-xs">
              {refreshData.data?.expiresAt
                ? new Date(refreshData.data.expiresAt).toLocaleTimeString()
                : "Success"}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
        Updates every second
      </div>
    </div>
  );
}
