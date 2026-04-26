"use client";

import { Dropdown, DropdownTrigger as NextUIDropdownTrigger, DropdownMenu as NextUIDropdownMenu, DropdownItem as NextUIDropdownItem, DropdownSection } from "@heroui/react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

function DropdownMenu({ children, ...props }: { children: React.ReactNode }) {
  return <Dropdown data-slot="dropdown-menu" {...(props as any)}>{children}</Dropdown>;
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function DropdownMenuTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) {
  return <NextUIDropdownTrigger data-slot="dropdown-menu-trigger" {...(props as any)}>{children}</NextUIDropdownTrigger>;
}

function DropdownMenuContent({ className, sideOffset = 4, children, ...props }: { className?: string; sideOffset?: number; children: React.ReactNode }) {
  return <NextUIDropdownMenu data-slot="dropdown-menu-content" className={cn("min-w-[8rem]", className)} {...(props as any)}>{children}</NextUIDropdownMenu>;
}

function DropdownMenuGroup({ children, ...props }: { children: React.ReactNode }) {
  return <DropdownSection data-slot="dropdown-menu-group" {...(props as any)}>{children}</DropdownSection>;
}

function DropdownMenuItem({ className, inset, variant = "default", children, ...props }: { className?: string; inset?: boolean; variant?: "default" | "destructive"; children: React.ReactNode; key?: string }) {
  return <NextUIDropdownItem data-slot="dropdown-menu-item" className={cn({ "pl-8": inset, "text-danger": variant === "destructive" }, className)} color={variant === "destructive" ? "danger" : "default"} {...(props as any)}>{children}</NextUIDropdownItem>;
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }: { className?: string; children: React.ReactNode; checked?: boolean; key?: string }) {
  return <NextUIDropdownItem data-slot="dropdown-menu-checkbox-item" className={cn("pl-8", className)} {...(props as any)}><span className="absolute left-2 flex size-3.5 items-center justify-center">{checked && <CheckIcon className="size-4" />}</span>{children}</NextUIDropdownItem>;
}

function DropdownMenuRadioGroup({ children, ...props }: { children: React.ReactNode }) {
  return <DropdownSection data-slot="dropdown-menu-radio-group" {...(props as any)}>{children}</DropdownSection>;
}

function DropdownMenuRadioItem({ className, children, ...props }: { className?: string; children: React.ReactNode; key?: string }) {
  return <NextUIDropdownItem data-slot="dropdown-menu-radio-item" className={cn("pl-8", className)} {...(props as any)}>{children}</NextUIDropdownItem>;
}

function DropdownMenuLabel({ className, inset, children, ...props }: { className?: string; inset?: boolean; children: React.ReactNode }) {
  return <div data-slot="dropdown-menu-label" className={cn("px-2 py-1.5 text-sm font-medium", { "pl-8": inset }, className)} {...props}>{children}</div>;
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div data-slot="dropdown-menu-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />;
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function DropdownMenuSubTrigger({ className, inset, children, ...props }: { className?: string; inset?: boolean; children: React.ReactNode }) {
  return <NextUIDropdownItem data-slot="dropdown-menu-sub-trigger" className={cn("flex items-center", { "pl-8": inset }, className)} {...(props as any)}>{children}<ChevronRightIcon className="ml-auto size-4" /></NextUIDropdownItem>;
}

function DropdownMenuSubContent({ className, children, ...props }: { className?: string; children: React.ReactNode }) {
  return <NextUIDropdownMenu data-slot="dropdown-menu-sub-content" className={cn("min-w-[8rem]", className)} {...(props as any)}>{children}</NextUIDropdownMenu>;
}

export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger };
