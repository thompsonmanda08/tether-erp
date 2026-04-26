"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  htmlFor,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
