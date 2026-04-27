"use client";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../status-badge";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface TStatusBadge {
  status: string;
  type:
    | "document"
    | "action"
    | "execution"
    | "approval"
    | "compliance"
    | "role"
    | "health";
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  badges?: TStatusBadge[];
  onBackClick?: () => void;
  showBackButton?: boolean;
  /**
   * Action buttons rendered to the right of the title on desktop,
   * and below the title on mobile. Pass an array of ReactNode elements
   * (typically <Button> components). They wrap naturally when there are
   * more than 3 buttons on narrow screens.
   */
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  description,
  badges,
  onBackClick,
  showBackButton = false,
  actions,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-4 transition-colors duration-300 w-full">
      {/* Title row + actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {/* Left: back button + title block */}
        <div className="flex gap-4 items-start min-w-0">
          {showBackButton && (
            <Button
              onClick={() => {
                if (onBackClick !== undefined) {
                  onBackClick?.();
                } else {
                  router.back();
                }
              }}
              variant="outline"
              className="flex items-center h-10 w-10 aspect-square shrink-0 gap-2 text-foreground/70 transition-colors group"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Button>
          )}

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-end gap-2 md:gap-3">
              <h1 className="text-2xl capitalize md:text-3xl font-bold text-foreground dark:text-foreground/90 tracking-tight">
                {title}
              </h1>

              {badges && badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-0.5">
                  {badges.map((badge, index) => (
                    <StatusBadge
                      key={index}
                      status={badge.status}
                      type={badge.type}
                    />
                  ))}
                </div>
              )}
            </div>

            {subtitle && (
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
                {subtitle}
              </p>
            )}

            {description && (
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mt-2 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: action buttons — inline on sm+, full-width wrap on mobile */}
        {actions && (
          <div className="flex flex-wrap gap-2 sm:shrink-0 sm:mt-1">
            {actions}
          </div>
        )}
      </div>

      <div className="mt-4 h-0.5 bg-linear-to-r from-slate-200 via-slate-300 to-transparent dark:to-transparent rounded-full" />
    </div>
  );
}
