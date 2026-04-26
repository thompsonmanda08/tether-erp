"use client";

import { Spinner as NextUISpinner } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "default" | "current";
}

export function Spinner({ className, size = "sm", color = "current" }: SpinnerProps) {
  return (
    <NextUISpinner
      size={size}
      color={color}
      className={cn(className)}
    />
  );
}

export default Spinner;
