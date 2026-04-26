"use client";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

function Loader({
  size = 50,
  loadingText,
  color,
  className,
  classNames,
  isLandscape,
}: {
  size?: number;
  loadingText?: string;
  color?: string;
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
        <Spinner className={spinner} />
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
