"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Calendar as CalendarIcon,
  X,
  RotateCcw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { type AnalyticsFilters } from "@/app/_actions/analytics";

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onReset: () => void;
  onExport: (format: "csv" | "pdf" | "excel") => void;
}

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

const USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "user", label: "User" },
  { value: "viewer", label: "Viewer" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
];

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  onReset,
  onExport,
}: AnalyticsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const updateFilter = (key: keyof AnalyticsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleDateRangeChange = (range: string) => {
    updateFilter("date_range", range as any);
    if (range !== "custom") {
      updateFilter("start_date", undefined);
      updateFilter("end_date", undefined);
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      updateFilter("start_date", format(startDate, "yyyy-MM-dd"));
      updateFilter("end_date", format(endDate, "yyyy-MM-dd"));
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.organization_id) count++;
    if (filters.user_role) count++;
    if (filters.status) count++;
    if (
      filters.date_range === "custom" &&
      filters.start_date &&
      filters.end_date
    )
      count++;
    return count;
  };

  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onReset();
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4 flex-1">
          <SelectField
            label="Date Range"
            options={DATE_RANGES}
            value={filters.date_range}
            onValueChange={handleDateRangeChange}
            classNames={{ wrapper: "w-40" }}
          />

          {filters.date_range === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && endDate) handleCustomDateChange();
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      if (startDate && date) handleCustomDateChange();
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport("csv")}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport("excel")}
                >
                  Export as Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport("pdf")}
                >
                  Export as PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Advanced Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* User Role Filter */}
            <SelectField
              label="User Role"
              placeholder="All roles"
              options={[
                { value: "", label: "All roles" },
                ...USER_ROLES,
              ]}
              value={filters.user_role || ""}
              onValueChange={(value) => updateFilter("user_role", value || undefined)}
            />

            {/* Status Filter */}
            <SelectField
              label="Status"
              placeholder="All statuses"
              options={[
                { value: "", label: "All statuses" },
                ...STATUSES,
              ]}
              value={filters.status || ""}
              onValueChange={(value) => updateFilter("status", value || undefined)}
            />

            {/* Organization Filter - This would be populated from API */}
            <SelectField
              label="Organization"
              placeholder="All organizations"
              options={[{ value: "", label: "All organizations" }]}
              value={filters.organization_id || ""}
              onValueChange={(value) => updateFilter("organization_id", value || undefined)}
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.user_role && (
            <Badge variant="secondary" className="gap-1">
              Role: {filters.user_role}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("user_role", undefined)}
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("status", undefined)}
              />
            </Badge>
          )}
          {filters.date_range === "custom" &&
            filters.start_date &&
            filters.end_date && (
              <Badge variant="secondary" className="gap-1">
                Custom: {filters.start_date} to {filters.end_date}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    updateFilter("date_range", "30d");
                    updateFilter("start_date", undefined);
                    updateFilter("end_date", undefined);
                  }}
                />
              </Badge>
            )}
        </div>
      )}
    </div>
  );
}
