"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  Building2,
  Activity,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MetricsGrid } from "./components/metrics-grid";
import { AnalyticsFilters as AnalyticsFiltersComponent } from "./components/analytics-filters";
import { UserAnalyticsChart } from "./components/user-analytics-chart";
import { OrganizationAnalyticsChart } from "./components/organization-analytics-chart";
import { UsageAnalyticsChart } from "./components/usage-analytics-chart";
import {
  useAnalyticsOverview,
  useUserAnalytics,
  useOrganizationAnalytics,
  useUsageAnalytics,
} from "@/hooks/use-analytics";
import type { AnalyticsFilters } from "@/app/_actions/analytics";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    date_range: "30d",
  });

  const {
    data: analyticsData,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useAnalyticsOverview(filters);

  const { data: userAnalytics, isLoading: isLoadingUsers } =
    useUserAnalytics(filters);
  const { data: orgAnalytics, isLoading: isLoadingOrgs } =
    useOrganizationAnalytics(filters);
  const { data: usageAnalytics, isLoading: isLoadingUsage } =
    useUsageAnalytics(filters);

  const isRefreshing = isRefetching;

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Analytics data refreshed");
    } catch (error) {
      toast.error("Failed to refresh analytics data");
    }
  };

  const handleFiltersChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ date_range: "30d" });
  };

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    toast.success(`Analytics report export initiated in ${format} format`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for your platform
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        onExport={handleExport}
      />

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Failed to load analytics
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-auto"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      <MetricsGrid overview={analyticsData} isLoading={isLoading} />

      {/* Analytics Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="organizations"
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>
                  Key metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Users
                      </span>
                      <span className="font-medium">
                        {analyticsData?.total_users || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Organizations
                      </span>
                      <span className="font-medium">
                        {analyticsData?.total_organizations || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Active Organizations
                      </span>
                      <span className="font-medium">
                        {analyticsData?.total_organizations || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Monthly Active Users
                      </span>
                      <span className="font-medium">
                        {analyticsData?.key_metrics?.monthly_active_users || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>Growth rates and trends</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        User Growth Rate
                      </span>
                      <span className="font-medium text-green-600">
                        +{analyticsData?.growth_metrics?.user_growth_rate || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Organization Growth Rate
                      </span>
                      <span className="font-medium text-green-600">
                        +
                        {analyticsData?.growth_metrics
                          ?.organization_growth_rate || 0}
                        %
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Churn Rate
                      </span>
                      <span className="font-medium text-green-600">
                        {analyticsData?.growth_metrics?.churn_rate || 0}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserAnalyticsChart
            analytics={userAnalytics ?? null}
            isLoading={isLoadingUsers}
          />
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <OrganizationAnalyticsChart
            analytics={orgAnalytics ?? null}
            isLoading={isLoadingOrgs}
          />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageAnalyticsChart
            analytics={usageAnalytics ?? null}
            isLoading={isLoadingUsage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
