import { AdminReportsClient } from "../_components/admin-reports-client";
import { requireAdminRole } from "@/lib/admin-guard";

export const metadata = {
  title: "Admin Reports",
  description: "View approval statistics, user activity, and system reports",
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { userId, userRole } = await requireAdminRole();

  return <AdminReportsClient userId={userId} userRole={userRole} />;
}
