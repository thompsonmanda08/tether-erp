"use client";

import { Skeleton as NextUISkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <NextUISkeleton data-slot="skeleton" className={cn("rounded-md", className)} {...(props as any)} />;
}
export { Skeleton };
