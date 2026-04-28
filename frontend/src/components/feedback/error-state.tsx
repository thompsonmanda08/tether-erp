"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Tone affects accent color of icon + retry button. */
  tone?: "danger" | "warning" | "neutral";
  /** Optional retry handler. Hides button when omitted. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Show "Back" button. Defaults to true. */
  showBack?: boolean;
  className?: string;
}

const toneConfig = {
  danger: {
    iconBg: "bg-danger-100 text-danger-600 dark:bg-danger-100/30 dark:text-danger-300",
    button: "danger" as const,
  },
  warning: {
    iconBg: "bg-warning-100 text-warning-600 dark:bg-warning-100/30 dark:text-warning-300",
    button: "warning" as const,
  },
  neutral: {
    iconBg: "bg-default-100 text-default-700 dark:bg-default-200/40",
    button: "default" as const,
  },
};

/**
 * Unified error / not-found state for pages and panels.
 * Consistent with new design tokens; replaces ad-hoc error panels.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Try again or go back.",
  icon: Icon = AlertTriangle,
  tone = "danger",
  onRetry,
  retryLabel = "Try again",
  showBack = true,
  className,
}: ErrorStateProps) {
  const router = useRouter();
  const cfg = toneConfig[tone];

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-divider bg-content1 px-6 py-12 text-center",
        className,
      )}
    >
      <div className={cn("rounded-full p-3", cfg.iconBg)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {showBack && (
          <Button variant="bordered" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {onRetry && (
          <Button color={cfg.button} onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
