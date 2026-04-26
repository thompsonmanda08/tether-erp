"use client";

import { Progress as NextUIProgress } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof NextUIProgress> & { value?: number }>(
  ({ className, value, color = "primary", size = "sm", ...props }, ref) => (
    <NextUIProgress ref={ref as any} data-slot="progress" value={value} color={color} size={size} className={cn("w-full", className)} {...props} />
  )
);
Progress.displayName = "Progress";
export { Progress };
