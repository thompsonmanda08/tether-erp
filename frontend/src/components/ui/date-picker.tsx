"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DatePickerProps {
  label?: string;
  name?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onError?: boolean;
  error?: string;
  errorText?: string;
  descriptionText?: string;
  value?: Date;
  onValueChange?: (value?: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
}

function DatePickerComponent({
  label,
  name,
  isDisabled,
  isInvalid,
  onError,
  errorText,
  descriptionText,
  classNames,
  value,
  onValueChange,
  minDate,
  maxDate,
  placeholder,
  required,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Create disabled matcher for dates
  const disabledDates = React.useMemo(() => {
    if (!minDate && !maxDate) return undefined;

    return (date: Date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };
  }, [minDate, maxDate]);

  return (
    <div
      className={cn("flex w-full flex-col", classNames?.wrapper, {
        "cursor-not-allowed opacity-50": isDisabled || disabled,
      })}
    >
      {label && (
        <label
          className={cn(
            "mb-1 text-sm font-medium text-slate-700 dark:text-slate-300",
            {
              "text-red-500": onError || isInvalid,
              "opacity-50": isDisabled || disabled,
            },
            classNames?.label,
          )}
          htmlFor={name}
        >
          {label}{" "}
          {required && <span className="font-bold text-red-500"> *</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            id={name || "date"}
            className={cn(
              // Base styles matching input.tsx
              "w-full px-4 py-1 text-base bg-foreground/5 border border-border rounded-lg transition-all duration-200 outline-none",
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
              "justify-between text-left font-normal",
              !value && "text-slate-400 dark:text-slate-500",
              classNames?.input,
            )}
            disabled={isDisabled || disabled}
          >
            {value && value instanceof Date && !isNaN(value.getTime()) ? (
              format(value, "PPP")
            ) : (
              <span>{placeholder || "Pick a date"}</span>
            )}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            disabled={disabledDates || isDisabled || disabled}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2099, 11)}
            onSelect={(date) => {
              onValueChange && onValueChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
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
}

DatePickerComponent.displayName = "DatePicker";

export const DatePicker = DatePickerComponent;
