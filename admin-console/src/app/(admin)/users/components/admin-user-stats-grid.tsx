"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Shield,
  Lock,
  Unlock,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { AdminUserStats } from "@/app/_actions/admin-users";

interface AdminUserStatsGridProps {
  stats: AdminUserStats | null;
  isLoading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function AdminUserStatsGrid({
  stats,
  isLoading,
}: AdminUserStatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No statistics available</p>
        </CardContent>
      </Card>
    );
  }

  const roleDistributionData = stats.role_distribution.map((item) => ({
    name: item.role_name,
    value: item.user_count,
    percentage: item.percentage,
  }));

  const activityData = [
    { name: "Daily", value: stats.activity_stats.daily_active },
    { name: "Weekly", value: stats.activity_stats.weekly_active },
    { name: "Monthly", value: stats.activity_stats.monthly_active },
  ];

  const securityData = [
    {
      name: "Failed Logins",
      value: stats.security_stats.failed_login_attempts,
    },
    { name: "Password Resets", value: stats.security_stats.password_resets },
    { name: "Account Lockouts", value: stats.security_stats.account_lockouts },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Admin Users
            </CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_admin_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_admin_users} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.super_admins}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.super_admins / stats.total_admin_users) * 100).toFixed(
                1,
              )}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Locked Accounts
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.locked_accounts}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (stats.locked_accounts / stats.total_admin_users) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.two_factor_enabled}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (stats.two_factor_enabled / stats.total_admin_users) *
                100
              ).toFixed(1)}
              % coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recent_logins}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Never Logged In
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.never_logged_in}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (stats.never_logged_in / stats.total_admin_users) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.security_stats.failed_login_attempts}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Password Resets
            </CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.security_stats.password_resets}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Role Distribution Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Role Distribution</CardTitle>
            <CardDescription>Admin users by role assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      `${name} (${percentage.toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">User Activity</CardTitle>
            <CardDescription>Active admin users by time period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Security Events Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Security Events</CardTitle>
            <CardDescription>
              Security-related events and incidents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={securityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Details */}
      {stats.role_distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Role Assignment Details</CardTitle>
            <CardDescription>
              Detailed breakdown of admin user role assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.role_distribution.map((role) => (
                <div
                  key={role.role_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{role.role_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {role.user_count} users
                    </div>
                  </div>
                  <Badge variant="outline">{role.percentage.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
