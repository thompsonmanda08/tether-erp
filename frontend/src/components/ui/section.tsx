"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface SectionProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  variant?: "card" | "plain";
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * Primary section primitive used on detail pages, settings panels, and
 * dashboard tiles. Provides consistent header (title + optional icon +
 * optional actions) and body container.
 *
 * variant="card" wraps body in a bordered surface (default).
 * variant="plain" omits border for nested or dense layouts.
 */
export function Section({
  title,
  description,
  icon: Icon,
  actions,
  variant = "card",
  className,
  bodyClassName,
  children,
}: SectionProps) {
  const hasHeader = !!title || !!actions || !!description;

  return (
    <section
      className={cn(
        "w-full",
        variant === "card" &&
          "rounded-lg border border-divider bg-content1",
        className,
      )}
    >
      {hasHeader && (
        <header
          className={cn(
            "flex items-start justify-between gap-4",
            variant === "card" ? "px-6 pt-5 pb-3" : "pb-3",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <Icon
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground"
              />
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground leading-snug">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}

      <div
        className={cn(
          variant === "card" && (hasHeader ? "px-6 pb-6" : "p-6"),
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
