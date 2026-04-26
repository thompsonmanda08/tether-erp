"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { type AnalyticsOverview } from "@/app/_actions/analytics";

interface MetricsGridProps {
  overview: AnalyticsOverview | null | undefined;
  isLoading?: boolean;
}

export function MetricsGrid({ overview, isLoading }: MetricsGridProps) {
  const getTrendIcon = (rate: number) => {
    if (rate > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (rate < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (rate: number) => {
    if (rate > 0) return "text-green-600";
    if (rate < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    const sign = rate > 0 ? "+" : "";
    return `${sign}${rate.toFixed(1)}%`;
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

  if (!overview) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(overview?.total_users || 0)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(overview?.growth_metrics?.user_growth_rate || 0)}
            <span
              className={`ml-1 ${getTrendColor(overview?.growth_metrics?.user_growth_rate || 0)}`}
            >
              {formatPercentage(
                overview?.growth_metrics?.user_growth_rate || 0,
              )}{" "}
              from last period
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(overview?.total_organizations || 0)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(
              overview?.growth_metrics?.organization_growth_rate || 0,
            )}
            <span
              className={`ml-1 ${getTrendColor(overview?.growth_metrics?.organization_growth_rate || 0)}`}
            >
              {formatPercentage(
                overview?.growth_metrics?.organization_growth_rate || 0,
              )}{" "}
              from last period
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(overview?.total_revenue || 0)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon(overview?.growth_metrics?.revenue_growth_rate || 0)}
            <span
              className={`ml-1 ${getTrendColor(overview?.growth_metrics?.revenue_growth_rate || 0)}`}
            >
              {formatPercentage(
                overview?.growth_metrics?.revenue_growth_rate || 0,
              )}{" "}
              from last period
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Active Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Organizations
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(overview?.active_subscriptions || 0)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Activity className="h-3 w-3 mr-1" />
            <span>
              {overview?.total_organizations && overview?.active_subscriptions
                ? (
                    (overview.active_subscriptions /
                      overview.total_organizations) *
                    100
                  ).toFixed(1)
                : "0.0"}
              % of total
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Active Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Active Users
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(overview?.key_metrics?.monthly_active_users || 0)}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>
              {overview?.total_users &&
              overview?.key_metrics?.monthly_active_users
                ? (
                    (overview.key_metrics.monthly_active_users /
                      overview.total_users) *
                    100
                  ).toFixed(1)
                : "0.0"}
              % of total users
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Average Session Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg Session Duration
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(
              (overview?.key_metrics?.average_session_duration || 0) / 60,
            )}
            m
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>
              {overview?.key_metrics?.average_session_duration || 0} seconds
              average
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Feature Adoption Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Feature Adoption
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(overview?.key_metrics?.feature_adoption_rate || 0).toFixed(1)}%
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge
              variant={
                (overview?.key_metrics?.feature_adoption_rate || 0) > 70
                  ? "default"
                  : "secondary"
              }
              className="text-xs"
            >
              {(overview?.key_metrics?.feature_adoption_rate || 0) > 70
                ? "Good"
                : "Needs Improvement"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Churn Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(overview?.growth_metrics?.churn_rate || 0).toFixed(1)}%
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Badge
              variant={
                (overview?.growth_metrics?.churn_rate || 0) < 5
                  ? "default"
                  : "destructive"
              }
              className="text-xs"
            >
              {(overview?.growth_metrics?.churn_rate || 0) < 5
                ? "Healthy"
                : "High"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
