"use client";

import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import { type PieSectorDataItem } from "recharts/types/polar/Pie";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardMetrics } from "@/types";

interface WorkflowStatusChartProps {
  metrics: DashboardMetrics;
  variant?: "default" | "embedded";
}

const chartConfig = {
  documents: {
    label: "Documents",
  },
  draft: {
    label: "Draft",
    color: "var(--chart-1)", // GRAY
  },
  submitted: {
    label: "Submitted",
    color: "var(--chart-2)", // BLUE
  },
  inApproval: {
    label: "In Approval",
    color: "var(--chart-3)", // AMBER
  },
  approved: {
    label: "Approved",
    color: "var(--chart-4)", // GREEN
  },
  rejected: {
    label: "Rejected",
    color: "var(--chart-5)", // RED
  },
} satisfies ChartConfig;

export function WorkflowStatusChart({
  metrics,
  variant = "default",
}: WorkflowStatusChartProps) {
  const isEmbedded = variant === "embedded";
  const id = "workflow-status-chart";

  // Transform metrics data into chart format
  const workflowData = React.useMemo(
    () =>
      [
        {
          status: "draft",
          documents: metrics.draftDocuments || 0,
          fill: "var(--color-draft)",
        },
        {
          status: "submitted",
          documents: metrics.submittedDocuments || 0,
          fill: "var(--color-submitted)",
        },
        {
          status: "inApproval",
          documents: metrics.pendingApproval || 0,
          fill: "var(--color-inApproval)",
        },
        {
          status: "approved",
          documents: metrics.approvedDocuments || 0,
          fill: "var(--color-approved)",
        },
        {
          status: "rejected",
          documents: metrics.rejectedDocuments || 0,
          fill: "var(--color-rejected)",
        },
      ].filter((item) => item.documents > 0),
    [metrics],
  );

  const [activeStatus, setActiveStatus] = React.useState(
    workflowData.length > 0 ? workflowData[0].status : "draft",
  );

  const statuses = React.useMemo(
    () => workflowData.map((item) => item.status),
    [workflowData],
  );

  if (workflowData.length === 0) {
    return (
      <Card
        data-chart={id}
        className={`flex flex-col ${isEmbedded ? "bg-white/10 border-white/20" : ""}`}
      >
        <CardHeader>
          <CardTitle
            className={`text-base font-bold ${isEmbedded ? "text-primary-foreground" : ""}`}
          >
            Workflow Status
          </CardTitle>
          <CardDescription
            className={isEmbedded ? "text-primary-foreground/70" : ""}
          >
            No documents found
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p
            className={
              isEmbedded
                ? "text-primary-foreground/70"
                : "text-muted-foreground"
            }
          >
            No workflow data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-chart={id}
      className={`flex flex-col ${isEmbedded ? "bg-white/10 border-white/20 shadow-none" : ""}`}
    >
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-">
          <CardTitle
            className={`text-base font-bold ${isEmbedded ? "text-primary-foreground" : ""}`}
          >
            Workflow Tasks
          </CardTitle>
          <CardDescription
            className={`text-xs font-normal ${isEmbedded ? "text-primary-foreground/70" : ""}`}
          >
            Document distribution by status
          </CardDescription>
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus}>
          <SelectTrigger
            className={`ml-auto h-7 w-[130px] rounded-lg pl-2.5 ${isEmbedded ? "bg-white/10 border-white/30 text-primary-foreground" : ""}`}
            aria-label="Select a status"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {statuses.map((key) => {
              const config = chartConfig[key as keyof typeof chartConfig];
              if (!config) {
                return null;
              }
              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-xs"
                      style={{
                        backgroundColor: `var(--color-${key})`,
                      }}
                    />
                    {config?.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-55"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={workflowData}
              dataKey="documents"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const activeData = workflowData.find(
                      (item) => item.status === activeStatus,
                    );
                    const displayValue = activeData?.documents || 0;
                    const displayLabel =
                      chartConfig[activeStatus as keyof typeof chartConfig]
                        ?.label || "Documents";

                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className={`text-3xl font-bold ${isEmbedded ? "fill-primary-foreground" : "fill-foreground"}`}
                        >
                          {displayValue.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className={
                            isEmbedded
                              ? "fill-primary-foreground/70"
                              : "fill-muted-foreground"
                          }
                        >
                          {displayLabel}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        {/* <div className="mt-4 mb-2 grid grid-cols-2 gap-2 text-sm">
          {workflowData.map((item) => {
            const config = chartConfig[item.status as keyof typeof chartConfig];
            return (
              <div
                key={item.status}
                className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
                  activeStatus === item.status
                    ? isEmbedded
                      ? "bg-white/15 border border-white/30"
                      : "bg-muted/50 border border-border"
                    : isEmbedded
                      ? "hover:bg-white/10"
                      : "hover:bg-muted/30"
                }`}
                onClick={() => setActiveStatus(item.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveStatus(item.status);
                  }
                }}
              >
                <span
                  className="flex h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: `var(--color-${item.status})`,
                  }}
                />
                <span
                  className={`flex-1 font-medium ${isEmbedded ? "text-primary-foreground" : ""}`}
                >
                  {config?.label}
                </span>
                <span
                  className={`font-bold ${isEmbedded ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {item.documents}
                </span>
              </div>
            );
          })}
        </div> */}
      </CardContent>
    </Card>
  );
}
