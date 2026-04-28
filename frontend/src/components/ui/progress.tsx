"use client";

import { Progress as RawNextUIProgress } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// HeroUI's Progress uses a complex generic that conflicts with simple
// shadcn-style ComponentProps extension. Treat as permissive at the boundary.
const NextUIProgress = RawNextUIProgress as any;

export type ProgressProps = {
  className?: string;
  /** Value 0-100 */
  value?: number;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  [key: string]: any;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, color = "primary", size = "sm", ...props }, ref) => (
    <NextUIProgress
      ref={ref}
      data-slot="progress"
      value={value}
      color={color}
      size={size}
      className={cn("w-full", className)}
      {...props}
    />
  ),
);

Progress.displayName = "Progress";

export { Progress };
