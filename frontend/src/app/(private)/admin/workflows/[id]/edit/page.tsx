import { EditWorkflowClient } from "./_components/edit-workflow-client";
import { requireAdminRole } from "@/lib/admin-guard";

export const metadata = {
  title: "Edit Workflow",
  description: "Edit an existing approval workflow",
};

interface EditWorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default async function EditWorkflowPage({
  params,
}: EditWorkflowPageProps) {
  // Verify admin role at server level
  const { userId, userRole } = await requireAdminRole()

  const { id } = await params;

  return (
    <EditWorkflowClient
      workflowId={id}
      userId={userId}
      userRole={userRole}
    />
  );
}
