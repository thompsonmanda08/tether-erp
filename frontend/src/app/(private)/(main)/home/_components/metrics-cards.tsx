"use client";

import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/types";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

interface MetricTile {
  title: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: "info" | "warning" | "success" | "danger";
}

const toneClass: Record<MetricTile["tone"], string> = {
  info: "bg-secondary-100 text-secondary-700 dark:bg-secondary-100/30 dark:text-secondary-300",
  warning: "bg-warning-100 text-warning-700 dark:bg-warning-100/30 dark:text-warning-300",
  success: "bg-success-100 text-success-700 dark:bg-success-100/30 dark:text-success-300",
  danger: "bg-danger-100 text-danger-700 dark:bg-danger-100/30 dark:text-danger-300",
};

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const tiles: MetricTile[] = [
    {
      title: "Total documents",
      value: metrics.totalDocuments,
      hint: "All time",
      icon: FileText,
      tone: "info",
    },
    {
      title: "Pending approval",
      value: metrics.pendingApproval,
      hint: "Awaiting review",
      icon: Clock,
      tone: "warning",
    },
    {
      title: "Approved",
      value: metrics.approvedDocuments,
      hint: "This period",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      title: "Needs action",
      value: metrics.documentsNeedingAction,
      hint: "Requires attention",
      icon: AlertCircle,
      tone: "danger",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.title}
          className="rounded-lg border border-divider bg-content1 px-5 py-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.title}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {t.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <div className={cn("rounded-md p-2", toneClass[t.tone])}>
              <t.icon className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
