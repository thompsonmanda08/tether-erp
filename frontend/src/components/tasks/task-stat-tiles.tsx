"use client";

import { cn } from "@/lib/utils";
import { useTaskStats } from "@/hooks/use-task-queries";
import { AlertCircle, CheckCircle2, Clock, Hand } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface TileProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: "neutral" | "warning" | "danger" | "success";
  hint?: string;
  loading?: boolean;
}

function Tile({ label, value, icon: Icon, tone, hint, loading }: TileProps) {
  return (
    <div className="rounded-lg border border-divider bg-content1 px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tabular-nums",
              loading && "animate-pulse text-muted-foreground",
              tone === "danger" && "text-danger-600",
              tone === "warning" && "text-warning-600",
              tone === "success" && "text-success-600",
            )}
          >
            {loading ? "—" : value}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-md p-2",
            tone === "danger" && "bg-danger-100 text-danger-600 dark:bg-danger-100/30",
            tone === "warning" && "bg-warning-100 text-warning-600 dark:bg-warning-100/30",
            tone === "success" && "bg-success-100 text-success-600 dark:bg-success-100/30",
            tone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

interface TaskStatTilesProps {
  userId: string;
}

export function TaskStatTiles({ userId }: TaskStatTilesProps) {
  const { data: stats, isLoading } = useTaskStats(userId);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Pending"
        value={stats?.pendingTasks ?? 0}
        icon={Clock}
        tone="warning"
        hint="Awaiting your action"
        loading={isLoading}
      />
      <Tile
        label="High priority"
        value={stats?.highPriorityTasks ?? 0}
        icon={Hand}
        tone="neutral"
        hint="Urgent or high"
        loading={isLoading}
      />
      <Tile
        label="Overdue"
        value={stats?.overdueTasks ?? 0}
        icon={AlertCircle}
        tone="danger"
        hint="Past due date"
        loading={isLoading}
      />
      <Tile
        label="Completed"
        value={stats?.completedTasks ?? 0}
        icon={CheckCircle2}
        tone="success"
        hint="Finished tasks"
        loading={isLoading}
      />
    </div>
  );
}
