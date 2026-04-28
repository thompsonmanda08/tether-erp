import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_STATUS_CONFIG,
  ACTIVITY_ACTION_CONFIG,
  EXECUTION_STATUS_CONFIG,
  APPROVAL_STATUS_CONFIG,
  COMPLIANCE_STATUS_CONFIG,
  USER_ROLE_CONFIG,
  HEALTH_STATUS_CONFIG,
  getDocumentStatusVariant,
  getActivityActionVariant,
  getExecutionStatusVariant,
  getApprovalStatusVariant,
  getComplianceStatusVariant,
  getUserRoleVariant,
  getHealthStatusVariant,
  type DocumentStatus,
  type ActivityAction,
  type ExecutionStatus,
  type ApprovalStatus,
  type ComplianceStatus,
  type UserRole,
  type HealthStatus,
} from "@/lib/status-badges";
import type { BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type:
    | "document"
    | "draft"
    | "action"
    | "execution"
    | "approval"
    | "success"
    | "compliance"
    | "role"
    | "health";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  let variant: BadgeVariant = "outline";
  let label = status;

  const upperStatus = status?.toUpperCase() ?? status;

  switch (type) {
    case "document":
      variant = getDocumentStatusVariant(status);
      label = DOCUMENT_STATUS_CONFIG[upperStatus as DocumentStatus]?.label || status;
      break;
    case "action":
      variant = getActivityActionVariant(status);
      label = ACTIVITY_ACTION_CONFIG[status as ActivityAction]?.label || status;
      break;
    case "execution":
      variant = getExecutionStatusVariant(status);
      label = EXECUTION_STATUS_CONFIG[upperStatus as ExecutionStatus]?.label || status;
      break;
    case "approval":
      variant = getApprovalStatusVariant(status);
      label = APPROVAL_STATUS_CONFIG[upperStatus as ApprovalStatus]?.label || status;
      break;
    case "compliance":
      variant = getComplianceStatusVariant(status);
      label =
        COMPLIANCE_STATUS_CONFIG[status as ComplianceStatus]?.label || status;
      break;
    case "role":
      variant = getUserRoleVariant(status);
      label = USER_ROLE_CONFIG[status as UserRole]?.label || status;
      break;
    case "health":
      variant = getHealthStatusVariant(status);
      label = HEALTH_STATUS_CONFIG[status as HealthStatus]?.label || status;
      break;
  }

  return (
    <Badge
      variant={variant}
      className={cn("capitalize px-3 py-1.5", className)}
    >
      {label}
    </Badge>
  );
}
