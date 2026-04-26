"use client";

import * as React from "react";
import { X, ChevronsUpDown } from "lucide-react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Option = Record<"value" | "label", string>;

interface MultiSelectFieldProps {
  options: Option[];
  value: string[];
  onValueChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  name?: string;
}

export function MultiSelectField({
  options,
  value,
  onValueChange,
  label,
  placeholder = "Select items...",
  className,
  required,
  isLoading = false,
  ...props
}: MultiSelectFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => value.includes(opt.value)),
    [options, value]
  );

  const availableOptions = React.useMemo(
    () => options.filter((opt) => !value.includes(opt.value)),
    [options, value]
  );

  const handleUnselect = (itemValue: string) => {
    onValueChange(value.filter((v) => v !== itemValue));
  };

  const handleSelect = (itemValue: string) => {
    setInputValue("");
    onValueChange([...value, itemValue]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (!input) return;

    if ((e.key === "Delete" || e.key === "Backspace") && input.value === "") {
      const newSelected = [...value];
      newSelected.pop();
      onValueChange(newSelected);
    }

    if (e.key === "Escape") {
      input.blur();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          className={cn("mb-0.5 pl-1 text-sm font-medium text-nowrap", {
            "text-red-500": props?.isInvalid,
            "opacity-50": props?.disabled
          })}
          htmlFor={props?.name}>
          {label} {required && <span className="font-bold text-red-500"> *</span>}
        </label>
      )}

      <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
        <div className="group border-input ring-offset-background focus-within:ring-ring rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-offset-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
              {selectedOptions.map((option) => (
                <Badge key={option.value} variant="default">
                  {option.label}
                  <button
                    type="button"
                    className="ring-offset-background focus:ring-ring ml-1 h-6 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                    onKeyDown={(e) => e.key === "Enter" && handleUnselect(option.value)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(option.value)}
                    aria-label={`Remove ${option.label}`}>
                    <X className="h-3 w-3 text-white/70 hover:text-red-500" />
                  </button>
                </Badge>
              ))}
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Spinner className="h-4 w-4" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={inputValue}
                  onValueChange={setInputValue}
                  onBlur={() => setOpen(false)}
                  onFocus={() => setOpen(true)}
                  placeholder={placeholder}
                  className="placeholder:text-muted-foreground flex-1 bg-transparent outline-none min-w-0"
                />
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </div>

        <div className="relative mt-2">
          {open && availableOptions.length > 0 && (
            <div className="animate-in bg-popover text-popover-foreground absolute top-0 z-10 w-full rounded-md border shadow-md outline-none">
              <CommandList>
                <CommandGroup className="h-full overflow-auto">
                  {availableOptions.map((option, index) => (
                    <CommandItem
                      key={`${option.value}-${index}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer">
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          )}
        </div>
      </Command>
    </div>
  );
}
