"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { clearPermissionCache } from "@/hooks/use-permissions";

/**
 * Debug component to visualize current user permissions
 * Useful for testing the new dynamic permission system
 */
export function PermissionsDebug() {
  const {
    hasPermission,
    getPermissions,
    isAdmin,
    isApprover,
    isRequester,
    isFinance,
    userRole,
    isLoading,
    error,
    rawPermissions,
    permissionSource,
  } = usePermissions();

  const handleClearCache = () => {
    clearPermissionCache();
    // Force a page reload to see the effect
    window.location.reload();
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Loading Permissions...</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Permission Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const permissions = getPermissions();

  const getSourceInfo = (source: typeof permissionSource) => {
    switch (source) {
      case 'backend':
        return {
          label: '🌐 Backend API',
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          description: 'Permissions loaded from live API and cached'
        };
      case 'user_session':
        return {
          label: '👤 User Session',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          description: 'Permissions included in user session'
        };
      case 'cache':
        return {
          label: '📦 Local Cache',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          description: 'Cached permissions from previous API call (offline mode)'
        };
      case 'fallback_builtin':
        return {
          label: '🏗️ Built-in Fallback',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          description: 'Hardcoded permissions for built-in role (deprecated)'
        };
      case 'fallback_viewer':
        return {
          label: '🚨 Emergency Fallback',
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          description: 'Emergency permissions (no cache available)'
        };
      default:
        return {
          label: '❓ Unknown',
          color: 'bg-muted text-muted-foreground',
          description: 'Unknown permission source'
        };
    }
  };

  const sourceInfo = getSourceInfo(permissionSource);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>User Permissions Debug</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearCache}
            className="text-xs"
          >
            Clear Cache
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Role Info */}
        <div>
          <h3 className="font-semibold mb-2">Role Information</h3>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Role: {userRole || "None"}</Badge>
            {isAdmin() && <Badge variant="default">Admin</Badge>}
            {isApprover() && <Badge variant="secondary">Approver</Badge>}
            {isRequester() && <Badge variant="secondary">Requester</Badge>}
            {isFinance() && <Badge variant="secondary">Finance</Badge>}
          </div>
        </div>

        {/* Permission Source Info */}
        <div>
          <h3 className="font-semibold mb-2">Permission Source</h3>
          <div className="bg-muted p-3 rounded">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${sourceInfo.color}`}>
                {sourceInfo.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{sourceInfo.description}</p>
          </div>
        </div>

        {/* Raw Permissions from Backend */}
        <div>
          <h3 className="font-semibold mb-2">Raw Backend Permissions</h3>
          <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
            {rawPermissions.length > 0 ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(rawPermissions, null, 2)}</pre>
            ) : (
              <p className="text-muted-foreground">No raw permissions found</p>
            )}
          </div>
        </div>

        {/* Parsed Permissions */}
        <div>
          <h3 className="font-semibold mb-2">Parsed Permissions ({permissions.length})</h3>
          <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
            {permissions.length > 0 ? (
              permissions.map((perm, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {perm.resource}:{perm.action}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No permissions found</p>
            )}
          </div>
        </div>

        {/* Permission Tests */}
        <div>
          <h3 className="font-semibold mb-2">Permission Tests</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Can view requisitions:</span>
              <Badge variant={hasPermission("requisition", "view") ? "default" : "destructive"}>
                {hasPermission("requisition", "view") ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Can approve requisitions:</span>
              <Badge variant={hasPermission("requisition", "approve") ? "default" : "destructive"}>
                {hasPermission("requisition", "approve") ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Can create budgets:</span>
              <Badge variant={hasPermission("budget", "create") ? "default" : "destructive"}>
                {hasPermission("budget", "create") ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Can manage users:</span>
              <Badge variant={hasPermission("organization", "manage_users") ? "default" : "destructive"}>
                {hasPermission("organization", "manage_users") ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Cache Information */}
        <div>
          <h3 className="font-semibold mb-2">Cache Information</h3>
          <div className="bg-muted p-3 rounded text-sm">
            <p className="text-muted-foreground mb-2">
              <strong>All role permissions</strong> (built-in and custom) are cached for 24 hours when successfully loaded from the API.
            </p>
            <p className="text-muted-foreground">
              Use "Clear Cache" to test emergency fallback behavior when both API and cache fail.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}