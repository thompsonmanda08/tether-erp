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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  Search,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { type UserFilters } from "@/app/_actions/users";
const ADMIN_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

interface UserAdvancedFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onReset: () => void;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "created_at", label: "Created Date" },
  { value: "last_login", label: "Last Login" },
];

export function UserAdvancedFilters({
  filters,
  onFiltersChange,
  onReset,
}: UserAdvancedFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const updateFilter = (key: keyof UserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filters change
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.role) count++;
    if (filters.email_verified !== undefined) count++;
    if (filters.organization_id) count++;
    return count;
  };

  const clearAllFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onReset();
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Basic Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or organization..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={
            filters.status === "all" || !filters.status ? "default" : "outline"
          }
          size="sm"
          onClick={() => updateFilter("status", "all")}
        >
          All Users
        </Button>
        <Button
          variant={filters.status === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("status", "active")}
        >
          Active
        </Button>
        <Button
          variant={filters.status === "suspended" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("status", "suspended")}
        >
          Suspended
        </Button>
        <Button
          variant={filters.status === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("status", "pending")}
        >
          Pending
        </Button>
        <Button
          variant={filters.status === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("status", "inactive")}
        >
          Inactive
        </Button>
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Role Filter */}
            <SelectField
              label="Role"
              placeholder="All roles"
              options={[
                { value: "", label: "All roles" },
                ...ADMIN_ROLES,
              ]}
              value={filters.role || ""}
              onValueChange={(value) => updateFilter("role", value || undefined)}
            />

            {/* Email Verified Filter */}
            <SelectField
              label="Email Status"
              placeholder="All users"
              options={[
                { value: "", label: "All users" },
                { value: "true", label: "Email verified" },
                { value: "false", label: "Email not verified" },
              ]}
              value={filters.email_verified === undefined ? "" : filters.email_verified.toString()}
              onValueChange={(value) => updateFilter("email_verified", value === "" ? undefined : value === "true")}
            />

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort-filter">Sort by</Label>
              <div className="flex gap-2">
                <SelectField
                  options={SORT_OPTIONS}
                  value={filters.sort_by || "created_at"}
                  onValueChange={(value) => updateFilter("sort_by", value)}
                  classNames={{ wrapper: "flex-1" }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateFilter(
                      "sort_order",
                      filters.sort_order === "asc" ? "desc" : "asc",
                    )
                  }
                >
                  {filters.sort_order === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="space-y-2">
            <Label>Registration Date Range</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Results per page */}
          <SelectField
            label="Results per page"
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            value={filters.limit?.toString() || "20"}
            onValueChange={(value) => updateFilter("limit", parseInt(value))}
            classNames={{ wrapper: "w-32" }}
          />
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("search", "")}
              />
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("status", "all")}
              />
            </Badge>
          )}
          {filters.role && (
            <Badge variant="secondary" className="gap-1">
              Role: {filters.role}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("role", undefined)}
              />
            </Badge>
          )}
          {filters.email_verified !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Email: {filters.email_verified ? "Verified" : "Not verified"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("email_verified", undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
