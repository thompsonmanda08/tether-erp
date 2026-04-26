"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAnalyticsDashboard } from "@/hooks/use-reports-queries";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Target,
} from "lucide-react";

export function AnalyticsDashboard() {
  // Fetch live analytics from database
  const { data: analytics, isLoading, error } = useAnalyticsDashboard();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading analytics dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load analytics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Total Pending */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.totalPending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting approval
            </p>
            <div className="mt-3 h-2 bg-yellow-200 rounded-full"></div>
          </CardContent>
        </Card>

        {/* Total Approved */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics?.totalApproved || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">This period</p>
            <div className="mt-3 h-2 bg-green-200 rounded-full"></div>
          </CardContent>
        </Card>

        {/* Total Rejected */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {analytics?.totalRejected || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Returned to requester
            </p>
            <div className="mt-3 h-2 bg-red-200 rounded-full"></div>
          </CardContent>
        </Card>

        {/* Avg Approval Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Approval Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {(analytics?.avgApprovalTime || 0).toFixed(1)} days
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average turnaround
            </p>
            <div className="mt-3 h-2 bg-blue-200 rounded-full"></div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(analytics?.slaCompliance || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              On-time delivery
            </p>
            <div
              className="mt-3 h-2 bg-green-200 rounded-full"
              style={{ width: `${analytics?.slaCompliance || 0}%` }}
            ></div>
          </CardContent>
        </Card>
      </div>

      {/* Trends and Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Approval Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Approval Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(analytics?.approvalTrends || []).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No trend data available
              </div>
            ) : (
              (analytics?.approvalTrends || []).map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.date}</span>
                    <span className="font-medium">
                      ✓ {item.approved} | ✗ {item.rejected} | ⏳ {item.pending}
                    </span>
                  </div>
                  <div className="flex gap-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(item.approved / 40) * 100}%` }}
                    ></div>
                    <div
                      className="bg-red-500"
                      style={{ width: `${(item.rejected / 40) * 100}%` }}
                    ></div>
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(item.pending / 40) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Document Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Approvals by Document Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(analytics?.documentDistribution || []).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No distribution data available
              </div>
            ) : (
              (analytics?.documentDistribution || []).map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-purple-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Performance and Bottleneck */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stage Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Stage Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(analytics?.stageMetrics || []).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No stage metrics available
              </div>
            ) : (
              (analytics?.stageMetrics || []).map((metric, index) => (
                <div
                  key={index}
                  className="space-y-2 pb-4 border-b last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{metric.stageName}</p>
                      <p className="text-sm text-muted-foreground">
                        {metric.documentCount} items processed
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        metric.slaCompliance >= 90
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                          : metric.slaCompliance >= 80
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                      }
                    >
                      {metric.slaCompliance.toFixed(1)}% SLA
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Avg Processing Time
                      </span>
                      <span className="font-medium">
                        {metric.avgProcessingTime.toFixed(1)} days
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={
                          metric.slaCompliance >= 90
                            ? "h-full bg-green-500"
                            : metric.slaCompliance >= 80
                              ? "h-full bg-yellow-500"
                              : "h-full bg-red-500"
                        }
                        style={{ width: `${metric.slaCompliance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Bottleneck Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Bottleneck */}
            {analytics?.bottleneck ? (
              <>
                <div className="p-4 border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 dark:text-orange-100">
                        Current Bottleneck
                      </p>
                      <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                        {analytics.bottleneck.stageName}
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                        ⏱️ Average{" "}
                        {(analytics.bottleneck.avgDays || 0).toFixed(1)} days at
                        this stage
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        📊 {analytics.bottleneck.documentCount || 0} documents
                        processed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <p className="font-medium text-sm">Recommendations:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>
                        Consider adding additional capacity at this stage
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>
                        Review approval criteria for faster processing
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>Implement parallel approvals where applicable</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No bottlenecks detected</p>
                <p className="text-xs mt-1">All stages are performing well</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">✅ Strengths</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • High overall SLA compliance (
                  {(analytics?.slaCompliance || 0).toFixed(1)}%)
                </li>
                <li>• {analytics?.totalApproved || 0} documents approved</li>
                <li>• Consistent approval processing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">⚠️ Areas to Improve</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {analytics?.bottleneck && (
                  <li>• {analytics.bottleneck.stageName} stage bottleneck</li>
                )}
                {(analytics?.totalRejected || 0) > 0 && (
                  <li>
                    • {analytics?.totalRejected || 0} rejections need review
                  </li>
                )}
                {(analytics?.avgApprovalTime || 0) > 3 && (
                  <li>• Average approval time above target</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">📊 Key Actions</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Monitor pending queue ({analytics?.totalPending || 0} items)
                </li>
                <li>• Review rejected items trends</li>
                <li>• Optimize approval workflow</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
