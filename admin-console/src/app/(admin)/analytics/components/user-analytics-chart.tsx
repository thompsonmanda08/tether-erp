"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, TrendingUp, Activity, UserCheck } from "lucide-react";
import { type UserAnalytics } from "@/app/_actions/analytics";

interface UserAnalyticsChartProps {
  analytics: UserAnalytics | null;
  isLoading?: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function UserAnalyticsChart({
  analytics,
  isLoading,
}: UserAnalyticsChartProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            No user analytics data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const growthChartData = (analytics.user_growth_trend ?? [])?.map((point) => ({
    date: new Date(point.date).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }),
    totalUsers: point.total_users,
    newUsers: point.new_users,
    activeUsers: point.active_users,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* User Growth Trend */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            User Growth Trend
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Total: {(analytics.total_users ?? 0).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              New this period:{" "}
              {(analytics.new_users_this_period ?? 0).toLocaleString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalUsers"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Total Users"
                />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                  name="Active Users"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Demographics by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users by Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.user_demographics?.by_role ?? []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, percentage }) => `${role}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics.user_demographics?.by_role ?? []).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {(analytics.user_demographics?.by_role ?? [])?.map(
              (role, index) => (
                <div
                  key={role.role}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="capitalize">
                    {role.role}: {role.count}
                  </span>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            User Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.user_demographics?.by_status ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="status"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            {(analytics.user_demographics?.by_status ?? [])?.map((status) => (
              <div key={status.status} className="text-center">
                <div className="font-medium capitalize">{status.status}</div>
                <div className="text-muted-foreground">
                  {status.count} ({status.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            User Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(
                  analytics.engagement_metrics?.daily_active_users ?? 0
                )?.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Daily Active Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(
                  analytics.engagement_metrics?.weekly_active_users ?? 0
                )?.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Weekly Active Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(
                  analytics.engagement_metrics?.monthly_active_users ?? 0
                )?.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Monthly Active Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(
                  (analytics.engagement_metrics?.average_session_duration ??
                    0) / 60,
                )}
                m
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Session Duration
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {(analytics.engagement_metrics?.sessions_per_user ?? 0).toFixed(
                  1,
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Sessions per User
              </div>
            </div>
          </div>

          {/* Engagement Ratios */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">DAU/MAU Ratio</div>
              <div className="text-lg font-semibold">
                {analytics.engagement_metrics?.monthly_active_users
                  ? (
                      ((analytics.engagement_metrics.daily_active_users ?? 0) /
                        analytics.engagement_metrics.monthly_active_users) *
                      100
                    )?.toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">WAU/MAU Ratio</div>
              <div className="text-lg font-semibold">
                {analytics.engagement_metrics?.monthly_active_users
                  ? (
                      ((analytics.engagement_metrics.weekly_active_users ?? 0) /
                        analytics.engagement_metrics.monthly_active_users) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                User Activation
              </div>
              <div className="text-lg font-semibold">
                {analytics.total_users
                  ? (
                      ((analytics.active_users ?? 0) / analytics.total_users) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
