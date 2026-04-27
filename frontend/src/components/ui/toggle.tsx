import * as React from "react";

import { cn } from "@/lib/utils";

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning";
  disabled?: boolean;
  loading?: boolean;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      checked = false,
      onChange,
      size = "md",
      variant = "default",
      disabled = false,
      loading = false,
      ...props
    },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled && !loading && onChange) {
        onChange(!checked);
      }
    };

    const sizeClasses = {
      sm: {
        track: "h-4 w-7 sm:h-5 sm:w-9 p-0.5",
        thumb: "h-3 w-3 sm:h-4 sm:w-4",
        translate: checked ? "translate-x-3 sm:translate-x-4" : "translate-x-0",
      },
      md: {
        track: "h-5 w-9 p-0.5",
        thumb: "h-4 w-4",
        translate: checked ? "translate-x-4" : "translate-x-0",
      },
      lg: {
        track: "h-6 w-11 p-0.5",
        thumb: "h-5 w-5",
        translate: checked ? "translate-x-5" : "translate-x-0",
      },
    };

    const variantClasses = {
      default: checked ? "bg-foreground" : "bg-muted-foreground/30",
      success: checked ? "bg-green-600" : "bg-muted-foreground/30",
      warning: checked ? "bg-yellow-500" : "bg-muted-foreground/30",
    };

    const currentSize = sizeClasses[size];
    const currentVariant = variantClasses[variant];

    return (
      <button
        type="button"
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          currentSize.track,
          currentVariant,
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        disabled={disabled || loading}
        ref={ref}
        role="switch"
        aria-checked={checked}
        {...props}
      >
        <span
          className={cn(
            "transform rounded-full bg-white transition-transform flex items-center justify-center",
            currentSize.thumb,
            currentSize.translate
          )}
        >
          {loading && (
            <div className="flex items-center justify-center space-x-0.5">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
              <div
                className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          )}
        </span>
      </button>
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle };
