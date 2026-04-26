"use client";

import { Tooltip as NextUITooltip } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>;
}

type TooltipCtx = { content: React.ReactNode; setContent: (c: React.ReactNode) => void };
const TooltipContext = React.createContext<TooltipCtx>({ content: null, setContent: () => {} });

function Tooltip({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void; delayDuration?: number }) {
  const [content, setContent] = React.useState<React.ReactNode>(null);
  let trigger: React.ReactNode = null;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child.props as any)["data-slot"] === "tooltip-trigger") trigger = child;
  });
  if (!trigger) return <>{children}</>;
  return (
    <TooltipContext.Provider value={{ content, setContent }}>
      <NextUITooltip content={content} isOpen={open} placement="top">
        {trigger as React.ReactElement}
      </NextUITooltip>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.props as any)["data-slot"] !== "tooltip-trigger") return child;
        return null;
      })}
    </TooltipContext.Provider>
  );
}

function TooltipTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) {
  return <span data-slot="tooltip-trigger" {...props}>{children}</span>;
}

function TooltipContent({ className, children, sideOffset, ...props }: { className?: string; children: React.ReactNode; sideOffset?: number }) {
  const { setContent } = React.useContext(TooltipContext);
  React.useEffect(() => {
    setContent(<span className={cn("text-xs", className)} {...props}>{children}</span>);
    return () => setContent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, className]);
  return null;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
