"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "@heroui/react";

function Loader({
  size = 50,
  loadingText,
  color = "primary",
  className,
  classNames,
  isLandscape,
}: {
  size?: number;
  loadingText?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "default";
  className?: string;
  classNames?: {
    container?: string;
    wrapper?: string;
    spinner?: string;
    text?: string;
  };
  isLandscape?: boolean;
}) {
  const { container, wrapper, spinner, text } = classNames || {};

  // Map size to NextUI size
  const getSpinnerSize = () => {
    if (size <= 20) return "sm";
    if (size <= 40) return "md";
    return "lg";
  };

  return (
    <div
      className={cn(
        "bg-card/10 grid min-h-80 min-w-80 flex-1 flex-grow place-items-center rounded-xl py-8",
        wrapper
      )}
    >
      <div
        className={cn(
          "flex w-max flex-col items-center justify-start gap-4",
          container,
          className,
          { "flex-row": isLandscape }
        )}
      >
        <Spinner 
          size={getSpinnerSize()} 
          color={color}
          className={spinner} 
        />
        {loadingText && (
          <p
            className={cn(
              "text-foreground/80 mt-4 max-w-sm font-bold break-words",
              text
            )}
          >
            {loadingText}
          </p>
        )}
      </div>
    </div>
  );
}

export default Loader;
