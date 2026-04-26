"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  AlertCircle,
  QrCode,
  Loader2,
  ExternalLink,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/base/page-header";
import {
  verifyDocument,
  type VerificationResult,
} from "@/app/_actions/verification";

interface QRVerificationClientProps {
  userId: string;
  userRole: string;
}

function getDocumentRoute(
  documentType: string,
  documentId: string,
): string | null {
  if (!documentId) return null;
  switch (documentType) {
    case "REQUISITION":
      return `/requisitions/${documentId}`;
    case "PURCHASE_ORDER":
      return `/purchase-orders/${documentId}`;
    case "PAYMENT_VOUCHER":
      return `/payment-vouchers/${documentId}`;
    case "GRN":
      return `/grn/${documentId}`;
    case "BUDGET":
      return `/budgets/${documentId}`;
    default:
      return null;
  }
}

function statusColor(status: string) {
  const s = status?.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "bg-secondary/10 border-secondary/30";
  if (s === "REJECTED" || s === "CANCELLED")
    return "bg-destructive/10 border-destructive/30";
  return "bg-muted/10 border-muted/30";
}

export function QRVerificationClient({
  userId,
  userRole,
}: QRVerificationClientProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleVerify = () => {
    const docNumber = input.trim();
    if (!docNumber) return;

    startTransition(async () => {
      const res = await verifyDocument(docNumber);
      setResult(res);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Verification"
        subtitle="Verify document authenticity by entering a document number"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Verify Document
          </CardTitle>
          <CardDescription>
            Verify all Tether-ERP generated documents. This tool allows you to
            confirm the authenticity and details of a document by simply
            entering its document number.
          </CardDescription>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm">
              <span className="font-medium">How it works:</span> Enter the
              document number exactly as it appears on the document (e.g.{" "}
              <span className="font-mono text-xs">REQ-2025-001</span>). The
              system queries the source record directly for fresh, authoritative
              data.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Number</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. REQ-2025-001 or PO-2025-042"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                disabled={isPending}
              />
              <Button
                onClick={handleVerify}
                disabled={isPending || !input.trim()}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>

          {result && (
            <div
              className={`border rounded-lg p-6 ${
                result.verified && result.document
                  ? statusColor(result.document.status)
                  : "bg-muted/10 border-muted/30"
              }`}
            >
              {result.verified && result.document ? (
                <div className="space-y-4">
                  <div className="flex items-center bg-green-400/10 dark:bg-green-300/5 px-4 py-1 rounded-lg gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-green-500 dark:text-green-600 text-lg">
                        Document Verified
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        This document exists and is authentic
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Document Number
                      </p>
                      <p className="font-semibold">
                        {result.document.documentNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">
                        {result.document.documentType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="font-semibold">{result.document.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="outline" className="capitalize">
                        {result.document.status}
                      </Badge>
                    </div>
                    {result.document.organization && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Organization
                        </p>
                        <p className="font-semibold">
                          {result.document.organization}
                        </p>
                      </div>
                    )}
                    {result.document.department && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Department
                        </p>
                        <p className="font-semibold">
                          {result.document.department}
                        </p>
                      </div>
                    )}
                    {result.document.totalAmount !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold">
                          {result.document.currency ?? ""}{" "}
                          {result.document.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Verified At
                      </p>
                      <p className="font-semibold text-sm">
                        {new Date(result.verifiedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row w-full gap-2">
                    {getDocumentRoute(
                      result.document.documentType,
                      result.document.documentId,
                    ) && (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() =>
                          router.push(
                            getDocumentRoute(
                              result.document!.documentType,
                              result.document!.documentId,
                            )!,
                          )
                        }
                      >
                        <FileText className="h-4 w-4" />
                        View Document Details
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() =>
                        router.push(
                          `/verify/${encodeURIComponent(result.document!.documentNumber)}`,
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Full Verification Page
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg">Not Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
