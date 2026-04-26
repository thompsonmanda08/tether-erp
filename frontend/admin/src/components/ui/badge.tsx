"use client";

import { Chip } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "info" | "success";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  asChild?: boolean;
}

function getChipProps(variant: BadgeVariant = "default") {
  switch (variant) {
    case "destructive": return { color: "danger" as const, variant: "solid" as const };
    case "secondary": return { color: "secondary" as const, variant: "solid" as const };
    case "outline": return { color: "default" as const, variant: "bordered" as const };
    case "warning": return { color: "warning" as const, variant: "flat" as const };
    case "info": return { color: "primary" as const, variant: "flat" as const };
    case "success": return { color: "success" as const, variant: "flat" as const };
    default: return { color: "primary" as const, variant: "solid" as const };
  }
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <Chip data-slot="badge" size="sm" radius="sm" className={cn(className)} {...getChipProps(variant)} {...(props as any)}>
      {children}
    </Chip>
  );
}

export { Badge };
