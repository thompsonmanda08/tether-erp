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
      className={cn("group relative flex h-fit w-full gap-2", className, wrapper)}
      onSubmit={resolveSearch}>
      <SearchIcon
        className={cn(
          "group-focus-within:text-primary absolute top-2.5 left-3 h-4 w-4 transition-all",
          icon
        )}
      />
      <Input
        className={cn(
          "border-divider focus-within:border-primary/70 placeholder:text-muted-foreground w-full pl-10 text-base placeholder:font-normal focus-within:shadow-sm",
          base,
          input
        )}
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
