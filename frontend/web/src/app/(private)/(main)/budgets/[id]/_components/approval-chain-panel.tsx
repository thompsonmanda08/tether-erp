"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ClipboardList, Plus } from "lucide-react";
import { ApprovalRecord } from "@/types";
import Link from "next/link";

interface ApprovalChainPanelProps {
  approvalChain: ApprovalRecord[];
}

export function ApprovalChainPanel({ approvalChain }: ApprovalChainPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "bg-green-50";
      case "REJECTED":
        return "bg-red-50";
      case "PENDING":
        return "bg-yellow-50";
      default:
        return "bg-gray-50";
    }
  };

  if (!approvalChain || approvalChain.length === 0) {
    return (
      <Card className="bg-canvas/50 border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-8 py-8">
          <div className="relative mb-4">
            <div className="bg-primary/10 absolute inset-0 rounded-full blur-2xl" />
            <div className="bg-canvas border-primary/20 relative rounded-2xl border-2 p-6">
              <ClipboardList
                className="text-primary h-16 w-16"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <h3 className="text-foreground mb-2 text-2xl font-semibold">
            No Approval Chain
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md text-center">
            No approval records yet. Submit the budget to initiate the approval
            process.
          </p>

          <div className="mb-8 grid w-full max-w-2xl grid-cols-3 gap-4 text-xs">
            <div className="bg-canvas border-border rounded-lg border p-4 text-center">
              <div className="text-primary mb-1 font-mono">
                CONFIGURE WORKFLOW
              </div>
              <div className="text-muted-foreground">
                Define budget approval chain
              </div>
            </div>
            <div className="bg-canvas border-border rounded-lg border p-4 text-center">
              <div className="text-primary mb-1 font-mono">CREATE BUDGET</div>
              <div className="text-muted-foreground">create a Budget</div>
            </div>
            <div className="bg-canvas border-border rounded-lg border p-4 text-center">
              <div className="text-primary mb-1 font-mono">
                SUBMIT FOR APPROVAL
              </div>
              <div className="text-muted-foreground">
                Send Budget for approval
              </div>
            </div>
          </div>

          <Button size="lg" className="gap-2" asChild>
            <Link href="/admin/workflows/create">
              <Plus className="h-4 w-4" />
              Create Budget Workflow
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Chain</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvalChain.map((record, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${getStatusColor(record.status)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getStatusIcon(record.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Stage {index + 1}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status?.toUpperCase() === "APPROVED"
                          ? "bg-green-200 text-green-800"
                          : record.status?.toUpperCase() === "REJECTED"
                            ? "bg-red-200 text-red-800"
                            : "bg-yellow-200 text-yellow-800"
                      }`}
                    >
                      {record.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approved by:{" "}
                    <span className="font-medium">{record.approverName}</span>
                  </p>
                  {record.approverId && (
                    <p className="text-sm text-muted-foreground">
                      Approver ID:{" "}
                      <span className="font-medium">{record.approverId}</span>
                    </p>
                  )}
                  {record.approvedAt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Action taken on:{" "}
                      <span className="font-medium">
                        {(() => {
                          const date =
                            record.approvedAt instanceof Date
                              ? record.approvedAt
                              : new Date(record.approvedAt);
                          return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                        })()}
                      </span>
                    </p>
                  )}
                  {record.comments && (
                    <div className="mt-2 p-2 bg-white rounded text-sm italic">
                      <p className="font-medium text-xs text-gray-600 mb-1">
                        Comments:
                      </p>
                      "{record.comments}"
                    </div>
                  )}
                  {record.signature && (
                    <div className="mt-2 p-2 bg-white rounded">
                      <p className="font-medium text-xs text-gray-600 mb-1">
                        Digital Signature:
                      </p>
                      <img
                        src={record.signature}
                        alt="Digital signature"
                        className="h-12 border border-gray-300 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
