import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/dashboard-client";
import { verifySession } from "@/lib/auth";
import { getDashboardMetrics } from "@/app/_actions/dashboard";
import {
  getPendingApprovalCount,
  getApprovalTasks,
} from "@/app/_actions/workflow-approval-actions";

export const metadata = {
  title: "Dashboard",
  description: "View workflow metrics, approvals, and key statistics",
};

export default async function DashboardPage() {
  const { session, isAuthenticated } = await verifySession();

  if (!session || !isAuthenticated) {
    redirect("/login");
  }

  // Extract first name from full name
  const fullName = String(
    session?.user?.name || session?.user?.email || "User"
  );
  const firstName = fullName.split(" ")[0];

  // SSR: Fetch all dashboard data in parallel
  const [metricsResult, pendingCountResult, tasksResult] = await Promise.all([
    getDashboardMetrics().catch(() => null),
    getPendingApprovalCount().catch(() => null),
    getApprovalTasks({ viewAll: true }, 1, 10).catch(() => null),
  ]);

  const initialMetrics =
    metricsResult?.success && metricsResult.data ? metricsResult.data : undefined;

  const initialPendingCount =
    pendingCountResult?.success && pendingCountResult.data
      ? pendingCountResult.data.count
      : undefined;

  const initialTasks =
    tasksResult?.success && tasksResult.data
      ? { data: tasksResult.data, pagination: tasksResult.pagination }
      : undefined;

  return (
    <DashboardClient
      userId={String(session?.user?.id)}
      userName={firstName}
      userRole={String(session?.user?.role)}
      initialMetrics={initialMetrics}
      initialPendingCount={initialPendingCount}
      initialTasks={initialTasks}
    />
  );
}
