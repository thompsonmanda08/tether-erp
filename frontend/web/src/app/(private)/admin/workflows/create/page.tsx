import { CreateWorkflowClient } from "../../_components/workflow-create-wrapper";
import { requireAdminRole } from "@/lib/admin-guard";

export const metadata = {
  title: "Create Workflow",
  description: "Create a new custom approval workflow",
};

// Disable static generation for this page
export const dynamic = "force-dynamic";

export default async function CreateWorkflowPage() {
  // Verify admin role at server level
  const { userId, userRole } = await requireAdminRole();

  return <CreateWorkflowClient userId={userId} userRole={userRole} />;
}
