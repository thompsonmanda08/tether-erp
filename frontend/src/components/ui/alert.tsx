"use client";

import { Card, CardBody } from "@heroui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

// NextUI doesn't have a built-in Alert — we use a styled Card

type AlertVariant = "default" | "destructive" | "warning" | "success" | "info";

const variantStyles: Record<AlertVariant, string> = {
  default: "bg-background border border-border text-foreground",
  destructive: "bg-danger-50 border border-danger-200 text-danger-800 dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300",
  warning: "bg-warning-50 border border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300",
  success: "bg-success-50 border border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-300",
  info: "bg-primary-50 border border-primary-200 text-primary-800 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300",
};

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }
>(({ className, variant = "default", children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    data-slot="alert"
    className={cn(
      "relative w-full rounded-lg p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
      variantStyles[variant],
      className
    )}
    {...props}
  >
    {children}
  </div>
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    data-slot="alert-title"
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle };
