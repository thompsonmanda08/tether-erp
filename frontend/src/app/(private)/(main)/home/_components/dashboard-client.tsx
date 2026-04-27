"use client";

import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { usePermissions } from "@/hooks/use-permissions";
import { getDashboardVariant } from "@/lib/dashboard-role";
import { PageHeader } from "@/components/base/page-header";
import { RecentTasks } from "./recent-tasks";
import { GreetingCard } from "./greeting-card";
import { MetricsCards } from "./metrics-cards";
import LoadingDashboardPage, { LoadingDashboard } from "../loading";
import CustomAlert from "@/components/ui/custom-alert";
import type { DashboardMetrics, ApprovalTask } from "@/types";

interface DashboardClientProps {
  userId: string;
  userName: string;
  userRole: string;
  initialMetrics?: DashboardMetrics;
  initialPendingCount?: number;
  initialTasks?: { data: ApprovalTask[]; pagination?: any };
}

export function DashboardClient({
  userId,
  userName,
  userRole,
  initialMetrics,
  initialPendingCount,
  initialTasks,
}: DashboardClientProps) {
  // Use React Query hook for dashboard metrics — SSR initialData avoids loading flash
  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardMetrics(initialMetrics, initialPendingCount);
  const { rawPermissions } = usePermissions();
  const variant = getDashboardVariant(userRole, rawPermissions);

  if (isLoading) {
    return <LoadingDashboardPage />;
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle={error?.message || "Failed to load dashboard"}
          showBackButton={false}
        />
        <CustomAlert
          type="error"
          message="Something went wrong while fetching dashboard metrics."
        />
        <div className="rounded-lg border bg-red-50 text-destructive p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              Failed to load dashboard data. <br /> Please try again later.
            </p>
            {error && process.env.NODE_ENV != "production" && (
              <pre>{JSON.stringify(error, null, 2)}</pre>
            )}
          </div>
        </div>
        <LoadingDashboard />
      </div>
    );
  }

  const subtitle =
    variant === "requester"
      ? "Track your submissions and create new requests"
      : variant === "procurement"
        ? "Manage purchase orders, requisitions, and goods received"
        : variant === "admin"
          ? "Organization overview and system management"
          : "View your workflow metrics and pending approvals";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={subtitle}
        showBackButton={false}
      />

      {/* Greeting Card with role-based Quick Actions */}
      <GreetingCard
        userName={userName}
        userRole={userRole}
        userId={userId}
        metrics={metrics}
      />

      {/* Admin: show org-wide metrics cards */}
      {variant === "admin" && metrics && <MetricsCards metrics={metrics} />}

      {/* Requesters don't need the approval tasks widget */}
      {variant !== "requester" && (
        <RecentTasks
          userId={userId}
          userRole={userRole}
          initialTasks={initialTasks}
        />
      )}
    </div>
  );
}
