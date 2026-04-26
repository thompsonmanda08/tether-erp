import { cn } from "@/lib/utils";
import * as React from "react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "./spinner";

type SelectInputProps = React.InputHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  value?: string;
  className?: string;
  listItemName?: string;
  options: {
    id?: string;
    name?: string;
    value: string;
    label?: string;
    title?: string;
    [x: string]: any;
  }[];
  onValueChange?: (value: string) => void;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
    options?: string;
    selectContent?: string;
  };
};

const SelectField = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      className,
      type,
      label,
      name,
      value,
      classNames,
      onError,
      error,
      isLoading,
      defaultValue = "",
      placeholder,
      onValueChange,
      listItemName,
      isInvalid,
      options,
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
              "mb-0.5 pl-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate",
              {
                "text-red-500": onError || isInvalid,
                "opacity-50": isDisabled || props?.disabled,
              },
              classNames?.label,
            )}
            htmlFor={name}
            title={label}
          >
            {label}{" "}
            {props?.required && (
              <span className="font-bold text-red-500"> *</span>
            )}
          </label>
        )}

        <Select
          {...(value !== undefined ? { value } : { defaultValue: String(defaultValue) })}
          onValueChange={onValueChange}
          disabled={isDisabled || props?.disabled}
        >
          <SelectTrigger
            size={
              typeof props?.size === "string" &&
              (props.size === "default" || props.size === "sm")
                ? props.size
                : "default"
            }
            className={cn(
              // Base styles matching input.tsx
              "w-full px-4 py-2 text-base bg-foreground/5 border border-border rounded-lg transition-all duration-200 outline-none",
              // Placeholder styles
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
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
              "disabled:bg-slate-50/50 disabled:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60",
              // Text styles
              "text-slate-900 dark:text-slate-100 selection:bg-primary-100 selection:text-primary-900",
              "capitalize ",
              className,
              classNames?.input,
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Spinner className="h-5 w-5" />
                Loading...
              </div>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent
            className={cn(classNames?.options, classNames?.selectContent)}
          >
            {options?.map((item: any, index) => {
              const itemValue = item?.value || item.id || index.toString();
              const itemLabel =
                item?.[String(listItemName)] ||
                item.name ||
                item?.title ||
                item?.label ||
                itemValue;

              return (
                <SelectItem key={itemValue} value={itemValue}>
                  {itemLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

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
            whileInView={{
              scale: [0, 1],
              opacity: [0, 1],
              transition: { duration: 0.3 },
            }}
          >
            {errorText ? errorText : descriptionText}
          </motion.span>
        )}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";

export { SelectField };
