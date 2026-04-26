"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X, RotateCcw, Download, Search } from "lucide-react";
import { type RoleFilters } from "@/app/_actions/roles";

interface RoleFiltersComponentProps {
  filters: RoleFilters;
  onFiltersChange: (filters: RoleFilters) => void;
  onReset: () => void;
  onExport: (format: "csv" | "json" | "excel") => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
}

const CATEGORIES = [
  { value: "user_management", label: "User Management" },
  { value: "organization_management", label: "Organization Management" },
  { value: "system_management", label: "System Management" },
  { value: "content_management", label: "Content Management" },
  { value: "financial_management", label: "Financial Management" },
  { value: "reporting", label: "Reporting" },
];

export function RoleFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  onExport,
  searchTerm,
  onSearchChange,
}: RoleFiltersComponentProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof RoleFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.is_active !== undefined) count++;
    if (filters.is_system_role !== undefined) count++;
    if (filters.category) count++;
    if (filters.has_users !== undefined) count++;
    return count;
  };

  const clearAllFilters = () => {
    onSearchChange("");
    onReset();
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Search and Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
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
                  onClick={() => onExport("json")}
                >
                  Export as JSON
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport("excel")}
                >
                  Export as Excel
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
            {/* Status Filter */}
            <SelectField
              label="Status"
              placeholder="All statuses"
              options={[
                { value: "", label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={filters.is_active === undefined ? "" : filters.is_active.toString()}
              onValueChange={(value) => updateFilter("is_active", value === "" ? undefined : value === "true")}
            />

            {/* Role Type Filter */}
            <SelectField
              label="Role Type"
              placeholder="All types"
              options={[
                { value: "", label: "All types" },
                { value: "false", label: "Custom Roles" },
                { value: "true", label: "System Roles" },
              ]}
              value={filters.is_system_role === undefined ? "" : filters.is_system_role.toString()}
              onValueChange={(value) => updateFilter("is_system_role", value === "" ? undefined : value === "true")}
            />

            {/* Category Filter */}
            <SelectField
              label="Category"
              placeholder="All categories"
              options={[
                { value: "", label: "All categories" },
                ...CATEGORIES,
              ]}
              value={filters.category || ""}
              onValueChange={(value) => updateFilter("category", value || undefined)}
            />

            {/* Users Filter */}
            <SelectField
              label="User Assignment"
              placeholder="All roles"
              options={[
                { value: "", label: "All roles" },
                { value: "true", label: "With assigned users" },
                { value: "false", label: "Without users" },
              ]}
              value={filters.has_users === undefined ? "" : filters.has_users.toString()}
              onValueChange={(value) => updateFilter("has_users", value === "" ? undefined : value === "true")}
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.is_active !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.is_active ? "Active" : "Inactive"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("is_active", undefined)}
              />
            </Badge>
          )}
          {filters.is_system_role !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.is_system_role ? "System" : "Custom"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("is_system_role", undefined)}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category:{" "}
              {CATEGORIES.find((c) => c.value === filters.category)?.label ||
                filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("category", undefined)}
              />
            </Badge>
          )}
          {filters.has_users !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Users: {filters.has_users ? "With users" : "Without users"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("has_users", undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
