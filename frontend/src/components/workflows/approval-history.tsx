"use client";

import { useMemo, useState } from "react";
import { useApprovalHistory } from "@/hooks/use-approval-workflow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Repeat2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ApprovalHistoryProps {
  documentId?: string;
  entityId?: string;      // Legacy compatibility
  entityType?: string;    // Legacy compatibility
}

export function ApprovalHistory({
  documentId,
  entityId,
  entityType,
}: ApprovalHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const actualDocumentId = documentId || entityId || '';
  const { data: historyData, isLoading } = useApprovalHistory(actualDocumentId);

  const sortedHistory = useMemo(() => {
    if (!historyData) return [];
    return [...historyData].sort(
      (a: any, b: any) =>
        new Date(b.approvedAt || 0).getTime() -
        new Date(a.approvedAt || 0).getTime()
    );
  }, [historyData]);

  const getActionIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActionBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 pb-4 border-b last:border-b-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!sortedHistory || sortedHistory.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
          <h3 className="font-semibold mb-1">No Actions Yet</h3>
          <p className="text-sm text-muted-foreground text-center">
            This document hasn't been approved or rejected yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval History</CardTitle>
        <CardDescription>
          Timeline of all approvals and actions for this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedHistory.map((entry: any) => {
            const entryId = entry.id || `${entry.approverId}-${entry.approvedAt}`;
            const isExpanded = expandedId === entryId;
            const actionDate = new Date(entry.approvedAt || 0);
            const dateStr = actionDate.toLocaleDateString();
            const timeStr = actionDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={entryId}
                className="border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entryId)
                  }
                  className="w-full p-4 text-left flex items-center justify-between gap-4"
                >
                  {/* Timeline Marker */}
                  <div className="flex-shrink-0">
                    {getActionIcon(entry.status || "pending")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">
                        {entry.approverName || entry.approverId || "System"}
                      </h3>
                      {getActionBadge(entry.status || "pending")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dateStr} at {timeStr}
                    </p>
                  </div>

                  {/* Expand Icon */}
                  {(entry.comments ||
                    entry.remarks) && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t space-y-3">
                    {/* Comments */}
                    {entry.comments && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Comments
                        </h4>
                        <p className="text-sm bg-muted rounded p-2">
                          {entry.comments}
                        </p>
                      </div>
                    )}

                    {/* Remarks */}
                    {entry.remarks && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Remarks
                        </h4>
                        <p className="text-sm bg-muted rounded p-2">
                          {entry.remarks}
                        </p>
                      </div>
                    )}

                    {/* Rejection Alert */}
                    {entry.status === "REJECTED" && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          Task was rejected
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Signature Note */}
                    {entry.signature && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Digital Signature
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          ✓ Digitally signed on {dateStr}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <h4 className="font-semibold text-muted-foreground mb-1">
              Total Actions
            </h4>
            <p className="text-lg font-bold">{sortedHistory.length}</p>
          </div>
          <div>
            <h4 className="font-semibold text-muted-foreground mb-1">
              Approvals
            </h4>
            <p className="text-lg font-bold text-green-600">
              {sortedHistory.filter((h: any) => h.status?.toUpperCase() === "APPROVED").length}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-muted-foreground mb-1">
              Rejections
            </h4>
            <p className="text-lg font-bold text-red-600">
              {sortedHistory.filter((h: any) => h.status?.toUpperCase() === "REJECTED").length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
