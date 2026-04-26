"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Shield,
  Zap,
  Eye,
  AlertTriangle,
  TrendingUp,
  Database,
  Bell,
  Palette,
  Link,
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
  Tooltip,
} from "recharts";
import type { SettingsStats } from "@/app/_actions/settings";

interface SettingsStatsGridProps {
  stats: SettingsStats;
  isLoading?: boolean;
}

export function SettingsStatsGrid({
  stats,
  isLoading = false,
}: SettingsStatsGridProps) {
  const categoryIcons = {
    general: Settings,
    security: Shield,
    performance: Zap,
    integration: Link,
    notification: Bell,
    ui: Palette,
  };

  const categoryColors = {
    general: "#3b82f6",
    security: "#ef4444",
    performance: "#10b981",
    integration: "#f59e0b",
    notification: "#8b5cf6",
    ui: "#06b6d4",
  };

  const categoryData = Object.entries(stats.byCategory).map(
    ([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count,
      color:
        categoryColors[category as keyof typeof categoryColors] || "#6b7280",
    }),
  );

  const environmentData = Object.entries(stats.byEnvironment).map(
    ([env, count]) => ({
      name:
        env === "all" ? "All Envs" : env.charAt(0).toUpperCase() + env.slice(1),
      value: count,
    }),
  );

  const typeData = Object.entries(stats.byType).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }));

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Poor";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Settings
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all environments
            </p>
          </CardContent>
        </Card>

        {/* Secret Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Secret Settings
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.secretSettings}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.secretSettings / stats.total) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        {/* Required Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Required Settings
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.requiredSettings}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.requiredSettings / stats.total) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getHealthColor(stats.healthScore)}`}
            >
              {stats.healthScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              {getHealthStatus(stats.healthScore)} configuration
            </p>
            <Progress value={stats.healthScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryData.map((category) => {
                  const Icon =
                    categoryIcons[
                      category.name.toLowerCase() as keyof typeof categoryIcons
                    ] || Settings;
                  return (
                    <div
                      key={category.name}
                      className="flex items-center space-x-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{category.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {category.value}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings by Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={environmentData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeData.map((type) => {
                const percentage = (type.value / stats.total) * 100;
                return (
                  <div key={type.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{type.name}</span>
                      <span className="text-muted-foreground">
                        {type.value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">Recently Modified</span>
                </div>
                <Badge variant="outline">{stats.recentlyModified}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Configuration Health</span>
                </div>
                <Badge
                  variant={
                    stats.healthScore >= 90
                      ? "default"
                      : stats.healthScore >= 70
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {getHealthStatus(stats.healthScore)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm">Security Settings</span>
                </div>
                <Badge variant="outline">
                  {Object.entries(stats.byCategory).find(
                    ([cat]) => cat === "security",
                  )?.[1] || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-sm">Performance Settings</span>
                </div>
                <Badge variant="outline">
                  {Object.entries(stats.byCategory).find(
                    ([cat]) => cat === "performance",
                  )?.[1] || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
