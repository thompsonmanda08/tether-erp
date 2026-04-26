"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Send,
  AlertCircle,
  User,
  Undo2,
  DollarSign,
} from "lucide-react";
import { ActionHistoryEntry, ApprovalRecord } from "@/types";
import { WorkflowDocument } from "@/types/workflow";
import type { AuditEvent } from "@/app/_actions/audit";
import { AuditTrailEntry } from "@/types/requisition";
import { ApprovalActionPanel } from "./requisition-approval-panel";
import { useApprovalPanelData } from "@/hooks/use-approval-history";
import { useRequisitionAuditTrail } from "@/hooks/use-requisition-queries";
import { StatusBadge } from "@/components/status-badge";
import { formatRoleForDisplay } from "@/lib/workflow-utils";

// ── Shared helpers ──────────────────────────────────────────────────────

export function getActionIcon(actionType: string) {
  switch (actionType.toUpperCase()) {
    case "APPROVE":
    case "APPROVED":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "REJECT":
    case "REJECTED":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "CREATE":
      return <Plus className="h-5 w-5 text-blue-600" />;
    case "UPDATE":
      return <Edit className="h-5 w-5 text-amber-600" />;
    case "SUBMIT":
      return <Send className="h-5 w-5 text-purple-600" />;
    case "REVERSE":
    case "REVERSED":
      return <Edit className="h-5 w-5 text-amber-600" />;
    case "WITHDRAW":
    case "WITHDRAWN":
      return <Undo2 className="h-5 w-5 text-orange-600" />;
    case "MARK_PAID":
    case "MARKED_PAID":
      return <DollarSign className="h-5 w-5 text-emerald-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-600" />;
  }
}

export function getActionColor(actionType: string) {
  switch (actionType.toUpperCase()) {
    case "APPROVE":
    case "APPROVED":
      return "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700";
    case "REJECT":
    case "REJECTED":
      return "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700";
    case "CREATE":
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700";
    case "UPDATE":
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700";
    case "SUBMIT":
      return "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700";
    case "REVERSE":
    case "REVERSED":
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700";
    case "WITHDRAW":
    case "WITHDRAWN":
      return "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700";
    case "MARK_PAID":
    case "MARKED_PAID":
      return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700";
    default:
      return "bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600";
  }
}

export function getActionLabel(actionType: string) {
  switch (actionType.toUpperCase()) {
    case "APPROVE":
    case "APPROVED":
      return "Approved";
    case "REJECT":
    case "REJECTED":
      return "Rejected";
    case "CREATE":
      return "Created";
    case "UPDATE":
      return "Updated";
    case "SUBMIT":
      return "Submitted";
    case "REVERSE":
    case "REVERSED":
      return "Reversed";
    case "DELETE":
      return "Deleted";
    case "REVERT_TO_DRAFT":
      return "Reverted to Draft";
    case "WITHDRAW":
    case "WITHDRAWN":
      return "Withdrawn";
    case "MARK_PAID":
    case "MARKED_PAID":
      return "Marked as Paid";
    default:
      return actionType;
  }
}

// ── Activity Log (Timeline) Content ─────────────────────────────────────

// Re-export so detail pages can import one type for the audit events prop
export type { AuditEvent as AuditEventEntry } from "@/app/_actions/audit";

interface ActivityLogContentProps {
  actionHistory?: ActionHistoryEntry[];
  auditEvents?: AuditEvent[];
}

// Unified log entry type
interface LogEntry {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  timestamp: Date;
  comments?: string;
  remarks?: string;
  previousStatus?: string;
  newStatus?: string;
  stageNumber?: number;
  stageName?: string;
  changes?: Record<string, { old?: unknown; new?: unknown }>;
  details?: Record<string, unknown>;
}

function normalizeAction(action: string): string {
  const upper = action.toUpperCase().replace(/-/g, "_");
  // Normalize backend variations to a single canonical form
  if (upper === "UPDATE") return "UPDATED";
  if (upper === "CREATE") return "CREATED";
  if (upper === "DELETE") return "DELETED";
  return upper;
}

// Deduplicate by rounding timestamps to the nearest 5 seconds + action type
// Prefer entries that have changes data over those that don't
function deduplicateEntries(entries: LogEntry[]): LogEntry[] {
  const seen = new Map<string, LogEntry>();
  for (const e of entries) {
    const bucket = Math.round(e.timestamp.getTime() / 5000);
    const key = `${normalizeAction(e.action)}_${bucket}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, e);
    } else {
      // Prefer the entry that has changes data
      const existingHasChanges =
        existing.changes && Object.keys(existing.changes).length > 0;
      const newHasChanges = e.changes && Object.keys(e.changes).length > 0;
      if (!existingHasChanges && newHasChanges) {
        seen.set(key, e);
      }
    }
  }
  return [...seen.values()];
}

export function ActivityLogContent({
  actionHistory,
  auditEvents,
}: ActivityLogContentProps) {
  // Convert audit events to unified entries
  const auditEntries: LogEntry[] = (auditEvents ?? []).map((evt) => ({
    id: evt.id,
    action: normalizeAction(evt.action),
    actorName: evt.actorName || "System",
    actorRole: evt.actorRole || "",
    timestamp: new Date(evt.createdAt),
    comments:
      typeof evt.details?.reason === "string" ? evt.details.reason : undefined,
    changes: evt.changes,
    details: evt.details,
  }));

  // Convert action history to unified entries
  const historyEntries: LogEntry[] = (actionHistory ?? []).map((e) => ({
    id: e.id,
    action: normalizeAction(e.actionType || e.action),
    actorName: e.performedByName || "System",
    actorRole: e.performedByRole || "",
    timestamp: new Date(e.performedAt || e.timestamp || 0),
    comments: e.comments,
    remarks: e.remarks,
    previousStatus: e.previousStatus,
    newStatus: e.newStatus,
    stageNumber: e.stageNumber,
    stageName: e.stageName,
  }));

  // Merge: audit events are richer, history may have extra entries not yet in audit log
  // Deduplicate by action + timestamp bucket, preferring entries with changes data
  const all = deduplicateEntries(
    [...auditEntries, ...historyEntries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    ),
  ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (all.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs opacity-60 mt-1">
          Actions will appear here as the document progresses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
      {all.map((entry) => {
        const cfg = getEntryConfig(entry.action);
        const hasChanges =
          entry.changes && Object.keys(entry.changes).length > 0;
        const filteredChanges = hasChanges
          ? Object.entries(entry.changes!).filter(
              ([k]) => k !== "metadata" && k !== "itemsCount",
            )
          : [];

        return (
          <div
            key={entry.id}
            className={`rounded-lg border-l-4 border border-border/50 p-3 ${cfg.borderClass} ${cfg.bgClass}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                >
                  <span className="shrink-0">{cfg.icon}</span>
                  {cfg.label}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {entry.actorName}
                </span>
                {entry.actorRole && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {entry.actorRole}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {entry.timestamp.toLocaleString()}
              </span>
            </div>

            {/* Status change */}
            {entry.previousStatus && entry.newStatus && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {entry.previousStatus}
                </span>
                <span>→</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {entry.newStatus}
                </span>
              </div>
            )}

            {/* Stage info */}
            {entry.stageNumber && entry.stageName && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Stage {entry.stageNumber}:{" "}
                <span className="font-medium">{entry.stageName}</span>
              </p>
            )}

            {/* Comments / remarks */}
            {entry.comments && (
              <p className="mt-1.5 text-xs text-muted-foreground italic">
                &ldquo;{entry.comments}&rdquo;
              </p>
            )}
            {entry.remarks && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                Reason: &ldquo;{entry.remarks}&rdquo;
              </p>
            )}

            {/* Field-level changes */}
            {filteredChanges.length > 0 && (
              <div className="mt-2 rounded border border-border/60 overflow-hidden text-xs">
                {filteredChanges.map(([field, change]) => {
                  // Special handling for items array changes
                  const isItemsField = field === "items";
                  const oldIsArray = Array.isArray(change?.old);
                  const newIsArray = Array.isArray(change?.new);

                  if (isItemsField && (oldIsArray || newIsArray)) {
                    const oldItems = (change?.old as any[]) ?? [];
                    const newItems = (change?.new as any[]) ?? [];
                    return (
                      <div
                        key={field}
                        className="px-2.5 py-2 border-b last:border-b-0 border-border/40 bg-background/60 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground w-24 shrink-0 capitalize">
                            Items
                          </span>
                          <span className="line-through text-red-500 dark:text-red-400">
                            {oldItems.length} item
                            {oldItems.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {newItems.length} item
                            {newItems.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {/* Show new items as a compact list */}
                        {newItems.length > 0 && (
                          <div className="ml-24 space-y-0.5">
                            {newItems.map((item: any, i: number) => (
                              <div
                                key={i}
                                className="text-muted-foreground flex gap-2"
                              >
                                <span className="font-mono text-muted-foreground/50 w-5 shrink-0">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="truncate">
                                  {item.description || "—"}
                                </span>
                                <span className="shrink-0 tabular-nums">
                                  ×{item.quantity}
                                </span>
                                <span className="shrink-0 tabular-nums text-green-600 dark:text-green-400">
                                  {item.unitPrice
                                    ? `@ ${Number(item.unitPrice).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`
                                    : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field}
                      className="flex items-center gap-2 px-2.5 py-1.5 border-b last:border-b-0 border-border/40 bg-background/60"
                    >
                      <span className="font-medium text-muted-foreground w-24 shrink-0 capitalize">
                        {field.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      {change?.old !== undefined && (
                        <span className="line-through text-red-500 dark:text-red-400 truncate max-w-[130px]">
                          {String(change.old ?? "—")}
                        </span>
                      )}
                      {change?.old !== undefined &&
                        change?.new !== undefined && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      {change?.new !== undefined && (
                        <span className="text-green-600 dark:text-green-400 font-medium truncate max-w-[130px]">
                          {String(change.new ?? "—")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Attachment / quotation details from audit event details */}
            {entry.details &&
              !hasChanges &&
              (() => {
                const d = entry.details;
                const items = [
                  d.fileName && `File: ${d.fileName}`,
                  d.vendorName && `Vendor: ${d.vendorName}`,
                  d.amount &&
                    `Amount: ${d.currency ?? ""} ${Number(d.amount).toLocaleString()}`,
                ].filter(Boolean);
                return items.length > 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {items.join(" · ")}
                  </p>
                ) : null;
              })()}
          </div>
        );
      })}
    </div>
  );
}

// Maps action strings to display config
function getEntryConfig(action: string): {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
} {
  const a = action.toUpperCase();
  if (a.includes("CREAT") || a === "CREATE")
    return {
      label: "Created",
      icon: <Plus className="h-3 w-3" />,
      badgeClass:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
      borderClass: "border-l-blue-500",
      bgClass: "",
    };
  if (a.includes("APPROV"))
    return {
      label: "Approved",
      icon: <CheckCircle className="h-3 w-3" />,
      badgeClass:
        "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
      borderClass: "border-l-green-500",
      bgClass: "",
    };
  if (a.includes("REJECT"))
    return {
      label: "Rejected",
      icon: <XCircle className="h-3 w-3" />,
      badgeClass:
        "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
      borderClass: "border-l-red-500",
      bgClass: "",
    };
  if (a.includes("SUBMIT"))
    return {
      label: "Submitted",
      icon: <Send className="h-3 w-3" />,
      badgeClass:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
      borderClass: "border-l-purple-500",
      bgClass: "",
    };
  if (a.includes("WITHDRAW"))
    return {
      label: "Withdrawn",
      icon: <Undo2 className="h-3 w-3" />,
      badgeClass:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
      borderClass: "border-l-orange-500",
      bgClass: "",
    };
  if (a.includes("ATTACHMENT") || a.includes("UPLOAD"))
    return {
      label: a.includes("DELET") ? "File Deleted" : "File Uploaded",
      icon: <Plus className="h-3 w-3" />,
      badgeClass:
        "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200",
      borderClass: "border-l-cyan-500",
      bgClass: "",
    };
  if (a.includes("QUOTATION"))
    return {
      label: a.includes("DELET")
        ? "Quotation Removed"
        : a.includes("UPDAT")
          ? "Quotation Updated"
          : "Quotation Added",
      icon: <DollarSign className="h-3 w-3" />,
      badgeClass:
        "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
      borderClass: "border-l-teal-500",
      bgClass: "",
    };
  if (a.includes("MARK_PAID") || a.includes("MARKED_PAID"))
    return {
      label: "Marked as Paid",
      icon: <DollarSign className="h-3 w-3" />,
      badgeClass:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
      borderClass: "border-l-emerald-500",
      bgClass: "",
    };
  if (a.includes("BYPASS") || a.includes("QUOTATION_GATE"))
    return {
      label: "Gate Bypassed",
      icon: <AlertCircle className="h-3 w-3" />,
      badgeClass:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200",
      borderClass: "border-l-yellow-500",
      bgClass: "",
    };
  // default: update
  return {
    label: "Updated",
    icon: <Edit className="h-3 w-3" />,
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
    borderClass: "border-l-amber-500",
    bgClass: "",
  };
}

// ── Approval Chain Content ──────────────────────────────────────────────

interface ApprovalChainContentProps {
  requisition: WorkflowDocument;
  approvalChain?: ApprovalRecord[];
  approvalHistory?: any[];
  workflowStatus: any;
  availableApprovers: any[];
  isLoading: boolean;
}

export function ApprovalChainContent({
  requisition,
  approvalChain,
  approvalHistory,
  workflowStatus,
  availableApprovers,
  isLoading,
}: ApprovalChainContentProps) {
  const combinedApprovalHistory = [
    ...(approvalHistory || []),
    ...(approvalChain || []),
  ].filter(
    (item, index, self) =>
      index ===
      self.findIndex(
        (t) =>
          (t.approverId &&
            item.approverId &&
            t.approverId === item.approverId) ||
          (t.stageNumber &&
            item.stageNumber &&
            t.stageNumber === item.stageNumber),
      ),
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
        <p className="text-sm text-gray-500 mt-2">Loading approval chain...</p>
      </div>
    );
  }

  if (
    requisition.status?.toUpperCase() === "DRAFT" ||
    requisition.status?.toUpperCase() === "REJECTED"
  ) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h4 className="font-semibold text-lg mb-2">Workflow Not Started</h4>
        <p className="text-sm text-gray-600 mb-4">
          The approval workflow will begin once this requisition is submitted
          for approval.
        </p>
        <p className="text-xs text-gray-500">
          Click &ldquo;Submit for Approval&rdquo; to start the workflow process.
        </p>
      </div>
    );
  }

  if (workflowStatus?.status === "no_workflow") {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h4 className="font-semibold text-lg mb-2">No Workflow Configured</h4>
        <p className="text-sm text-gray-600 mb-4">
          No approval workflow has been configured for this document type.
        </p>
        <p className="text-xs text-gray-500">
          Contact your administrator to set up approval workflows.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Workflow Progress Header */}
      <div className="text-xs mb-4 p-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Workflow Progress Tracker
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Track each approval stage and see who has approved or is required to
          approve
        </p>
        {workflowStatus && (
          <div className="mt-2 flex items-center gap-4">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Stage {workflowStatus.currentStage} of{" "}
              {workflowStatus.totalStages}
            </span>
            <Badge
              variant={
                workflowStatus.status?.toUpperCase() === "COMPLETED"
                  ? "default"
                  : "secondary"
              }
              className="text-xs"
            >
              {workflowStatus.status?.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {/* Enhanced Workflow Stage Progress */}
      {workflowStatus?.stageProgress &&
      workflowStatus.stageProgress.length > 0 ? (
        <div className="space-y-3 mb-6">
          {workflowStatus.stageProgress.map((stage: any, index: number) => (
            <div
              key={stage.stageNumber || index}
              className={`p-4 rounded-lg border-2 transition-all ${
                stage.status?.toUpperCase() === "APPROVED"
                  ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 shadow-sm"
                  : stage.status?.toUpperCase() === "REJECTED"
                    ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 shadow-sm"
                    : stage.isCurrentStage
                      ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-200 dark:ring-blue-800"
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      stage.status?.toUpperCase() === "APPROVED"
                        ? "bg-green-600 text-white"
                        : stage.status?.toUpperCase() === "REJECTED"
                          ? "bg-red-600 text-white"
                          : stage.isCurrentStage
                            ? "bg-blue-600 text-white ring-2 ring-blue-300"
                            : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {stage.stageNumber || index + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-base text-gray-900 dark:text-gray-100">
                      {stage.stageName ||
                        `Stage ${stage.stageNumber || index + 1}`}
                    </span>
                    <Badge
                      variant={
                        stage.status?.toUpperCase() === "APPROVED"
                          ? "default"
                          : stage.status?.toUpperCase() === "REJECTED"
                            ? "destructive"
                            : stage.isCurrentStage
                              ? "secondary"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {stage.status?.toUpperCase() === "APPROVED"
                        ? "APPROVED"
                        : stage.status?.toUpperCase() === "REJECTED"
                          ? "REJECTED"
                          : stage.isCurrentStage
                            ? "CURRENT STAGE"
                            : stage.status?.toUpperCase() === "COMPLETED"
                              ? "COMPLETED"
                              : "PENDING"}
                    </Badge>
                    {stage.isCurrentStage && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      >
                        Awaiting Action
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">Required Role:</span>
                        <span className="ml-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {formatRoleForDisplay(stage.requiredRole)}
                        </span>
                      </p>
                    </div>

                    {(stage.approverName || stage.approverId) && (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <span className="font-medium">Approved By:</span>
                          <span className="ml-1 text-green-700 dark:text-green-400 font-semibold">
                            {stage.approverName || "Unknown User"}
                          </span>
                          {stage.approverRole && (
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({formatRoleForDisplay(stage.approverRole)})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {stage.completedAt && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">Completed:</span>
                      <span className="ml-1">
                        {new Date(stage.completedAt).toLocaleString()}
                      </span>
                    </p>
                  )}

                  {stage.comments && (
                    <div className="mt-2 p-3 bg-white/70 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Comments:</span>
                        <span className="ml-1 italic">
                          &ldquo;{stage.comments}&rdquo;
                        </span>
                      </p>
                    </div>
                  )}

                  {stage.isCurrentStage &&
                    stage.status?.toUpperCase() === "PENDING" && (
                      <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <span className="font-medium">
                            Next Action Required:
                          </span>
                          <span className="ml-1">
                            This stage requires approval from a user with the{" "}
                            <strong>
                              {formatRoleForDisplay(stage.requiredRole)}
                            </strong>{" "}
                            role.
                          </span>
                        </p>
                      </div>
                    )}
                </div>

                <div className="flex-shrink-0">
                  {stage.status?.toUpperCase() === "APPROVED" ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : stage.status?.toUpperCase() === "REJECTED" ? (
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  ) : stage.isCurrentStage ? (
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {combinedApprovalHistory.length > 0 ? (
            <div className="space-y-3 mb-6">
              {combinedApprovalHistory.map((approval, index) => (
                <div
                  key={approval.approverId || index}
                  className={`p-4 rounded-lg border-2 ${
                    approval.status === "APPROVED"
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30"
                      : approval.status === "REJECTED"
                        ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
                        : approval.status === "PENDING"
                          ? "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30"
                          : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          approval.status === "APPROVED"
                            ? "bg-green-600 text-white"
                            : approval.status === "REJECTED"
                              ? "bg-red-600 text-white"
                              : approval.status === "PENDING"
                                ? "bg-yellow-600 text-white"
                                : "bg-gray-400 text-white"
                        }`}
                      >
                        {approval.stageNumber || index + 1}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-sm">
                          {approval.stageName ||
                            `Stage ${approval.stageNumber || index + 1}`}
                        </span>
                        <Badge
                          variant={
                            approval.status === "APPROVED"
                              ? "default"
                              : approval.status === "REJECTED"
                                ? "destructive"
                                : approval.status === "PENDING"
                                  ? "secondary"
                                  : "outline"
                          }
                          className="text-xs"
                        >
                          {approval.status || "PENDING"}
                        </Badge>
                      </div>

                      {approval.assignedRole && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <span className="font-medium">Required Role:</span>{" "}
                          {formatRoleForDisplay(approval.assignedRole)}
                        </p>
                      )}

                      {(approval.approverName || approval.actionTakenBy) && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Signatory:</span>{" "}
                          {approval.approverName || approval.actionTakenBy}
                          {approval.actionTakenByRole && (
                            <span className="text-gray-500 ml-1">
                              ({approval.actionTakenByRole})
                            </span>
                          )}
                        </p>
                      )}

                      {(approval.actionTakenAt || approval.approvedAt) && (
                        <p className="text-xs text-gray-600 mb-2">
                          <span className="font-medium">Date:</span>{" "}
                          {new Date(
                            approval.actionTakenAt || approval.approvedAt || "",
                          ).toLocaleString()}
                        </p>
                      )}

                      {(approval.comments || approval.remarks) && (
                        <div className="mt-2 p-2 bg-white/50 rounded border">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Comments:</span>{" "}
                            &ldquo;{approval.comments || approval.remarks}
                            &rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {getActionIcon(approval.status || "PENDING")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 mb-6">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No approval chain configured</p>
              <p className="text-xs text-gray-400 mt-1">
                The approval workflow will appear here once configured
              </p>
            </div>
          )}
        </>
      )}

      {/* Available Approvers Section */}
      {availableApprovers.length > 0 &&
        workflowStatus?.status?.toUpperCase() !== "COMPLETED" && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Available Approvers ({availableApprovers.length})
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              People who have permission to approve this requisition at various
              stages
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {availableApprovers.map((approver: any) => (
                <div
                  key={approver.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {approver.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {approver.role}{" "}
                        {approver.department && `• ${approver.department}`}
                      </p>
                      {approver.email && (
                        <p className="text-xs text-gray-500 truncate">
                          {approver.email}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Can Approve
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
}

// ── Approval Action Content ─────────────────────────────────────────────

interface ApprovalActionContentProps {
  requisitionId: string;
  requisition: WorkflowDocument;
  workflowStatus: any;
  isLoading: boolean;
  onApprovalComplete: () => void;
}

export function ApprovalActionContent({
  requisitionId,
  requisition,
  workflowStatus,
  isLoading,
  onApprovalComplete,
}: ApprovalActionContentProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
        <p className="text-sm text-gray-500 mt-2">Loading approval data...</p>
      </div>
    );
  }

  if (
    requisition.status?.toUpperCase() === "DRAFT" ||
    requisition.status?.toUpperCase() === "REJECTED"
  ) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h4 className="font-semibold text-lg mb-2">Ready to Submit</h4>
        <p className="text-sm text-gray-600 mb-2">
          This requisition is ready to be submitted for approval.
        </p>
        <p className="text-xs text-gray-500">
          Use the &ldquo;Submit for Approval&rdquo; button above to start the
          approval process.
        </p>
      </div>
    );
  }

  if (
    (requisition.status?.toUpperCase() === "PENDING" ||
      requisition.status?.toUpperCase() === "IN_REVIEW" ||
      workflowStatus?.status === "in_progress") &&
    workflowStatus?.canApprove
  ) {
    return (
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
        <h4 className="font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Approval Action
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Claim this task to begin reviewing. Once claimed, you&apos;ll be able
          to approve or reject the requisition.
        </p>
        <ApprovalActionPanel
          requisitionId={requisitionId}
          onApprovalComplete={onApprovalComplete}
        />
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-gray-500">
      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h4 className="font-semibold text-lg mb-2">No Actions Available</h4>
      <p className="text-sm text-gray-600 mb-2">
        You don&apos;t have permission to approve this requisition at this
        stage.
      </p>
      <p className="text-xs text-gray-500">
        Check the Approval Chain tab to see who can approve this requisition.
      </p>
    </div>
  );
}

// ── Workflow Status Summary ─────────────────────────────────────────────

interface WorkflowStatusSummaryProps {
  requisition: WorkflowDocument;
  workflowStatus: any;
}

export function WorkflowStatusSummary({
  requisition,
  workflowStatus,
}: WorkflowStatusSummaryProps) {
  if (workflowStatus && workflowStatus.status !== "no_workflow") {
    return (
      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Progress:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  workflowStatus.status?.toUpperCase() === "COMPLETED"
                    ? "bg-green-500"
                    : workflowStatus.status?.toUpperCase() === "REJECTED"
                      ? "bg-red-500"
                      : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.max(10, (workflowStatus.currentStage / Math.max(1, workflowStatus.totalStages)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {workflowStatus.currentStage}/{workflowStatus.totalStages}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <StatusBadge
              status={workflowStatus.status || "unknown"}
              type="approval"
              className="text-xs px-3 py-1"
            />
          </div>

          <div className="flex items-center justify-end">
            {workflowStatus.nextApprover &&
              workflowStatus.status?.toUpperCase() !== "COMPLETED" &&
              workflowStatus.status?.toUpperCase() !== "REJECTED" && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Next approver:</p>
                  <p className="font-medium text-gray-700 truncate capitalize">
                    {workflowStatus.nextApprover}
                  </p>
                </div>
              )}
            {workflowStatus.status?.toUpperCase() === "COMPLETED" && (
              <div className="text-right text-green-600">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                <span className="text-xs font-medium">Fully Approved</span>
              </div>
            )}
            {workflowStatus.status?.toUpperCase() === "REJECTED" && (
              <div className="text-right text-red-600">
                <XCircle className="h-4 w-4 inline mr-1" />
                <span className="text-xs font-medium">Rejected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    requisition.status?.toUpperCase() === "DRAFT" ||
    requisition.status?.toUpperCase() === "REJECTED"
  ) {
    return (
      <div className="mt-6 pt-6 border-t">
        <div className="text-center text-sm text-gray-500">
          <p>Submit this requisition to start the approval workflow</p>
        </div>
      </div>
    );
  }

  return null;
}

// ── Legacy wrapper (kept for backward compat if used elsewhere) ─────────

interface ApprovalHistoryPanelProps {
  requisitionId: string;
  requisition: WorkflowDocument;
  userRole: string;
  actionHistory?: ActionHistoryEntry[];
  approvalChain?: ApprovalRecord[];
}

const AUDIT_ROLES = ["admin", "finance"];

function AuditTrailContent({ entries }: { entries: AuditTrailEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No audit events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 p-3 rounded-lg border bg-muted/30 text-sm"
        >
          <div className="mt-0.5">{getActionIcon(entry.action)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.documentLabel && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {entry.documentLabel}
                </Badge>
              )}
              <span className="font-medium capitalize">
                {entry.action.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            {entry.documentType && (
              <p className="text-muted-foreground text-xs mt-0.5">
                {entry.documentType}
              </p>
            )}
            <p className="text-muted-foreground text-xs mt-1">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalHistoryPanel({
  requisitionId,
  requisition,
  userRole,
  actionHistory,
  approvalChain,
}: ApprovalHistoryPanelProps) {
  const isAdminUser = AUDIT_ROLES.includes((userRole || "").toLowerCase());

  const {
    approvalHistory,
    availableApprovers,
    workflowStatus,
    isLoading,
    hasError,
    refetchAll,
  } = useApprovalPanelData(requisitionId, "REQUISITION");

  const { data: auditTrail = [] } = useRequisitionAuditTrail(
    requisitionId,
    isAdminUser,
  );

  const handleApprovalComplete = () => {
    refetchAll();
  };

  if (hasError && !actionHistory?.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Failed to load approval data</p>
          <button
            onClick={refetchAll}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList
          className={`grid w-full ${isAdminUser ? "grid-cols-4" : "grid-cols-3"}`}
        >
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="chain">Approval Chain</TabsTrigger>
          <TabsTrigger value="approvers">Approval Actions</TabsTrigger>
          {isAdminUser && (
            <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="timeline" className="space-y-4 mt-4">
          <ActivityLogContent actionHistory={actionHistory} />
        </TabsContent>

        <TabsContent value="chain" className="space-y-4 mt-4">
          <ApprovalChainContent
            requisition={requisition}
            approvalChain={approvalChain}
            approvalHistory={approvalHistory}
            workflowStatus={workflowStatus}
            availableApprovers={availableApprovers}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="approvers" className="space-y-4 mt-4">
          <ApprovalActionContent
            requisitionId={requisitionId}
            requisition={requisition}
            workflowStatus={workflowStatus}
            isLoading={isLoading}
            onApprovalComplete={handleApprovalComplete}
          />
        </TabsContent>

        {isAdminUser && (
          <TabsContent value="audit-trail" className="space-y-4 mt-4">
            <AuditTrailContent entries={auditTrail} />
          </TabsContent>
        )}
      </Tabs>

      <WorkflowStatusSummary
        requisition={requisition}
        workflowStatus={workflowStatus}
      />
    </Card>
  );
}
