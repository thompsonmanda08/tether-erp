"use client";

import { RadioGroup as NextUIRadioGroup, Radio } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function RadioGroup({ className, value, defaultValue, onValueChange, children, ...props }: { className?: string; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  return (
    <NextUIRadioGroup data-slot="radio-group" value={value} defaultValue={defaultValue} onValueChange={onValueChange} className={cn("grid gap-3", className)} {...(props as any)}>
      {children}
    </NextUIRadioGroup>
  );
}

function RadioGroupItem({ className, value, children, disabled, ...props }: { className?: string; value: string; children?: React.ReactNode; disabled?: boolean; id?: string }) {
  return <Radio data-slot="radio-group-item" value={value} isDisabled={disabled} className={cn(className)} {...(props as any)}>{children}</Radio>;
}

export { RadioGroup, RadioGroupItem };
