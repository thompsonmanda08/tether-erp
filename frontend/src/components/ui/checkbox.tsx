"use client";

import { Checkbox as NextUICheckbox } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ComponentProps<typeof NextUICheckbox>, "id" | "name"> {
  /** shadcn compat: checked state */
  checked?: boolean;
  /** shadcn compat: indeterminate state */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Standard HTML attrs commonly forwarded by shadcn callers. */
  id?: string;
  name?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, isSelected, onValueChange, children, ...props }, ref) => {
    return (
      <NextUICheckbox
        ref={ref}
        data-slot="checkbox"
        isSelected={isSelected ?? checked}
        onValueChange={onValueChange ?? onCheckedChange}
        className={cn(className)}
        {...props}
      >
        {children}
      </NextUICheckbox>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
