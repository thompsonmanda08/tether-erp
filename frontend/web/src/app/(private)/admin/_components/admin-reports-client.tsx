"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ApprovalReports } from "./approval-reports";
import { UserActivityReports } from "./user-activity-reports";
import { SystemStatistics } from "./system-statistics";
import { AnalyticsDashboard } from "@/components/workflows/analytics-dashboard";
import { Download, RefreshCw } from "lucide-react";
import { QUERY_KEYS } from "@/lib/constants";
import { notify } from "@/lib/utils";
import {
  useSystemStats,
  useApprovalMetrics,
  useUserActivity,
  useAnalyticsDashboard,
} from "@/hooks/use-reports-queries";
import {
  exportSystemStatsToCSV,
  exportApprovalMetricsToCSV,
  exportUserActivityToCSV,
  exportAnalyticsDashboardToCSV,
} from "@/lib/export-utils";

interface AdminReportsClientProps {
  userId: string;
  userRole: string;
}

export function AdminReportsClient({
  userId,
  userRole,
}: AdminReportsClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Get data for export
  const { data: systemStats } = useSystemStats();
  const { data: approvalMetrics } = useApprovalMetrics();
  const { data: userActivity } = useUserActivity();
  const { data: analytics } = useAnalyticsDashboard();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.REPORTS.SYSTEM_STATS],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.REPORTS.APPROVAL_METRICS],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.REPORTS.USER_ACTIVITY],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.REPORTS.ANALYTICS],
        }),
      ]);
      notify({
        title: "Success",
        description: "Reports refreshed successfully",
        type: "success",
      });
    } catch (error) {
      notify({
        title: "Error",
        description: "Failed to refresh reports. Please try again.",
        type: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    try {
      switch (activeTab) {
        case "overview":
          if (systemStats) {
            exportSystemStatsToCSV(systemStats);
            notify({
              title: "Success",
              description: "System statistics exported to CSV",
              type: "success",
            });
          } else {
            notify({
              title: "Error",
              description: "No data available to export",
              type: "error",
            });
          }
          break;
        case "analytics":
          if (analytics) {
            exportAnalyticsDashboardToCSV(analytics);
            notify({
              title: "Success",
              description: "Analytics dashboard exported to CSV",
              type: "success",
            });
          } else {
            notify({
              title: "Error",
              description: "No data available to export",
              type: "error",
            });
          }
          break;
        case "approvals":
          if (approvalMetrics) {
            exportApprovalMetricsToCSV(approvalMetrics);
            notify({
              title: "Success",
              description: "Approval metrics exported to CSV",
              type: "success",
            });
          } else {
            notify({
              title: "Error",
              description: "No data available to export",
              type: "error",
            });
          }
          break;
        case "activity":
          if (userActivity) {
            exportUserActivityToCSV(userActivity);
            notify({
              title: "Success",
              description: "User activity exported to CSV",
              type: "success",
            });
          } else {
            notify({
              title: "Error",
              description: "No data available to export",
              type: "error",
            });
          }
          break;
        default:
          notify({
            title: "Error",
            description: "Unknown tab selected",
            type: "error",
          });
      }
    } catch (error) {
      notify({
        title: "Error",
        description: "An error occurred during export",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Reports</h1>
          <p className="text-muted-foreground">
            Monitor workflow approvals, user activity, and system metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* System Statistics Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SystemStatistics />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Approval Reports Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <ApprovalReports />
        </TabsContent>

        {/* User Activity Reports Tab */}
        <TabsContent value="activity" className="space-y-6">
          <UserActivityReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
