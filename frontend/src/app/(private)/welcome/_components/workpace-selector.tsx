"use client";

import { useState, useEffect } from "react";
import { useOrganizationContext } from "@/hooks/use-organization";
import { useSession } from "@/hooks/use-session";
import {
  useSelectOrganization,
  useLogout,
} from "@/hooks/use-organization-mutations";
import { LogOut, Loader2, ArrowRight, Plus, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components";
import Logo from "@/components/base/logo";
import { WorkspaceSkeleton } from "./workspace-skeleton";
import { EmptyWorkspaceState } from "./empty-workspace-state";
import { debugSession } from "@/app/_actions/debug";
import { trackPageRedirect, trackOrgSwitchError } from "@/lib/auth-monitoring";

interface WorkspaceSelectorProps {
  onCreateWorkspace?: () => void;
  showLogo?: boolean;
  showSignOut?: boolean;
}

export function WorkspaceSelector({
  onCreateWorkspace,
  showLogo = true,
  showSignOut = true,
}: WorkspaceSelectorProps) {
  const { user } = useSession();
  const {
    userOrganizations,
    currentOrganization,
    isLoading,
    error,
    retryFetch,
  } = useOrganizationContext();
  const { selectOrganization, isPending: isNavigating } =
    useSelectOrganization();
  const { logout } = useLogout();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    currentOrganization?.id ?? null,
  );
  const [retryCount, setRetryCount] = useState(0);
  // Only show skeleton if we genuinely have no data yet (SSR provides data instantly)
  const [showSkeleton, setShowSkeleton] = useState(
    userOrganizations.length === 0 && isLoading,
  );
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Enhanced error recovery for session issues
  useEffect(() => {
    if (error && error.includes("No valid session found")) {
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);

        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          retryFetch();
        }, delay);
      } else {
        // After 3 retries, force logout to clear invalid session
        logout();
      }

      // Debug session for troubleshooting
      debugSession().then(setDebugInfo);
    }
  }, [error, retryCount, retryFetch, logout]);

  // Reset retry count on successful load
  useEffect(() => {
    if (!error && userOrganizations.length > 0) {
      setRetryCount(0);
    }
  }, [error, userOrganizations.length]);

  // Show skeleton only during genuine initial load (no data at all)
  // Never re-show skeleton while navigating — keep the org list visible
  useEffect(() => {
    if (!isLoading && userOrganizations.length > 0) {
      setShowSkeleton(false);
    } else if (isLoading && userOrganizations.length === 0 && !isNavigating) {
      setShowSkeleton(true);
    }
  }, [isLoading, userOrganizations.length, isNavigating]);

  // Enhanced organization selection with validation
  const handleSelectOrganization = async (orgId: string) => {
    if (isNavigating) return;

    // Validate organization exists in current list
    const orgExists = userOrganizations.some((org) => org.id === orgId);
    if (!orgExists) {
      return;
    }

    setSelectedOrgId(orgId);

    try {
      await selectOrganization(orgId);
    } catch (error) {
      trackOrgSwitchError(error, orgId, user?.id);
      // Reset to current organization on failure
      setSelectedOrgId(currentOrganization?.id ?? null);
    }
  };

  // Track page visits for redirect loop detection
  useEffect(() => {
    trackPageRedirect("/welcome");
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="w-full max-w-xl">
      {/* Card */}
      <div className="bg-card rounded-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {showLogo && <Logo isFull />}
          <div className="flex items-center justify-between pt-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground text-left">
                Select a workspace
              </h1>
              <p className="text-muted-foreground text-sm text-left">
                Signed in as{" "}
                {user?.email ? (
                  <span className="font-medium text-foreground">
                    {user.email}
                  </span>
                ) : (
                  <span className="inline-block h-4 w-32 bg-muted animate-pulse rounded align-middle" />
                )}
              </p>
            </div>
            {showSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isNavigating}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="space-y-4">
          {error && !isNavigating ? (
            // Error state — only show when NOT navigating (cache clear can cause transient errors)
            <div className="text-center py-8 border border-destructive/20 bg-destructive/5 rounded-lg">
              <p className="text-destructive mb-4">Failed to load workspaces</p>
              <p className="text-sm text-muted-foreground mb-4">
                {error.includes("No valid session found")
                  ? "Session expired. Please sign in again."
                  : error}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={retryFetch}
                  variant="outline"
                  size="sm"
                  disabled={isNavigating}
                >
                  Retry
                </Button>
                {error.includes("No valid session found") && (
                  <>
                    <Button
                      onClick={handleLogout}
                      variant="default"
                      size="sm"
                      disabled={isNavigating}
                    >
                      Sign In Again
                    </Button>
                    <Button
                      onClick={() => setShowDebug(!showDebug)}
                      variant="ghost"
                      size="sm"
                      disabled={isNavigating}
                    >
                      <Bug className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {showDebug && debugInfo && (
                <div className="mt-4 p-3 bg-muted rounded text-xs text-left">
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : showSkeleton && !isNavigating ? (
            // Loading skeleton — never show while navigating to dashboard
            <WorkspaceSkeleton />
          ) : userOrganizations.length === 0 ? (
            // No organizations state
            <EmptyWorkspaceState
              onCreateWorkspace={onCreateWorkspace}
              onSignOut={showSignOut ? handleLogout : undefined}
              showSignOut={showSignOut}
              isNavigating={isNavigating}
            />
          ) : (
            // Organizations List
            <div className="space-y-3 animate-in fade-in-0 duration-500 slide-in-from-bottom-2">
              {userOrganizations.map((org, index) => {
                const isDefault = currentOrganization?.id === org.id;
                const isSelected = selectedOrgId === org.id;

                return (
                  <div
                    key={org.id}
                    onClick={(e) => {
                      // Check if the click originated from the upgrade button or its children
                      const target = e.target as HTMLElement;
                      const isUpgradeButton = target.closest(
                        "button[data-upgrade-button]",
                      );

                      if (!isUpgradeButton && !isNavigating) {
                        handleSelectOrganization(org.id);
                      }
                    }}
                    className={cn(
                      "group relative w-full bg-background rounded-lg p-4 cursor-pointer transition-all duration-200 border text-left",
                      "hover:shadow-md hover:border-primary/50",
                      "animate-in fade-in-0 slide-in-from-bottom-1",
                      isDefault &&
                        "border-primary shadow-sm ring-1 ring-primary/20",
                      !isDefault && "border-border",
                      isNavigating && isSelected && "ring-2 ring-primary/40",
                      isNavigating && "opacity-50 cursor-not-allowed",
                    )}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationDuration: "400ms",
                    }}
                  >
                    {/* Organization Content */}
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                            style={{
                              backgroundColor: org.primaryColor || "#0c54e7",
                            }}
                          >
                            {org.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-base">
                          {org.name}
                        </h3>
                        {org.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {org.description}
                          </p>
                        )}

                        {/* Organization Details */}
                        <div className="flex items-center gap-2 mt-2">
                          {isDefault && (
                            <Badge variant={"default"}>Default</Badge>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        {isNavigating && isSelected ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Create New Workspace Button */}
              {onCreateWorkspace && (
                <div
                  className={cn(
                    "w-full flex items-center justify-center p-4 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group animate-in fade-in-0 slide-in-from-bottom-1",
                    isNavigating
                      ? "opacity-50 cursor-not-allowed hover:text-muted-foreground hover:border-border hover:bg-transparent"
                      : "cursor-pointer",
                  )}
                  onClick={() => !isNavigating && onCreateWorkspace()}
                  style={{
                    animationDelay: `${userOrganizations.length * 100 + 100}ms`,
                    animationDuration: "400ms",
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-medium">Create new workspace</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}
