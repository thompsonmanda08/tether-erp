"use client";

import { Link as LinkIcon, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkflowDocument } from "@/types/workflow";
import { RequisitionChain } from "@/types/requisition";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

interface DocumentLinksProps {
  currentDocument: WorkflowDocument;
  /** Legacy prop — kept for GRN detail page compatibility */
  linkedDocuments?: {
    requisition?: { id: string; documentNumber: string };
    purchaseOrder?: { id: string; documentNumber: string };
    grn?: { id: string; documentNumber: string };
    paymentVoucher?: { id: string; documentNumber: string };
  };
  /** New prop — pass RequisitionChain from useRequisitionChain hook */
  chain?: RequisitionChain;
  /** Set false for requester role — they see status but cannot navigate to PO/GRN/PV pages */
  showViewLinks?: boolean;
}

interface ChainStep {
  label: string;
  docNumber?: string;
  href?: string;
  status?: string;
  exists: boolean;
  placeholder: string;
}

function StepRow({ step }: { step: ChainStep }) {
  if (!step.exists) {
    return (
      <div className="flex items-center justify-between bg-muted/40 p-3 rounded border border-dashed opacity-60">
        <div>
          <p className="text-sm text-muted-foreground">{step.label}</p>
          <p className="text-sm text-muted-foreground italic">{step.placeholder}</p>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-background p-3 rounded border">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{step.label}</p>
          <p className="font-medium">{step.docNumber}</p>
        </div>
        {step.status && (
          <StatusBadge status={step.status} type="document" />
        )}
      </div>
      {step.href && (
        <Link href={step.href}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      )}
    </div>
  );
}

/**
 * Display linked documents in a workflow chain.
 * Accepts either a `chain` (from useRequisitionChain) or legacy `linkedDocuments` prop.
 * Shows placeholder steps for documents not yet created.
 */
export function DocumentLinks({
  currentDocument,
  linkedDocuments,
  chain,
  showViewLinks = true,
}: DocumentLinksProps) {
  // --- Chain-based rendering (preferred) ---
  if (chain) {
    const isProcurement =
      !chain.routingType || chain.routingType === "procurement";

    const steps: ChainStep[] = isProcurement
      ? [
          {
            label: "Purchase Order",
            docNumber: chain.poDocumentNumber,
            href: showViewLinks && chain.poId ? `/purchase-orders` : undefined,
            status: chain.poStatus,
            exists: !!chain.poId,
            placeholder: "Not yet created",
          },
          {
            label: "Goods Received Note",
            docNumber: chain.grnDocumentNumber,
            href: showViewLinks && chain.grnId ? `/grn/${chain.grnId}` : undefined,
            status: chain.grnStatus,
            exists: !!chain.grnId,
            placeholder: "Pending goods receipt",
          },
          {
            label: "Payment Voucher",
            docNumber: chain.pvDocumentNumber,
            href: showViewLinks && chain.pvId ? `/payment-vouchers` : undefined,
            status: chain.pvStatus,
            exists: !!chain.pvId,
            placeholder: "Awaiting PO approval",
          },
        ]
      : [
          {
            label: "Purchase Order (Auto-approved)",
            docNumber: chain.poDocumentNumber,
            href: showViewLinks && chain.poId ? `/purchase-orders` : undefined,
            status: chain.poStatus,
            exists: !!chain.poId,
            placeholder: "Auto-generating on approval",
          },
          {
            label: "Goods Received Note",
            docNumber: chain.grnDocumentNumber,
            href: showViewLinks && chain.grnId ? `/grn/${chain.grnId}` : undefined,
            status: chain.grnStatus,
            exists: !!chain.grnId,
            placeholder: "Pending goods receipt",
          },
          {
            label: "Payment Voucher",
            docNumber: chain.pvDocumentNumber,
            href: showViewLinks && chain.pvId ? `/payment-vouchers` : undefined,
            status: chain.pvStatus,
            exists: !!chain.pvId,
            placeholder: "Awaiting GRN approval",
          },
        ];

    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <LinkIcon className="h-5 w-5" />
            Procurement Chain
          </CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-200">
            Track your requisition through Purchase Order → GRN → Payment Voucher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step) => (
              <StepRow key={step.label} step={step} />
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded text-sm text-blue-900 dark:text-blue-100 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {isProcurement
                ? "Procurement path: Requisition → Purchase Order → Goods Receipt → Payment"
                : "Accounting path: Requisition → Purchase Order (auto) → Goods Receipt → Payment"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Legacy linkedDocuments fallback ---
  if (!linkedDocuments) return null;

  const { requisition, purchaseOrder, grn, paymentVoucher } = linkedDocuments;
  if (!requisition && !purchaseOrder && !grn && !paymentVoucher) return null;

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <LinkIcon className="h-5 w-5" />
          Workflow Chain
        </CardTitle>
        <CardDescription className="text-blue-800 dark:text-blue-200">
          Related documents in this requisition-to-payment process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {requisition && (
            <div className="flex items-center justify-between bg-background p-3 rounded border">
              <div>
                <p className="text-sm text-muted-foreground">Requisition</p>
                <p className="font-medium">{requisition.documentNumber}</p>
              </div>
              <Link href={`/requisitions/${requisition.id}`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          )}
          {purchaseOrder && (
            <div className="flex items-center justify-between bg-background p-3 rounded border">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Order</p>
                <p className="font-medium">{purchaseOrder.documentNumber}</p>
              </div>
              <Link href={`/purchase-orders`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          )}
          {grn && (
            <div className="flex items-center justify-between bg-background p-3 rounded border">
              <div>
                <p className="text-sm text-muted-foreground">Goods Received Note</p>
                <p className="font-medium">{grn.documentNumber}</p>
              </div>
              <Link href={`/grn/${grn.id}`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          )}
          {paymentVoucher && (
            <div className="flex items-center justify-between bg-background p-3 rounded border">
              <div>
                <p className="text-sm text-muted-foreground">Payment Voucher</p>
                <p className="font-medium">{paymentVoucher.documentNumber}</p>
              </div>
              <Link href={`/payment-vouchers`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium mb-2">Workflow Process:</p>
          <p>Requisition → Purchase Order → Goods Receipt → Payment Voucher</p>
        </div>
      </CardContent>
    </Card>
  );
}
