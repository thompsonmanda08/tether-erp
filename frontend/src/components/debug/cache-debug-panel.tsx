"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, Database, Server, HardDrive } from "lucide-react";
import {
  useCacheRevalidation,
  useCacheStats,
} from "@/hooks/use-cache-revalidation";
import { useOrganizationContext } from "@/hooks/use-organization";

/**
 * Debug panel for cache management
 * Only show in development or when explicitly enabled
 */
export function CacheDebugPanel() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { currentOrganization } = useOrganizationContext();
  const { getCacheStats } = useCacheStats();
  const {
    revalidateOrganizationData,
    revalidateQueries,
    revalidatePaths,
    revalidateTags,
    revalidateCurrentPage,
    forceHardRefresh,
  } = useCacheRevalidation();

  const cacheStats = getCacheStats();

  const handleAction = async (
    actionName: string,
    action: () => Promise<any>
  ) => {
    setIsLoading(actionName);
    try {
      const result = await action();
    } catch (error) {
      console.error(`[CacheDebugPanel] ${actionName} failed:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Debug Panel
        </CardTitle>
        <CardDescription>
          Development tool for cache management and debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Statistics */}
        <div>
          <h3 className="text-sm font-medium mb-3">Cache Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="text-center">
              <Badge variant="outline" className="w-full">
                Total: {cacheStats.totalQueries}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="default" className="w-full">
                Active: {cacheStats.activeQueries}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="w-full">
                Stale: {cacheStats.staleQueries}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="destructive" className="w-full">
                Error: {cacheStats.errorQueries}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="w-full">
                Loading: {cacheStats.loadingQueries}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Organization Info */}
        <div>
          <h3 className="text-sm font-medium mb-2">Current Organization</h3>
          <div className="text-sm text-muted-foreground">
            {currentOrganization ? (
              <span>
                {currentOrganization.name} ({currentOrganization.id})
              </span>
            ) : (
              <span>No organization selected</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Cache Actions */}
        <div>
          <h3 className="text-sm font-medium mb-3">Cache Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Organization Cache */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleAction("revalidateOrganization", () =>
                  revalidateOrganizationData(currentOrganization?.id)
                )
              }
              disabled={isLoading === "revalidateOrganization"}
              className="justify-start"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading === "revalidateOrganization" ? "animate-spin" : ""}`}
              />
              Revalidate Organization
            </Button>

            {/* Current Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleAction("revalidatePage", revalidateCurrentPage)
              }
              disabled={isLoading === "revalidatePage"}
              className="justify-start"
            >
              <Server
                className={`h-4 w-4 mr-2 ${isLoading === "revalidatePage" ? "animate-spin" : ""}`}
              />
              Revalidate Current Page
            </Button>

            {/* Specific Queries */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleAction("revalidateQueries", () =>
                  revalidateQueries(["requisitions", "dashboard", "analytics"])
                )
              }
              disabled={isLoading === "revalidateQueries"}
              className="justify-start"
            >
              <Database
                className={`h-4 w-4 mr-2 ${isLoading === "revalidateQueries" ? "animate-spin" : ""}`}
              />
              Revalidate Key Queries
            </Button>

            {/* Specific Paths */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleAction("revalidatePaths", () =>
                  revalidatePaths(["/dashboard", "/requisitions", "/analytics"])
                )
              }
              disabled={isLoading === "revalidatePaths"}
              className="justify-start"
            >
              <Server
                className={`h-4 w-4 mr-2 ${isLoading === "revalidatePaths" ? "animate-spin" : ""}`}
              />
              Revalidate Key Paths
            </Button>

            {/* Cache Tags */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleAction("revalidateTags", () =>
                  revalidateTags([
                    "requisitions",
                    "dashboard",
                    "organization-data",
                  ])
                )
              }
              disabled={isLoading === "revalidateTags"}
              className="justify-start"
            >
              <HardDrive
                className={`h-4 w-4 mr-2 ${isLoading === "revalidateTags" ? "animate-spin" : ""}`}
              />
              Revalidate Cache Tags
            </Button>

            {/* Hard Refresh */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction("hardRefresh", forceHardRefresh)}
              disabled={isLoading === "hardRefresh"}
              className="justify-start"
            >
              <Trash2
                className={`h-4 w-4 mr-2 ${isLoading === "hardRefresh" ? "animate-spin" : ""}`}
              />
              Force Hard Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Revalidate Organization:</strong> Clears all org-scoped
            cache (client + server)
          </p>
          <p>
            <strong>Revalidate Current Page:</strong> Refreshes data for the
            current page only
          </p>
          <p>
            <strong>Revalidate Key Queries:</strong> Invalidates specific React
            Query cache
          </p>
          <p>
            <strong>Revalidate Key Paths:</strong> Revalidates specific Next.js
            paths
          </p>
          <p>
            <strong>Revalidate Cache Tags:</strong> Revalidates specific Next.js
            cache tags
          </p>
          <p>
            <strong>Force Hard Refresh:</strong> Clears everything and reloads
            the page
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
