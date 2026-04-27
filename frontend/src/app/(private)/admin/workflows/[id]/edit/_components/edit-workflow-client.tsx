"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/base/page-header";
import { WorkflowBuilder } from "../../../../_components/workflow-builder";
import {
  useWorkflowById,
  useUpdateWorkflow,
  type WorkflowFormData,
} from "@/hooks/use-workflow-queries";

interface EditWorkflowClientProps {
  workflowId: string;
  userId: string;
  userRole: string;
}

export function EditWorkflowClient({
  workflowId,
  userId,
  userRole,
}: EditWorkflowClientProps) {
  const router = useRouter();

  // Fetch workflow details
  const { data: workflow, isLoading } = useWorkflowById(workflowId);

  // Update workflow mutation
  const updateMutation = useUpdateWorkflow(workflowId);

  // Handle successful update
  const handleUpdateSuccess = () => {
    router.push("/admin/workflows");
  };

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (formData: WorkflowFormData) => {
    try {
      await updateMutation.mutateAsync(formData);
      // Route back to workflows list after successful update
      handleUpdateSuccess();
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Workflow"
          subtitle="Loading workflow details..."
          onBackClick={handleBack}
          showBackButton={true}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Workflow"
          subtitle="Workflow not found"
          onBackClick={handleBack}
          showBackButton={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${workflow.name}`}
        subtitle="Update the workflow configuration"
        onBackClick={handleBack}
        showBackButton={true}
      />

      <WorkflowBuilder
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        mode="edit"
        initialData={workflow}
      />
    </div>
  );
}
