"use client";

import { Switch as NextUISwitch } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ComponentProps<typeof NextUISwitch>, "id" | "name"> {
  /** shadcn compat: checked state */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** shadcn compat: disabled */
  disabled?: boolean;
  id?: string;
  name?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      isSelected,
      onValueChange,
      disabled,
      isDisabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <NextUISwitch
        ref={ref}
        data-slot="switch"
        isSelected={isSelected ?? checked}
        onValueChange={onValueChange ?? onCheckedChange}
        isDisabled={isDisabled ?? disabled}
        className={cn(className)}
        {...props}
      >
        {children}
      </NextUISwitch>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
