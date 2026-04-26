"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useDashboardMetrics } from "@/hooks/use-dashboard";

function formatTimeAgo(dateString: string | null | undefined) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  accent?: "default" | "warning" | "danger" | "success";
  isLoading?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = "default",
  isLoading,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  const accentClass =
    accent === "warning"
      ? "text-orange-600"
      : accent === "danger"
        ? "text-red-600"
        : accent === "success"
          ? "text-green-600"
          : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={accentClass}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div
              className={`flex items-center gap-0.5 text-xs ${
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.value >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total Organizations"
          value={dashboardData?.total_organizations ?? 0}
          subtitle={`${dashboardData?.active_organizations ?? 0} active`}
          icon={<Building2 className="h-4 w-4" />}
          isLoading={dashboardLoading}
        />
        <KPICard
          title="Active Users"
          value={dashboardData?.active_users ?? 0}
          subtitle={`of ${dashboardData?.total_users ?? 0} total`}
          icon={<Users className="h-4 w-4" />}
          isLoading={dashboardLoading}
        />
        <KPICard
          title="Trial Orgs"
          value={dashboardData?.trial_organizations ?? 0}
          subtitle={`${dashboardData?.expired_trials ?? 0} expired`}
          icon={<Clock className="h-4 w-4" />}
          accent={
            (dashboardData?.expired_trials ?? 0) > 0 ? "warning" : "default"
          }
          isLoading={dashboardLoading}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest platform events</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : dashboardData?.recent_activities &&
            dashboardData.recent_activities.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recent_activities.slice(0, 10).map((activity, i) => (
                <div
                  key={activity.id ?? i}
                  className="flex items-start gap-3 py-1 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.action ?? "Unknown action"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.user ?? "System"}
                      </p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
