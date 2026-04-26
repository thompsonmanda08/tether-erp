"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  X,
  Calendar as CalendarIcon,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { SettingsFilters } from "@/app/_actions/settings";

interface SettingsFiltersProps {
  filters: SettingsFilters;
  onFiltersChange: (filters: SettingsFilters) => void;
  onExport: () => void;
  onImport: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function SettingsFilters({
  filters,
  onFiltersChange,
  onExport,
  onImport,
  onRefresh,
  isLoading = false,
}: SettingsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const categories = [
    { value: "general", label: "General" },
    { value: "security", label: "Security" },
    { value: "performance", label: "Performance" },
    { value: "integration", label: "Integration" },
    { value: "notification", label: "Notification" },
    { value: "ui", label: "User Interface" },
  ];

  const environments = [
    { value: "all", label: "All Environments" },
    { value: "production", label: "Production" },
    { value: "staging", label: "Staging" },
    { value: "development", label: "Development" },
  ];

  const types = [
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" },
    { value: "array", label: "Array" },
  ];

  const handleFilterChange = (key: keyof SettingsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onFiltersChange({
      ...filters,
      modifiedAfter: range?.from?.toISOString(),
      modifiedBefore: range?.to?.toISOString(),
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setDateRange(undefined);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(
      (value) => value !== undefined && value !== "" && value !== null,
    ).length;
  };

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search settings by key or description..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <SelectField
          placeholder="All Categories"
          options={[
            { value: "", label: "All Categories" },
            ...categories,
          ]}
          value={filters.category || ""}
          onValueChange={(value) => handleFilterChange("category", value)}
          classNames={{ wrapper: "w-[180px]" }}
        />

        {/* Environment Filter */}
        <SelectField
          placeholder="Environment"
          options={[
            { value: "", label: "All Environments" },
            ...environments,
          ]}
          value={filters.environment || ""}
          onValueChange={(value) => handleFilterChange("environment", value)}
          classNames={{ wrapper: "w-[160px]" }}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "relative",
              getActiveFiltersCount() > 0 && "border-primary",
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
            />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type Filter */}
            <SelectField
              label="Setting Type"
              options={[
                { value: "", label: "All Types" },
                ...types,
              ]}
              value={filters.type || ""}
              onValueChange={(value) => handleFilterChange("type", value)}
            />

            {/* Secret Filter */}
            <SelectField
              label="Secret Settings"
              options={[
                { value: "", label: "All Settings" },
                { value: "true", label: "Secret Only" },
                { value: "false", label: "Non-Secret Only" },
              ]}
              value={filters.isSecret?.toString() || ""}
              onValueChange={(value) => handleFilterChange("isSecret", value === "" ? undefined : value === "true")}
            />

            {/* Required Filter */}
            <SelectField
              label="Required Settings"
              options={[
                { value: "", label: "All Settings" },
                { value: "true", label: "Required Only" },
                { value: "false", label: "Optional Only" },
              ]}
              value={filters.isRequired?.toString() || ""}
              onValueChange={(value) => handleFilterChange("isRequired", value === "" ? undefined : value === "true")}
            />

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label>Modified Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("search", "")}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category:{" "}
              {categories.find((c) => c.value === filters.category)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("category", "")}
              />
            </Badge>
          )}
          {filters.environment && (
            <Badge variant="secondary" className="gap-1">
              Environment:{" "}
              {environments.find((e) => e.value === filters.environment)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("environment", "")}
              />
            </Badge>
          )}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              Type: {types.find((t) => t.value === filters.type)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("type", "")}
              />
            </Badge>
          )}
          {filters.isSecret !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.isSecret ? "Secret Only" : "Non-Secret Only"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("isSecret", undefined)}
              />
            </Badge>
          )}
          {filters.isRequired !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.isRequired ? "Required Only" : "Optional Only"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("isRequired", undefined)}
              />
            </Badge>
          )}
          {(filters.modifiedAfter || filters.modifiedBefore) && (
            <Badge variant="secondary" className="gap-1">
              Date Range
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  handleFilterChange("modifiedAfter", undefined);
                  handleFilterChange("modifiedBefore", undefined);
                  setDateRange(undefined);
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
