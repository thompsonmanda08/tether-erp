"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useUserAnalytics,
  useOrganizationAnalytics,
  useUsageAnalytics,
} from "@/hooks/use-analytics";
import type { AnalyticsFilters } from "@/app/_actions/analytics";
import { UserAnalyticsChart } from "@/app/(admin)/analytics/components/user-analytics-chart";
import { OrganizationAnalyticsChart } from "@/app/(admin)/analytics/components/organization-analytics-chart";
import { UsageAnalyticsChart } from "@/app/(admin)/analytics/components/usage-analytics-chart";

type DateRange = "7d" | "30d" | "90d" | "1y";

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "1 year", value: "1y" },
];

export function AnalyticsTab() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const filters: AnalyticsFilters = { date_range: dateRange };

  const { data: userAnalytics, isLoading: userLoading } =
    useUserAnalytics(filters);
  const { data: orgAnalytics, isLoading: orgLoading } =
    useOrganizationAnalytics(filters);
  const { data: usageAnalytics, isLoading: usageLoading } =
    useUsageAnalytics(filters);

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="flex gap-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <UserAnalyticsChart
          analytics={userAnalytics ?? null}
          isLoading={userLoading}
        />
        <OrganizationAnalyticsChart
          analytics={orgAnalytics ?? null}
          isLoading={orgLoading}
        />
        <UsageAnalyticsChart
          analytics={usageAnalytics ?? null}
          isLoading={usageLoading}
        />
      </div>
    </div>
  );
}
