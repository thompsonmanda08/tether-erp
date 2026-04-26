"use client";

import { Switch as NextUISwitch } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentProps<typeof NextUISwitch> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, isSelected, onValueChange, children, ...props }, ref) => (
    <NextUISwitch ref={ref} data-slot="switch" isSelected={isSelected ?? checked} onValueChange={onValueChange ?? onCheckedChange} className={cn(className)} {...props}>
      {children}
    </NextUISwitch>
  )
);
Switch.displayName = "Switch";
export { Switch };
