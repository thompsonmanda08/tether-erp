import { cn } from "@/lib/utils";
import * as React from "react";
import { motion } from "framer-motion";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  name?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      startContent,
      endContent,
      className,
      type,
      label,
      name,
      classNames,
      onError,
      error,
      maxLength,
      max,
      isInvalid,
      min,
      isDisabled,
      descriptionText,
      errorText = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={cn("flex w-full flex-col", classNames?.wrapper, {
          "cursor-not-allowed opacity-50": isDisabled,
        })}
      >
        {label && (
          <label
            className={cn(
              "text-sm mb-0.5 font-medium text-slate-700 dark:text-slate-300",
              {
                "text-red-500": onError || isInvalid,
                "opacity-50": isDisabled || props?.disabled,
              },
              classNames?.label,
            )}
            htmlFor={name}
          >
            {label}{" "}
            {props?.required && (
              <span className="font-bold text-red-500"> *</span>
            )}
          </label>
        )}
        <div
          className={cn("w-full flex items-center relative", {
            "gap-2 ": startContent || endContent,
          })}
        >
          {startContent ? (
            <span className="absolute px-2 w-5 h-5 aspect-square grid items-center">
              {startContent}
            </span>
          ) : null}
          <input
            ref={ref}
            className={cn(
              // Base styles
              "w-full px-4 py-1.75 text-base bg-foreground/5 border border-border rounded-lg transition-all duration-200 outline-none",
              // Placeholder styles
              "placeholder:text-slate-400 dark:placeholder:text-foreground/30",
              // Focus styles with primary color
              "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:shadow-lg focus:shadow-primary-500/10",
              // Hover styles
              "hover:border-slate-300/50",
              // Error styles
              {
                "border-red-500 focus:border-red-500 focus:ring-red-500/20 focus:shadow-red-500/10":
                  onError || isInvalid,
              },
              // Disabled styles
              "disabled:bg-slate-50/50 disabled:cursor-not-allowed disabled:dark:bg-slate-50/10 disabled:text-foreground/70",
              // Text styles
              "text-slate-900 dark:text-slate-100 selection:bg-primary-100 selection:text-primary-900",
              { "pl-8 ": startContent },
              { "pr-8 ": endContent },
              className,
              classNames?.input,
            )}
            disabled={isDisabled || props?.disabled}
            id={name}
            maxLength={maxLength}
            max={max}
            min={min}
            name={name}
            type={type}
            {...props}
          />
          {endContent ? (
            <span className="absolute right-0 px-2 w-5 h-5 aspect-square grid items-center">
              {endContent}
            </span>
          ) : null}
        </div>

        {((errorText && (isInvalid || onError)) || descriptionText) && (
          <motion.span
            className={cn(
              "ml-1 text-xs text-slate-500 dark:text-slate-400",
              {
                "text-red-600 dark:text-red-400": onError || isInvalid,
              },
              classNames?.descriptionText,
              classNames?.errorText,
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {errorText ? errorText : descriptionText}
          </motion.span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
