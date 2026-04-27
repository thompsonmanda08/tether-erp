"use client";

import { Divider } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <Divider
      data-slot="separator-root"
      orientation={orientation}
      className={cn(className)}
      {...(props as any)}
    />
  );
}

export { Separator };
