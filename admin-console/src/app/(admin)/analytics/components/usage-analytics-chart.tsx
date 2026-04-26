"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, Zap, Server, Clock } from "lucide-react";
import { type UsageAnalytics } from "@/app/_actions/analytics";

interface UsageAnalyticsChartProps {
  analytics: UsageAnalytics | null;
  isLoading?: boolean;
}

export function UsageAnalyticsChart({
  analytics,
  isLoading,
}: UsageAnalyticsChartProps) {
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
            No usage analytics data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const usageChartData = analytics?.usage_trends?.map((point) => ({
    date: new Date(point.date)?.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }),
    apiRequests: point.api_requests,
    activeSessions: point.active_sessions,
    uniqueUsers: point.unique_users,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatNumber(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Usage Trends */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Usage Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Total API Requests: {formatNumber(analytics.total_api_requests)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Active Sessions: {formatNumber(analytics.active_sessions)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="apiRequests"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="API Requests"
                />
                <Area
                  type="monotone"
                  dataKey="activeSessions"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                  name="Active Sessions"
                />
                <Line
                  type="monotone"
                  dataKey="uniqueUsers"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Unique Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Feature Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.feature_usage.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="feature_name"
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    formatNumber(value),
                    name,
                  ]}
                />
                <Bar dataKey="usage_count" fill="#8884d8" name="Usage Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4 max-h-32 overflow-y-auto">
            {analytics.feature_usage.slice(0, 5).map((feature, index) => (
              <div
                key={feature.feature_name}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">{feature.feature_name}</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={feature.adoption_rate}
                    className="w-16 h-2"
                  />
                  <span className="font-medium w-12 text-right">
                    {feature.adoption_rate.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Avg Response Time
              </span>
              <div className="text-right">
                <span
                  className={`font-medium ${analytics.performance_metrics.average_response_time <= 200 ? "text-green-600" : analytics.performance_metrics.average_response_time <= 500 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {analytics.performance_metrics.average_response_time}ms
                </span>
                <div className="text-xs text-muted-foreground">
                  <Badge
                    variant={
                      analytics.performance_metrics.average_response_time <= 200
                        ? "default"
                        : analytics.performance_metrics.average_response_time <=
                            500
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {analytics.performance_metrics.average_response_time <= 200
                      ? "Excellent"
                      : analytics.performance_metrics.average_response_time <=
                          500
                        ? "Good"
                        : "Slow"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <div className="text-right">
                <span
                  className={`font-medium ${analytics.performance_metrics.error_rate <= 1 ? "text-green-600" : analytics.performance_metrics.error_rate <= 5 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {analytics.performance_metrics.error_rate.toFixed(2)}%
                </span>
                <div className="text-xs text-muted-foreground">
                  <Badge
                    variant={
                      analytics.performance_metrics.error_rate <= 1
                        ? "default"
                        : analytics.performance_metrics.error_rate <= 5
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {analytics.performance_metrics.error_rate <= 1
                      ? "Excellent"
                      : analytics.performance_metrics.error_rate <= 5
                        ? "Acceptable"
                        : "High"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <div className="text-right">
                <span
                  className={`font-medium ${analytics.performance_metrics.uptime_percentage >= 99.9 ? "text-green-600" : analytics.performance_metrics.uptime_percentage >= 99 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {analytics.performance_metrics.uptime_percentage.toFixed(2)}%
                </span>
                <div className="text-xs text-muted-foreground">
                  <Badge
                    variant={
                      analytics.performance_metrics.uptime_percentage >= 99.9
                        ? "default"
                        : analytics.performance_metrics.uptime_percentage >= 99
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {analytics.performance_metrics.uptime_percentage >= 99.9
                      ? "Excellent"
                      : analytics.performance_metrics.uptime_percentage >= 99
                        ? "Good"
                        : "Poor"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Peak Concurrent Users
              </span>
              <span className="font-medium">
                {formatNumber(
                  analytics.performance_metrics.peak_concurrent_users,
                )}
              </span>
            </div>
          </div>

          {/* Performance Health Indicators */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">System Health</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Response Time
                </span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.max(
                      100 -
                        analytics.performance_metrics.average_response_time /
                          10,
                      0,
                    )}
                    className="w-20 h-2"
                  />
                  <span className="text-xs w-12 text-right">
                    {Math.max(
                      100 -
                        Math.round(
                          analytics.performance_metrics.average_response_time /
                            10,
                        ),
                      0,
                    )}
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Reliability
                </span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={100 - analytics.performance_metrics.error_rate}
                    className="w-20 h-2"
                  />
                  <span className="text-xs w-12 text-right">
                    {(100 - analytics.performance_metrics.error_rate).toFixed(
                      0,
                    )}
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Availability
                </span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={analytics.performance_metrics.uptime_percentage}
                    className="w-20 h-2"
                  />
                  <span className="text-xs w-12 text-right">
                    {analytics.performance_metrics.uptime_percentage.toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Usage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(analytics.total_api_requests)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total API Requests
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(analytics.active_sessions)}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Sessions
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.feature_usage.length}
              </div>
              <div className="text-sm text-muted-foreground">Features Used</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatNumber(
                  analytics.performance_metrics.peak_concurrent_users,
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Peak Concurrent Users
              </div>
            </div>
          </div>

          {/* Top Features by Adoption */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Top Features by Adoption Rate
            </h4>
            {analytics.feature_usage
              .sort((a, b) => b.adoption_rate - a.adoption_rate)
              .slice(0, 5)
              .map((feature, index) => (
                <div
                  key={feature.feature_name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {feature.feature_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(feature.usage_count)} uses •{" "}
                        {formatNumber(feature.unique_users)} users
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {feature.adoption_rate.toFixed(1)}%
                    </div>
                    <Progress
                      value={feature.adoption_rate}
                      className="w-16 h-1 mt-1"
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
