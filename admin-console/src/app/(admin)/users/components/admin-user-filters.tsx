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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Search,
  Filter,
  X,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AdminUserFilters, AdminRole } from "@/app/_actions/admin-users";

interface AdminUserFiltersProps {
  filters: AdminUserFilters;
  onFiltersChange: (filters: AdminUserFilters) => void;
  onReset: () => void;
  onExport: (format: "csv" | "json" | "excel") => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  roles?: AdminRole[];
}

export function AdminUserFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  onExport,
  searchTerm,
  onSearchChange,
  roles = [],
}: AdminUserFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdAfter, setCreatedAfter] = useState<Date>();
  const [createdBefore, setCreatedBefore] = useState<Date>();

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof AdminUserFilters] !== undefined,
  ).length;

  const handleFilterChange = (key: keyof AdminUserFilters, value: any) => {
    const newFilters = { ...filters };
    if (value === undefined || value === "" || value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (
    type: "created_after" | "created_before",
    date: Date | undefined,
  ) => {
    if (type === "created_after") {
      setCreatedAfter(date);
      handleFilterChange("created_after", date?.toISOString());
    } else {
      setCreatedBefore(date);
      handleFilterChange("created_before", date?.toISOString());
    }
  };

  const clearAllFilters = () => {
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
    onReset();
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search admin users by name, email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport("csv")}>
                CSV File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("excel")}>
                Excel File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("json")}>
                JSON File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Advanced Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <SelectField
              label="Status"
              placeholder="All statuses"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              value={filters.is_active === undefined ? "all" : filters.is_active ? "active" : "inactive"}
              onValueChange={(value) => handleFilterChange("is_active", value === "all" ? undefined : value === "active" ? true : false)}
            />

            {/* Super Admin Filter */}
            <SelectField
              label="Admin Type"
              placeholder="All types"
              options={[
                { value: "all", label: "All Types" },
                { value: "super", label: "Super Admin" },
                { value: "regular", label: "Regular Admin" },
              ]}
              value={filters.is_super_admin === undefined ? "all" : filters.is_super_admin ? "super" : "regular"}
              onValueChange={(value) => handleFilterChange("is_super_admin", value === "all" ? undefined : value === "super" ? true : false)}
            />

            {/* Account Status Filter */}
            <SelectField
              label="Account Status"
              placeholder="All accounts"
              options={[
                { value: "all", label: "All Accounts" },
                { value: "unlocked", label: "Unlocked" },
                { value: "locked", label: "Locked" },
              ]}
              value={filters.is_locked === undefined ? "all" : filters.is_locked ? "locked" : "unlocked"}
              onValueChange={(value) => handleFilterChange("is_locked", value === "all" ? undefined : value === "locked" ? true : false)}
            />

            {/* Two-Factor Filter */}
            <SelectField
              label="Two-Factor Auth"
              placeholder="All users"
              options={[
                { value: "all", label: "All Users" },
                { value: "enabled", label: "2FA Enabled" },
                { value: "disabled", label: "2FA Disabled" },
              ]}
              value={filters.two_factor_enabled === undefined ? "all" : filters.two_factor_enabled ? "enabled" : "disabled"}
              onValueChange={(value) => handleFilterChange("two_factor_enabled", value === "all" ? undefined : value === "enabled" ? true : false)}
            />

            {/* Role Filter */}
            <SelectField
              label="Role"
              placeholder="All roles"
              options={[
                { value: "all", label: "All Roles" },
                ...roles.map((role) => ({ value: role.id, label: role.display_name })),
              ]}
              value={filters.role_id || "all"}
              onValueChange={(value) => handleFilterChange("role_id", value === "all" ? undefined : value)}
            />

            {/* Last Login Filter */}
            <SelectField
              label="Last Login"
              placeholder="Any time"
              options={[
                { value: "all", label: "Any Time" },
                { value: "1", label: "Last 24 hours" },
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "365", label: "Last year" },
              ]}
              value={filters.last_login_days?.toString() || "all"}
              onValueChange={(value) => handleFilterChange("last_login_days", value === "all" ? undefined : parseInt(value))}
            />

            {/* Created After Date */}
            <div className="space-y-2">
              <Label>Created After</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !createdAfter && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {createdAfter ? (
                      format(createdAfter, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createdAfter}
                    onSelect={(date) =>
                      handleDateRangeChange("created_after", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Created Before Date */}
            <div className="space-y-2">
              <Label>Created Before</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !createdBefore && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {createdBefore ? (
                      format(createdBefore, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createdBefore}
                    onSelect={(date) =>
                      handleDateRangeChange("created_before", date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>
              {filters.is_active !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Status: {filters.is_active ? "Active" : "Inactive"}
                  <button
                    onClick={() => handleFilterChange("is_active", undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.is_super_admin !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Type:{" "}
                  {filters.is_super_admin ? "Super Admin" : "Regular Admin"}
                  <button
                    onClick={() =>
                      handleFilterChange("is_super_admin", undefined)
                    }
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.is_locked !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Account: {filters.is_locked ? "Locked" : "Unlocked"}
                  <button
                    onClick={() => handleFilterChange("is_locked", undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.two_factor_enabled !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  2FA: {filters.two_factor_enabled ? "Enabled" : "Disabled"}
                  <button
                    onClick={() =>
                      handleFilterChange("two_factor_enabled", undefined)
                    }
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.role_id && (
                <Badge variant="secondary" className="text-xs">
                  Role:{" "}
                  {roles.find((r) => r.id === filters.role_id)?.display_name}
                  <button
                    onClick={() => handleFilterChange("role_id", undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.last_login_days && (
                <Badge variant="secondary" className="text-xs">
                  Login: Last {filters.last_login_days} days
                  <button
                    onClick={() =>
                      handleFilterChange("last_login_days", undefined)
                    }
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
