"use client";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";

export default function Search({
  placeholder,
  onChange,
  value,
  handleSearch,
  isClearable,
  classNames,
  className,
  ...props
}: {
  placeholder?: string;
  onChange?: (v: string) => void;
  value?: string;
  handleSearch?: any;
  isClearable?: boolean;
  classNames?: {
    icon?: string;
    input?: string;
    base?: string;
    wrapper?: string;
    button?: string;
  };
  className?: string;
  [key: string]: any;
}) {
  function resolveSearch(e: React.FormEvent) {
    e.preventDefault();
    if (handleSearch) return handleSearch();
  }

  const { icon, input, base, wrapper, button } = classNames || {};

  return (
    <form
      className={cn(
        "group relative flex h-fit w-full gap-2",
        className,
        wrapper,
      )}
      onSubmit={resolveSearch}
    >
      <Input
        startContent={
          <SearchIcon
            className={cn(
              "group-focus-within:text-primary  h-4 w-4 transition-all",
              icon,
            )}
          />
        }
        className={cn(" ", base, input)}
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(e: any) => onChange?.(e.target.value)}
        {...props}
      />
      {handleSearch && (
        <Button className={cn("px-8", button)} type="submit">
          Search
        </Button>
      )}
    </form>
  );
}
