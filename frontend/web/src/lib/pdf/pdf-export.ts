import React from "react";
import { pdf } from "@react-pdf/renderer";
import RequisitionPDF from "@/components/pdf/requisition-pdf";
import PurchaseOrderPDF from "@/components/pdf/purchase-order-pdf";
import PaymentVoucherPDF from "@/components/pdf/payment-voucher-pdf";
import { GoodsReceivedNotePDF } from "@/components/pdf/grn-pdf";
import { Requisition } from "@/types/requisition";
import { PurchaseOrder } from "@/types/purchase-order";
import { PaymentVoucher } from "@/types/payment-voucher";
import { GoodsReceivedNote } from "@/types/goods-received-note";
import { getDocumentQRCodeUrl } from "./qr-utils";
import type { DocumentHeader } from "@/components/pdf/requisition-pdf";

export type { DocumentHeader };

/**
 * Export a Requisition as PDF
 */
export async function exportRequisitionPDF(
  requisition: Requisition,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const fileName = `${requisition.documentNumber}.pdf`;
  const qrCodeUrl = getDocumentQRCodeUrl(
    requisition.documentNumber,
    200,
    requisition.organizationId,
  );
  const doc = React.createElement(RequisitionPDF, {
    requisition,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  const blob = await pdf(doc as any).toBlob();
  downloadBlob(blob, fileName);
  return blob;
}

/**
 * Export a Purchase Order as PDF
 */
export async function exportPurchaseOrderPDF(
  purchaseOrder: PurchaseOrder,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const fileName = `${purchaseOrder.documentNumber}.pdf`;
  const qrCodeUrl = getDocumentQRCodeUrl(
    purchaseOrder.documentNumber,
    200,
    purchaseOrder.organizationId,
  );
  const doc = React.createElement(PurchaseOrderPDF, {
    purchaseOrder,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  const blob = await pdf(doc as any).toBlob();
  downloadBlob(blob, fileName);
  return blob;
}

/**
 * Export a Payment Voucher as PDF
 */
export async function exportPaymentVoucherPDF(
  paymentVoucher: PaymentVoucher,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const fileName = `${paymentVoucher.documentNumber}.pdf`;
  const qrCodeUrl = getDocumentQRCodeUrl(
    paymentVoucher.documentNumber,
    200,
    paymentVoucher.organizationId,
  );
  const doc = React.createElement(PaymentVoucherPDF, {
    paymentVoucher,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  const blob = await pdf(doc as any).toBlob();
  downloadBlob(blob, fileName);
  return blob;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get Requisition PDF as blob without downloading
 */
export async function getRequisitionPDFBlob(
  requisition: Requisition,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const qrCodeUrl = getDocumentQRCodeUrl(
    requisition.documentNumber,
    200,
    requisition.organizationId,
  );
  const doc = React.createElement(RequisitionPDF, {
    requisition,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  return pdf(doc as any).toBlob();
}

/**
 * Get Purchase Order PDF as blob without downloading
 */
export async function getPurchaseOrderPDFBlob(
  purchaseOrder: PurchaseOrder,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const qrCodeUrl = getDocumentQRCodeUrl(
    purchaseOrder.documentNumber,
    200,
    purchaseOrder.organizationId,
  );
  const doc = React.createElement(PurchaseOrderPDF, {
    purchaseOrder,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  return pdf(doc as any).toBlob();
}

/**
 * Get Payment Voucher PDF as blob without downloading
 */
export async function getPaymentVoucherPDFBlob(
  paymentVoucher: PaymentVoucher,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const qrCodeUrl = getDocumentQRCodeUrl(
    paymentVoucher.documentNumber,
    200,
    paymentVoucher.organizationId,
  );
  const doc = React.createElement(PaymentVoucherPDF, {
    paymentVoucher,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  return pdf(doc as any).toBlob();
}

/**
 * Export a GRN as PDF
 */
export async function exportGrnPDF(
  grn: GoodsReceivedNote,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const fileName = `${grn.documentNumber}.pdf`;
  const qrCodeUrl = getDocumentQRCodeUrl(
    grn.documentNumber,
    200,
    grn.organizationId,
  );
  const doc = React.createElement(GoodsReceivedNotePDF, {
    grn,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  const blob = await pdf(doc as any).toBlob();
  downloadBlob(blob, fileName);
  return blob;
}

/**
 * Get GRN PDF as blob without downloading
 */
export async function getGrnPDFBlob(
  grn: GoodsReceivedNote,
  documentHeader?: DocumentHeader,
): Promise<Blob> {
  const qrCodeUrl = getDocumentQRCodeUrl(
    grn.documentNumber,
    200,
    grn.organizationId,
  );
  const doc = React.createElement(GoodsReceivedNotePDF, {
    grn,
    qrCodeUrl,
    organizationLogoUrl: documentHeader?.logoUrl,
    documentHeader,
  });
  return pdf(doc as any).toBlob();
}

