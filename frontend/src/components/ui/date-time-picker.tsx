"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface DateTimePickerProps {
  value?: Date;
  onValueChange?: (date?: Date) => void;
  className?: string;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onError?: boolean;
  errorText?: string;
  descriptionText?: string;
  placeholder?: string;
  classNames?: {
    wrapper?: string;
    input?: string;
    label?: string;
    errorText?: string;
    descriptionText?: string;
  };
}

export function DateTimePicker({
  value,
  onValueChange,
  className,
  label,
  name,
  required,
  disabled,
  isDisabled,
  isInvalid,
  onError,
  errorText,
  descriptionText,
  placeholder,
  classNames,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (selectedDate?: Date) => {
    if (!selectedDate || !onValueChange) {
      onValueChange?.(undefined);
      return;
    }

    const currentVal = value || new Date();
    const newDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      currentVal.getHours(),
      currentVal.getMinutes(),
      currentVal.getSeconds()
    );

    onValueChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    if (!timeValue || !onValueChange) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    const currentVal = value || new Date();
    const newDate = new Date(
      currentVal.getFullYear(),
      currentVal.getMonth(),
      currentVal.getDate(),
      hours,
      minutes,
      0 // seconds
    );

    onValueChange(newDate);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        classNames?.wrapper,
        {
          "cursor-not-allowed opacity-50": isDisabled || disabled,
        },
        className
      )}
    >
      {label && (
        <label
          className={cn(
            "mb-1 text-sm font-medium text-slate-700 dark:text-slate-300",
            {
              "text-red-500": onError || isInvalid,
              "opacity-50": isDisabled || disabled,
            },
            classNames?.label
          )}
          htmlFor={name}
        >
          {label}{" "}
          {required && (
            <span className="font-bold text-red-500"> *</span>
          )}
        </label>
      )}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                // Base styles matching input.tsx
                "w-full px-4 py-2 text-base bg-foreground/5 border border-border rounded-lg transition-all duration-200 outline-none",
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
                "justify-start text-left font-normal",
                !value && "text-slate-400 dark:text-slate-500",
                classNames?.input
              )}
              disabled={isDisabled || disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : <span>{placeholder || "Pick a date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
                handleDateSelect(date);
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          step="1"
          value={value ? format(value, "HH:mm") : ""}
          onChange={handleTimeChange}
          className="w-auto"
          disabled={isDisabled || disabled}
          isInvalid={isInvalid}
        />
      </div>
      {((errorText && (isInvalid || onError)) || descriptionText) && (
        <motion.span
          className={cn(
            "ml-1 text-xs text-slate-500 dark:text-slate-400",
            {
              "text-red-600 dark:text-red-400": onError || isInvalid,
            },
            classNames?.descriptionText,
            classNames?.errorText
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
