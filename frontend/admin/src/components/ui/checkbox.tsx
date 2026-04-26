"use client";

import { Checkbox as NextUICheckbox } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.ComponentProps<typeof NextUICheckbox> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, isSelected, onValueChange, children, ...props }, ref) => (
    <NextUICheckbox ref={ref} data-slot="checkbox" isSelected={isSelected ?? checked} onValueChange={onValueChange ?? onCheckedChange} className={cn(className)} {...props}>
      {children}
    </NextUICheckbox>
  )
);
Checkbox.displayName = "Checkbox";
export { Checkbox };
