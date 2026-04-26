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
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      isLoading = false,
      loadingText = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Map shadcn variants to NextUI props
    const getNextUIProps = () => {
      const baseProps: any = {
        isDisabled: disabled,
        isLoading: isLoading,
        ref,
      };

      switch (variant) {
        case "destructive":
          baseProps.color = "danger";
          break;
        case "outline":
          baseProps.variant = "bordered";
          baseProps.color = "default";
          break;
        case "secondary":
          baseProps.color = "secondary";
          break;
        case "ghost":
          baseProps.variant = "light";
          break;
        case "link":
          baseProps.variant = "light";
          baseProps.className = cn("underline-offset-4 hover:underline", className);
          break;
        default:
          baseProps.color = "primary";
      }

      // Map sizes
      switch (size) {
        case "sm":
          baseProps.size = "sm";
          break;
        case "lg":
          baseProps.size = "lg";
          break;
        case "icon":
          baseProps.isIconOnly = true;
          baseProps.size = "md";
          break;
        default:
          baseProps.size = "md";
      }

      return baseProps;
    };

    const nextUIProps = getNextUIProps();

    return (
      <NextUIButton
        {...nextUIProps}
        className={cn(className, nextUIProps.className)}
        {...props}
      >
        {isLoading && loadingText ? loadingText : children}
      </NextUIButton>
    );
  }
);

Button.displayName = "Button";

export { Button };
