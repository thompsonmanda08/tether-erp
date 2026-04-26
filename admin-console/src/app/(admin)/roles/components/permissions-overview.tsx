"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, Shield, Lock } from "lucide-react";
import { type Permission } from "@/app/_actions/roles";

interface PermissionsOverviewProps {
  permissions: Permission[];
  isLoading?: boolean;
}

export function PermissionsOverview({
  permissions,
  isLoading,
}: PermissionsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "system_management":
        return <Settings className="h-4 w-4" />;
      case "user_management":
        return <Shield className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(permissionsByCategory).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">System Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {permissions.filter((p) => p.is_system_permission).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custom Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {permissions.filter((p) => !p.is_system_permission).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions by Category */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(permissionsByCategory).map(
          ([category, categoryPermissions]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  {getCategoryIcon(category)}
                  {category.replace(/_/g, " ")}
                  <Badge variant="outline" className="ml-auto">
                    {categoryPermissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {categoryPermissions.map((permission, index) => (
                      <div key={permission.id}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {permission.display_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </div>
                            </div>
                            {permission.is_system_permission && (
                              <Badge
                                variant="destructive"
                                className="text-xs ml-2"
                              >
                                System
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {permission.resource}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {permission.action}
                            </Badge>
                          </div>
                        </div>
                        {index < categoryPermissions.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
