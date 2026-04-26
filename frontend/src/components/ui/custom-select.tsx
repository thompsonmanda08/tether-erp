"use client";

import { Select as NextUISelect, SelectItem } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.ComponentProps<typeof NextUISelect> {
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <NextUISelect
        ref={ref as any}
        variant="bordered"
        size="lg"
        className={cn("w-full", className)}
        {...props}
      >
        {children as any}
      </NextUISelect>
    );
  }
);

Select.displayName = "Select";

export { Select };
