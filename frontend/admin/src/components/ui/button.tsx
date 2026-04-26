"use client";

import { Button as NextUIButton } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils/index";

export interface ButtonProps extends React.ComponentProps<typeof NextUIButton> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, isLoading = false, loadingText = "", disabled, children, ...props }, ref) => {
    const getNextUIProps = (): any => {
      const p: any = { isDisabled: disabled, isLoading, ref };
      switch (variant) {
        case "destructive": p.color = "danger"; break;
        case "outline": p.variant = "bordered"; p.color = "default"; break;
        case "secondary": p.color = "secondary"; break;
        case "ghost": p.variant = "light"; break;
        case "link": p.variant = "light"; p.className = cn("underline-offset-4 hover:underline", className); break;
        default: p.color = "primary";
      }
      switch (size) {
        case "sm": p.size = "sm"; break;
        case "lg": p.size = "lg"; break;
        case "icon": p.isIconOnly = true; p.size = "md"; break;
        default: p.size = "md";
      }
      return p;
    };
    const nextUIProps = getNextUIProps();
    return (
      <NextUIButton {...nextUIProps} className={cn(className, nextUIProps.className)} {...props}>
        {isLoading && loadingText ? loadingText : children}
      </NextUIButton>
    );
  }
);
Button.displayName = "Button";
export { Button };
