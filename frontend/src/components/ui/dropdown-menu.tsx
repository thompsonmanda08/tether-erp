"use client";

import {
  Dropdown,
  DropdownTrigger as NextUIDropdownTrigger,
  DropdownMenu as RawNextUIDropdownMenu,
  DropdownItem as RawNextUIDropdownItem,
  DropdownSection as RawDropdownSection,
} from "@heroui/react";

// HeroUI's collection components use react-aria typed children
// (CollectionChildren / ItemElement) which collide with shadcn's
// arbitrary-children patterns. Cast to permissive types so call sites
// keep their existing JSX shape.
const NextUIDropdownMenu = RawNextUIDropdownMenu as any;
const NextUIDropdownItem = RawNextUIDropdownItem as any;
const DropdownSection = RawDropdownSection as any;
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

// Main Dropdown component
function DropdownMenu({
  children,
  open,
  onOpenChange,
  ...props
}: {
  children: React.ReactNode;
  /** Radix-compat controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dropdown
      data-slot="dropdown-menu"
      isOpen={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      {children as any}
    </Dropdown>
  );
}

// Portal - Not needed in NextUI
function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Trigger
function DropdownMenuTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) {
  return (
    <NextUIDropdownTrigger data-slot="dropdown-menu-trigger" {...props}>
      {children}
    </NextUIDropdownTrigger>
  );
}

// Content
type DropdownMenuContentProps = {
  className?: string;
  sideOffset?: number;
  /** Alignment hint kept for shadcn/ui call-site compatibility (no-op under HeroUI). */
  align?: "start" | "center" | "end";
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof NextUIDropdownMenu>, "children" | "className">;

function DropdownMenuContent({
  className,
  sideOffset: _sideOffset = 4,
  align: _align,
  children,
  ...props
}: DropdownMenuContentProps) {
  return (
    <NextUIDropdownMenu
      data-slot="dropdown-menu-content"
      className={cn("min-w-[8rem]", className)}
      {...props}
    >
      {children}
    </NextUIDropdownMenu>
  );
}

// Group
function DropdownMenuGroup({ children, ...props }: { children: React.ReactNode }) {
  return (
    <DropdownSection data-slot="dropdown-menu-group" {...props}>
      {children}
    </DropdownSection>
  );
}

// Item
type DropdownMenuItemProps = {
  className?: string;
  inset?: boolean;
  variant?: "default" | "destructive";
  children: React.ReactNode;
  key?: string;
  /** shadcn-compat onClick — wired to HeroUI's onAction. */
  onClick?: (e?: React.MouseEvent) => void;
} & Omit<
  React.ComponentProps<typeof NextUIDropdownItem>,
  "children" | "className" | "color" | "onAction" | "key"
>;

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  onClick,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <NextUIDropdownItem
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        {
          "pl-8": inset,
          "text-danger": variant === "destructive",
        },
        className,
      )}
      color={variant === "destructive" ? "danger" : "default"}
      onPress={onClick ? () => onClick() : undefined}
      {...props}
    >
      {children}
    </NextUIDropdownItem>
  );
}

// Checkbox Item
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange: _onCheckedChange,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  checked?: boolean;
  key?: string;
  /** Radix-compat handler (no-op; HeroUI doesn't expose checkbox toggle). */
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <NextUIDropdownItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn("pl-8", className)}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <CheckIcon className="size-4" />}
      </span>
      {children}
    </NextUIDropdownItem>
  );
}

// Radio Group
function DropdownMenuRadioGroup({ children, ...props }: { children: React.ReactNode }) {
  return (
    <DropdownSection data-slot="dropdown-menu-radio-group" {...props}>
      {children}
    </DropdownSection>
  );
}

// Radio Item
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  key?: string;
}) {
  return (
    <NextUIDropdownItem
      data-slot="dropdown-menu-radio-item"
      className={cn("pl-8", className)}
      {...props}
    >
      {children}
    </NextUIDropdownItem>
  );
}

// Label
function DropdownMenuLabel({
  className,
  inset,
  children,
  ...props
}: {
  className?: string;
  inset?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-sm font-medium", { "pl-8": inset }, className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Separator
function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
    />
  );
}

// Shortcut
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

// Sub Menu
function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Sub Trigger
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: {
  className?: string;
  inset?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NextUIDropdownItem
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn("flex items-center", { "pl-8": inset }, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </NextUIDropdownItem>
  );
}

// Sub Content
function DropdownMenuSubContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <NextUIDropdownMenu
      data-slot="dropdown-menu-sub-content"
      className={cn("min-w-[8rem]", className)}
      {...props}
    >
      {children}
    </NextUIDropdownMenu>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
