"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Settings, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkflows } from "@/hooks/use-workflow-queries";
import { cn } from "@/lib/utils";

interface WorkflowRequirementBannerProps {
  entityType:
    | "requisition"
    | "budget"
    | "purchase_order"
    | "payment_voucher"
    | "grn";
  className?: string;
  onDismiss?: () => void;
}

/**
 * Specialized banner for workflow configuration requirements
 * Shows when trying to submit a document but no workflow is configured
 */
export function WorkflowRequirementBanner({
  entityType,
  className,
  onDismiss,
}: WorkflowRequirementBannerProps) {
  const router = useRouter();
  const { data: workflows = [], isLoading } = useWorkflows({
    filter: { entityType, isActive: true },
  });

  const hasWorkflows = Array.isArray(workflows) && workflows.length > 0;

  // Don't show if workflows exist
  if (hasWorkflows || isLoading) {
    return null;
  }

  const entityLabel = entityType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <Alert
      variant="destructive"
      className={cn(
        "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900",
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
      <AlertTitle className="text-blue-900 dark:text-blue-200 font-semibold text-base mb-2">
        Workflow Configuration Required
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-300">
        <div className="space-y-3">
          <p className="text-sm">
            No approval workflow is configured for{" "}
            <strong>{entityLabel}</strong> documents. You need to set up at
            least one workflow to submit documents for approval.
          </p>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-white dark:bg-blue-950/10 dark:border-blue-800">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-blue-900 dark:text-blue-200">
                  {entityLabel} Approval Workflow
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  0 configured
                </Badge>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Define approval stages, roles, and rules for{" "}
                {entityLabel.toLowerCase()} documents
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900/50"
              onClick={() => router.push("/admin/workflows")}
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure Workflow
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>What you can do:</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside mt-1 space-y-1">
              <li>
                You can still create and save {entityLabel.toLowerCase()}{" "}
                documents
              </li>
              <li>
                Documents will remain in "Draft" status until a workflow is
                configured
              </li>
              <li>
                Once a workflow is set up, you can submit existing drafts for
                approval
              </li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
