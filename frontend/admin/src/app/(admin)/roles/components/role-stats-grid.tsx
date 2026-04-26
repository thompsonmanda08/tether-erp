"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Users,
  Settings,
  Lock,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { type RoleStats } from "@/app/_actions/roles";

interface RoleStatsGridProps {
  stats: RoleStats | null;
  isLoading?: boolean;
}

export function RoleStatsGrid({ stats, isLoading }: RoleStatsGridProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No statistics available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Roles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(stats.total_roles)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>{formatNumber(stats.active_roles)} active</span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(stats.custom_roles)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>
              {((stats.custom_roles / stats.total_roles) * 100).toFixed(1)}% of
              total
            </span>
          </div>
        </CardContent>
      </Card>

      {/* System Roles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Roles</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatNumber(stats.system_roles)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              Protected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Permissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Permissions
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(stats.total_permissions)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Activity className="h-3 w-3 mr-1" />
            <span>Available permissions</span>
          </div>
        </CardContent>
      </Card>

      {/* Roles with Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Roles with Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(stats.roles_with_users)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>
              {((stats.roles_with_users / stats.total_roles) * 100).toFixed(1)}%
              utilization
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Role Distribution Chart */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.role_distribution.slice(0, 5).map((role, index) => (
              <div key={role.role_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{role.role_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {role.user_count} users
                    </span>
                    <span className="font-medium">
                      {role.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={role.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Most Used Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Used Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.most_used_permissions
              .slice(0, 5)
              .map((permission, index) => (
                <div
                  key={permission.permission_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {permission.permission_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Used in {permission.role_count} roles
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {permission.role_count}
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
