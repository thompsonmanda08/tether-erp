"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/base/page-header";
import { useApprovalTasks, useClaimTask } from "@/hooks/use-approval-workflow";
import { useDebounce } from "@/hooks/use-debounce";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

import { TaskStatTiles } from "@/components/tasks/task-stat-tiles";
import { TaskRow, TasksTableShell, type TaskRowData } from "@/components/tasks/task-row";
import {
  TaskFilters,
  type TaskScope,
  type TaskDocType,
  type TaskPriority,
} from "@/components/tasks/task-filters";
import {
  QuickActionModal,
  type QuickAction,
} from "@/components/tasks/quick-action-modal";
import { canUserActOnWorkflowTask } from "@/lib/workflow-utils";

interface TasksClientProps {
  userId: string;
  userRole: string;
}

const PAGE_SIZE = 20;

export function TasksClient({ userId, userRole }: TasksClientProps) {
  const [scope, setScope] = useState<TaskScope>("mine");
  const [docType, setDocType] = useState<TaskDocType>("all");
  const [priority, setPriority] = useState<TaskPriority>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Filter args for API
  const apiFilters = useMemo(() => {
    const f: any = {};
    if (scope === "mine") {
      f.assignedToMe = true;
      f.status = "PENDING";
    } else if (scope === "available") {
      f.assignedToMe = false;
      f.status = "PENDING";
    } else if (scope === "completed") {
      f.viewAll = true;
      // backend supports filtering completed via status
      f.status = "APPROVED";
    } else {
      f.viewAll = true;
    }
    if (docType !== "all") f.documentType = docType.toLowerCase();
    if (priority !== "all") f.priority = priority;
    return f;
  }, [scope, docType, priority]);

  const { data, isLoading } = useApprovalTasks(apiFilters, page, PAGE_SIZE);
  const tasks: TaskRowData[] = (data?.data || []) as unknown as TaskRowData[];
  const pagination = data?.pagination;

  // Client-side search filter (backend doesn't search across fields)
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return tasks;
    const q = debouncedSearch.toLowerCase();
    return tasks.filter((t) => {
      return (
        t.documentNumber?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.requesterName?.toLowerCase().includes(q) ||
        t.stageName?.toLowerCase().includes(q)
      );
    });
  }, [tasks, debouncedSearch]);

  // ── Action handlers ──────────────────────────────────────────
  const claimMutation = useClaimTask("");
  const handleClaim = async (taskId: string) => {
    // useClaimTask binds id at hook call; fall back to direct action
    const { claimWorkflowTask } = await import(
      "@/app/_actions/workflow-approval-actions"
    );
    const res = await claimWorkflowTask(taskId);
    if (res.success) {
      // local optimistic refresh — react-query will refetch via invalidation
      setSelectedIds(new Set());
    }
  };

  const openAction = (taskId: string, action: QuickAction) => {
    setActiveTaskId(taskId);
    setActiveAction(action);
  };

  const toggleSelect = (id: string, on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ── Per-task permission ──────────────────────────────────────
  const canActOnTask = (task: TaskRowData): boolean => {
    return canUserActOnWorkflowTask(
      task as any,
      { id: userId, role: userRole, isBuiltInApprover: ["admin", "approver", "finance"].includes(userRole.toLowerCase()) } as any,
    );
  };

  const isClaimedByMe = (task: TaskRowData): boolean => {
    const claimedBy = (task as any).claimedBy;
    return !!claimedBy && claimedBy === userId;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Approvals, claims, and reassignments — your morning standup view."
        showBackButton={false}
      />

      <TaskStatTiles userId={userId} />

      <TaskFilters
        scope={scope}
        onScopeChange={(s) => {
          setScope(s);
          setPage(1);
        }}
        docType={docType}
        onDocTypeChange={(d) => {
          setDocType(d);
          setPage(1);
        }}
        priority={priority}
        onPriorityChange={(p) => {
          setPriority(p);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Inbox className="h-6 w-6" />
          </EmptyMedia>
          <EmptyContent>
            <h3 className="text-base font-semibold">All caught up</h3>
            <EmptyDescription>
              {scope === "mine"
                ? "You have no pending tasks. Take a break."
                : "No tasks match the current filters."}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <TasksTableShell showSelect>
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selectedIds.has(task.id)}
                onSelectChange={(on) => toggleSelect(task.id, on)}
                canAct={canActOnTask(task)}
                isClaimedByMe={isClaimedByMe(task)}
                onClaim={() => handleClaim(task.id)}
                onApprove={() => openAction(task.id, "approve")}
                onReject={() => openAction(task.id, "reject")}
                onReassign={() => openAction(task.id, "reassign")}
              />
            ))}
          </TasksTableShell>

          {pagination && pagination.totalPages > 1 && (
            <CustomPagination
              pagination={{
                page,
                page_size: PAGE_SIZE,
                total: pagination.total ?? filtered.length,
                totalPages: pagination.totalPages,
              } as any}
              updatePagination={({ page: p }) => setPage(p)}
            />
          )}
        </>
      )}

      {activeTaskId && activeAction && (
        <QuickActionModal
          open={!!activeAction}
          onOpenChange={(open) => {
            if (!open) {
              setActiveAction(null);
              setActiveTaskId(null);
            }
          }}
          action={activeAction}
          taskId={activeTaskId}
          documentNumber={
            tasks.find((t) => t.id === activeTaskId)?.documentNumber
          }
        />
      )}
    </div>
  );
}
