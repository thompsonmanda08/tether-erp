"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill, documentStatusTone, type StatusTone } from "@/components/ui/status-pill";
import {
  Check,
  X,
  Hand,
  ExternalLink,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

export interface TaskRowData {
  id: string;
  documentNumber?: string;
  documentType?: string;
  entityType?: string;
  entityId?: string;
  documentId?: string;
  title?: string;
  status: string;
  priority?: string;
  stageName?: string;
  stageNumber?: number;
  dueDate?: string | Date;
  dueAt?: string;
  claimedBy?: string;
  assignedTo?: string;
  assignedRole?: string;
  amount?: number;
  currency?: string;
  requesterName?: string;
  createdAt?: string | Date;
}

interface TaskRowProps {
  task: TaskRowData;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  canAct: boolean;
  isClaimedByMe: boolean;
  onClaim?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onReassign?: () => void;
  isMutating?: boolean;
}

const priorityTone: Record<string, StatusTone> = {
  HIGH: "danger",
  URGENT: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

const docTypeLabel: Record<string, string> = {
  REQUISITION: "Requisition",
  PURCHASE_ORDER: "Purchase Order",
  PAYMENT_VOUCHER: "Payment Voucher",
  BUDGET: "Budget",
  GRN: "GRN",
  requisition: "Requisition",
  purchase_order: "Purchase Order",
  payment_voucher: "Payment Voucher",
  budget: "Budget",
  grn: "GRN",
};

const docTypeRoute: Record<string, string> = {
  REQUISITION: "/requisitions",
  PURCHASE_ORDER: "/purchase-orders",
  PAYMENT_VOUCHER: "/payment-vouchers",
  BUDGET: "/budgets",
  GRN: "/grn",
  requisition: "/requisitions",
  purchase_order: "/purchase-orders",
  payment_voucher: "/payment-vouchers",
  budget: "/budgets",
  grn: "/grn",
};

function relTime(date?: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function isOverdue(dueAt?: string | Date | null): boolean {
  if (!dueAt) return false;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return due.getTime() < Date.now();
}

/**
 * Single dense task row. ~56px height. Renders status dot, doc number,
 * title, type label, priority pill, age, requester, inline actions.
 *
 * Inline action visibility:
 * - Claim: shown when `canAct && !isClaimedByMe && status==="PENDING"`
 * - Approve/Reject: shown when `canAct && isClaimedByMe`
 */
export function TaskRow({
  task,
  selected,
  onSelectChange,
  canAct,
  isClaimedByMe,
  onClaim,
  onApprove,
  onReject,
  onReassign,
  isMutating,
}: TaskRowProps) {
  const docType = task.documentType || task.entityType || "";
  const docId = task.documentId || task.entityId || "";
  const docPath = docTypeRoute[docType] || "/tasks";
  const overdue = isOverdue(task.dueAt || task.dueDate);
  const tone = documentStatusTone(task.status);

  return (
    <tr
      className={cn(
        "group border-b border-divider/60 last:border-b-0 hover:bg-muted/40",
        selected && "bg-primary-50/40 dark:bg-primary-100/10",
      )}
    >
      {onSelectChange && (
        <td className="w-10 px-3 py-2.5">
          <Checkbox
            checked={!!selected}
            onCheckedChange={onSelectChange}
            aria-label="Select task"
          />
        </td>
      )}

      {/* Status dot + doc# */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              tone === "success" && "bg-success-500",
              tone === "danger" && "bg-danger-500",
              tone === "warning" && "bg-warning-500",
              tone === "info" && "bg-secondary-500",
              tone === "accent" && "bg-primary-500",
              tone === "neutral" && "bg-default-400",
            )}
          />
          <Link
            href={docId ? `${docPath}/${docId}` : "#"}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {task.documentNumber || "—"}
          </Link>
        </div>
      </td>

      {/* Title + doc type */}
      <td className="px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{task.title || "—"}</p>
          <p className="text-xs text-muted-foreground">
            {docTypeLabel[docType] || docType || "Task"}
            {task.stageName && (
              <>
                <span className="mx-1.5 text-muted-foreground/50">•</span>
                {task.stageName}
              </>
            )}
          </p>
        </div>
      </td>

      {/* Priority */}
      <td className="px-3 py-2.5">
        {task.priority && (
          <StatusPill
            tone={priorityTone[task.priority?.toUpperCase()] ?? "neutral"}
            variant="soft"
            size="sm"
          >
            {task.priority}
          </StatusPill>
        )}
      </td>

      {/* Requester */}
      <td className="hidden px-3 py-2.5 md:table-cell">
        <span className="text-sm text-muted-foreground">
          {task.requesterName || task.assignedRole || "—"}
        </span>
      </td>

      {/* Age + due */}
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {relTime(task.createdAt)}
          {overdue && (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-danger-100 px-1.5 py-0.5 text-[10px] font-medium text-danger-700 dark:bg-danger-100/30 dark:text-danger-300">
              <AlertTriangle className="h-3 w-3" />
              overdue
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1.5">
          {canAct && !isClaimedByMe && task.status?.toUpperCase() === "PENDING" && (
            <Button
              size="sm"
              variant="bordered"
              isLoading={isMutating}
              onClick={onClaim}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Hand className="h-3 w-3" />
              Claim
            </Button>
          )}
          {canAct && isClaimedByMe && task.status?.toUpperCase() === "PENDING" && (
            <>
              <Button
                size="sm"
                variant="solid"
                color="success"
                isLoading={isMutating}
                onClick={onApprove}
                className="h-7 gap-1 px-2 text-xs"
              >
                <Check className="h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="bordered"
                color="danger"
                isLoading={isMutating}
                onClick={onReject}
                className="h-7 gap-1 px-2 text-xs"
              >
                <X className="h-3 w-3" />
                Reject
              </Button>
            </>
          )}
          {onReassign && canAct && (
            <Button
              size="sm"
              variant="light"
              onClick={onReassign}
              className="h-7 gap-1 px-2 text-xs"
              isIconOnly
              aria-label="Reassign"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <Link
            href={docId ? `${docPath}/${docId}` : "#"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open document"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

interface TaskRowsTableProps {
  children: ReactNode;
  showSelect?: boolean;
}

/**
 * Wrapper table providing the dense header for TaskRow children.
 */
export function TasksTableShell({ children, showSelect }: TaskRowsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-divider bg-content1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider bg-muted/40">
            {showSelect && <th className="w-10 px-3 py-2" />}
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Document
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Title
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Priority
            </th>
            <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
              Requester
            </th>
            <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">
              Age
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
