"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useActiveDepartments } from "@/hooks/use-department-queries";

export interface RequisitionFilters {
  status?: string;
  department?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

interface RequisitionsFiltersProps {
  filters: RequisitionFilters;
  onFiltersChange: (filters: RequisitionFilters) => void;
}

export function RequisitionsFilters({
  filters,
  onFiltersChange,
}: RequisitionsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<RequisitionFilters>(filters);

  // Fetch departments from the hook
  const { data: departments = [], isLoading: isDepartmentsLoading } =
    useActiveDepartments();

  const handleFilterChange = (key: keyof RequisitionFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: RequisitionFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters =
    localFilters.status ||
    localFilters.department ||
    localFilters.priority ||
    localFilters.startDate ||
    localFilters.endDate ||
    localFilters.searchTerm;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}

          <Input
            id="search"
            label="Search"
            startContent={<Search className="w-4 h-4 text-foreground/50" />}
            placeholder="Document number, title..."
            value={localFilters.searchTerm || ""}
            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
            className="col-span-2"
            classNames={{
              wrapper: "col-span-2",
            }}
          />
          {/* Status Filter */}
          <SelectField
            label="Status"
            value={localFilters.status || "all"}
            onValueChange={(value) =>
              handleFilterChange("status", value === "all" ? undefined : value)
            }
            placeholder="All Statuses"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
              { value: "COMPLETED", label: "Completed" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
            classNames={{
              wrapper: "space-y-2",
              label: "text-xs",
              input: "h-9",
            }}
          />

          {/* Department Filter */}
          <SelectField
            label="Department"
            value={localFilters.department || "all"}
            onValueChange={(value) =>
              handleFilterChange(
                "department",
                value === "all" ? undefined : value,
              )
            }
            placeholder={
              isDepartmentsLoading ? "Loading..." : "All Departments"
            }
            isLoading={isDepartmentsLoading}
            isDisabled={isDepartmentsLoading}
            options={[
              { value: "all", label: "All Departments" },
              ...departments.map((dept) => ({
                value: dept.name,
                label: dept.name,
              })),
            ]}
            classNames={{
              wrapper: "space-y-2",
              label: "text-xs",
              input: "h-9",
            }}
          />

          {/* Priority Filter */}
          <SelectField
            label="Priority"
            value={localFilters.priority || "all"}
            onValueChange={(value) =>
              handleFilterChange(
                "priority",
                value === "all" ? undefined : value,
              )
            }
            placeholder="All Priorities"
            options={[
              { value: "all", label: "All Priorities" },
              { value: "urgent", label: "Urgent" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            classNames={{
              wrapper: "space-y-2",
              label: "text-xs",
              input: "h-9",
            }}
          />

          {/* Start Date */}
          <DatePicker
            label="Start Date"
            value={localFilters.startDate}
            onValueChange={(date) => handleFilterChange("startDate", date)}
            placeholder="Pick a date"
            classNames={{
              wrapper: "space-y-2",
              label: "text-xs",
              input: "h-9",
            }}
          />

          {/* End Date */}
          <DatePicker
            label="End Date"
            value={localFilters.endDate}
            onValueChange={(date) => handleFilterChange("endDate", date)}
            placeholder="Pick a date"
            minDate={localFilters.startDate}
            classNames={{
              wrapper: "space-y-2",
              label: "text-xs",
              input: "h-9",
            }}
          />
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {localFilters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Status: {localFilters.status}
              </span>
            )}
            {localFilters.department && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                Dept: {localFilters.department}
              </span>
            )}
            {localFilters.priority && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                Priority: {localFilters.priority}
              </span>
            )}
            {localFilters.startDate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                From: {format(localFilters.startDate, "PP")}
              </span>
            )}
            {localFilters.endDate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                To: {format(localFilters.endDate, "PP")}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
