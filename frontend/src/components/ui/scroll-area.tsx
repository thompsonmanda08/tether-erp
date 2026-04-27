"use client";

import { ScrollShadow } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// NextUI uses ScrollShadow for scroll areas with visual feedback

function ScrollArea({
  className,
  children,
  orientation = "vertical",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "vertical" | "horizontal" | "both";
}) {
  return (
    <ScrollShadow
      data-slot="scroll-area"
      orientation={orientation === "both" ? undefined : orientation}
      className={cn("relative", className)}
      {...(props as any)}
    >
      {children}
    </ScrollShadow>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
}: {
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  // ScrollShadow handles scrollbars automatically
  return null;
}

export { ScrollArea, ScrollBar };
