"use client";

import React, { useState } from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
  startOfYear,
  startOfWeek
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

const dateFilterPresets = [
  { name: "Today", value: "today" },
  { name: "Yesterday", value: "yesterday" },
  { name: "This Week", value: "thisWeek" },
  { name: "Last 7 Days", value: "last7Days" },
  { name: "Last 28 Days", value: "last28Days" },
  { name: "This Month", value: "thisMonth" },
  { name: "Last Month", value: "lastMonth" },
  { name: "This Year", value: "thisYear" }
];

interface CalendarDateRangePickerProps {
  className?: string;
  initialFrom?: Date;
  initialTo?: Date;
  onChange?: (from: string, to: string) => void;
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

export default function CalendarDateRangePicker({
  className,
  initialFrom,
  initialTo,
  onChange,
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
}: CalendarDateRangePickerProps) {
  const isMobile = useIsMobile();
  const today = new Date();
  const twentyEightDaysAgo = startOfDay(subDays(today, 27));

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialFrom ?? twentyEightDaysAgo,
    to: initialTo ?? endOfDay(today)
  });
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handleQuickSelect = (from: Date, to: Date) => {
    setDate({ from, to });
    setCurrentMonth(from);
  };

  const changeHandle = (type: string) => {
    const today = new Date();

    switch (type) {
      case "today":
        handleQuickSelect(startOfDay(today), endOfDay(today));
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        handleQuickSelect(startOfDay(yesterday), endOfDay(yesterday));
        break;
      case "thisWeek":
        const startOfCurrentWeek = startOfWeek(today);
        handleQuickSelect(startOfDay(startOfCurrentWeek), endOfDay(today));
        break;
      case "last7Days":
        const sevenDaysAgo = subDays(today, 6);
        handleQuickSelect(startOfDay(sevenDaysAgo), endOfDay(today));
        break;
      case "last28Days":
        const twentyEightDaysAgo = subDays(today, 27); // 27 days ago + today = 28 days
        handleQuickSelect(startOfDay(twentyEightDaysAgo), endOfDay(today));
        break;
      case "thisMonth":
        handleQuickSelect(startOfMonth(today), endOfDay(today));
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        handleQuickSelect(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case "thisYear":
        const startOfCurrentYear = startOfYear(today);
        handleQuickSelect(startOfDay(startOfCurrentYear), endOfDay(today));
        break;
    }
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        classNames?.wrapper,
        {
          "cursor-not-allowed opacity-50": isDisabled || disabled,
        }
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
      <div className={cn("grid gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {isMobile ? (
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="date"
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
                          !date && "text-slate-400 dark:text-slate-500",
                          classNames?.input
                        )}
                        disabled={isDisabled || disabled}
                      >
                        <CalendarIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "dd MMM yyyy")} - {format(date.to, "dd MMM yyyy")}
                          </>
                        ) : (
                          format(date.from, "dd MMM yyyy")
                        )
                      ) : (
                        <span>{placeholder || "Select date range"}</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <Button
                id="date"
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
                  !date && "text-slate-400 dark:text-slate-500",
                  classNames?.input
                )}
                disabled={isDisabled || disabled}
              >
                <CalendarIcon />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd MMM yyyy")} - {format(date.to, "dd MMM yyyy")}
                    </>
                  ) : (
                    format(date.from, "dd MMM yyyy")
                  )
                ) : (
                  <span>{placeholder || "Select date range"}</span>
                )}
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto" align="end">
            <div className="flex flex-col lg:flex-row">
              <div className="me-0 lg:me-4">
                <ToggleGroup
                  type="single"
                  defaultValue="last28Days"
                  className="hidden w-28 flex-col lg:block">
                  {dateFilterPresets.map((item, key) => (
                    <ToggleGroupItem
                      key={key}
                      className="text-muted-foreground w-full"
                      value={item.value}
                      onClick={() => changeHandle(item.value)}
                      asChild>
                      <Button variant="ghost" className="justify-start rounded-md">
                        {item.name}
                      </Button>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Select defaultValue="last28Days" onValueChange={(value) => changeHandle(value)}>
                  <SelectTrigger
                    className="mb-4 flex w-full lg:hidden"
                    size="sm"
                    aria-label="Select a value">
                    <SelectValue placeholder="Last 28 Days" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilterPresets.map((item, key) => (
                      <SelectItem key={key} value={item.value}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Calendar
                className="border-s-0 py-0! ps-0! pe-0! lg:border-s lg:ps-4!"
                mode="range"
                month={currentMonth}
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  if (newDate?.from) {
                    setCurrentMonth(newDate.from);
                  }
                  if (newDate?.from && newDate?.to) {
                    const formattedFrom = format(newDate.from, "yyyy-MM-dd");
                    const formattedTo = format(newDate.to, "yyyy-MM-dd");
                    onChange?.(formattedFrom, formattedTo);
                  }
                }}
                onMonthChange={setCurrentMonth}
              />
            </div>
          </PopoverContent>
        </Popover>
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
