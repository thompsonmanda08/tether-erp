"use client";

import { Tooltip as NextUITooltip } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils/index";

// ── TooltipProvider (no-op — NextUI doesn't need one) ─────────────────────

function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>;
}

// ── Context to pass content from TooltipContent to Tooltip ────────────────

type TooltipContextValue = {
  content: React.ReactNode;
  setContent: (c: React.ReactNode) => void;
};

const TooltipContext = React.createContext<TooltipContextValue>({
  content: null,
  setContent: () => {},
});

// ── Tooltip root ───────────────────────────────────────────────────────────

function Tooltip({
  children,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  ...props
}: {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}) {
  const [content, setContent] = React.useState<React.ReactNode>(null);

  return (
    <TooltipContext.Provider value={{ content, setContent }}>
      <TooltipInner content={content} isOpen={open} {...props}>
        {children}
      </TooltipInner>
    </TooltipContext.Provider>
  );
}

function TooltipInner({
  children,
  content,
  isOpen,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  isOpen?: boolean;
}) {
  // Find trigger and content children
  let trigger: React.ReactNode = null;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const slot = (child.props as any)["data-slot"];
      if (slot === "tooltip-trigger") trigger = child;
    }
  });

  if (!trigger) return <>{children}</>;

  return (
    <NextUITooltip
      content={content}
      isOpen={isOpen}
      placement="top"
      {...(props as any)}
    >
      {trigger as React.ReactElement}
    </NextUITooltip>
  );
}

// ── TooltipTrigger ─────────────────────────────────────────────────────────

function TooltipTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return (
    <span data-slot="tooltip-trigger" {...props}>
      {children}
    </span>
  );
}

// ── TooltipContent ─────────────────────────────────────────────────────────

function TooltipContent({
  className,
  children,
  sideOffset,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  sideOffset?: number;
}) {
  const { setContent } = React.useContext(TooltipContext);

  React.useEffect(() => {
    setContent(
      <span className={cn("text-xs", className)} {...props}>
        {children}
      </span>
    );
    return () => setContent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, className]);

  return null;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
