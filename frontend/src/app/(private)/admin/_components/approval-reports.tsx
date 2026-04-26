"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApprovalMetrics } from "@/hooks/use-reports-queries";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle } from "lucide-react";

export function ApprovalReports() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch live approval metrics from database
  const { data: metrics, isLoading, error } = useApprovalMetrics();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading approval reports...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load approval reports. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No approval data available
      </div>
    );
  }

  const filteredActivity = (metrics?.recentApprovals || []).filter(
    (item) =>
      (item.documentNumber || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.approverName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const statusColors: Record<
    string,
    "default" | "destructive" | "secondary" | "outline"
  > = {
    approved: "default",
    rejected: "destructive",
  };

  const formatDocumentType = (type: string) => {
    const typeMap: Record<string, string> = {
      requisition: "Requisition",
      REQUISITION: "Requisition",
      purchase_order: "Purchase Order",
      PURCHASE_ORDER: "Purchase Order",
      payment_voucher: "Payment Voucher",
      PAYMENT_VOUCHER: "Payment Voucher",
      grn: "GRN",
      GRN: "GRN",
      budget: "Budget",
      BUDGET: "Budget",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Approval Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">
              {metrics?.totalApproved || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics?.approvalRate || 0).toFixed(1)}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {metrics?.totalRejected || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(100 - (metrics?.approvalRate || 0)).toFixed(1)}% rejection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              {metrics?.totalPending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting next approver
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Approvals & Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by document or approver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No approvals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium text-primary">
                        {activity.documentNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDocumentType(activity.documentType)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[activity.action]}>
                          {activity.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.approverName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
