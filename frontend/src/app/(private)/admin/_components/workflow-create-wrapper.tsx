"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/base/page-header";
import { WorkflowBuilder } from "./workflow-builder";
import {
  useCreateWorkflow,
  type WorkflowFormData,
} from "@/hooks/use-workflow-queries";

interface CreateWorkflowClientProps {
  userId: string;
  userRole: string;
}

export function CreateWorkflowClient({
  userId,
  userRole,
}: CreateWorkflowClientProps) {
  const router = useRouter();

  // Create workflow mutation
  const createMutation = useCreateWorkflow();

  const handleSubmit = async (formData: WorkflowFormData) => {
    try {
      await createMutation.mutateAsync(formData);
      router.push("/admin/workflows");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleBack = () => {
    router.push("/admin/workflows");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Workflow"
        subtitle="Design a new custom approval workflow"
        onBackClick={handleBack}
        showBackButton={true}
      />

      <WorkflowBuilder
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
