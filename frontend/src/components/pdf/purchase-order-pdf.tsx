import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PurchaseOrder } from "@/types/purchase-order";
import { pdfStyles } from "@/lib/pdf/pdf-styles";
import { generateDocumentQRData } from "@/lib/pdf/qr-utils";
import { PDFHeader, PDFFooter, DocumentHeader } from "./requisition-pdf";
import { capitalize } from "@/lib/utils";
import { ApprovalSignaturesSection } from "./approval-signatures-section";

interface PurchaseOrderPDFProps {
  purchaseOrder: PurchaseOrder;
  qrCodeUrl?: string;
  organizationLogoUrl?: string;
  documentHeader?: DocumentHeader;
}

const BLUE = "#1e40af";
const BLUE_LIGHT = "#dbeafe";
const GRAY_LABEL = "#6b7280";
const GRAY_BORDER = "#e5e7eb";
const GREEN_TOTAL = "#166534";

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return pdfStyles.statusDraft;
    case "SUBMITTED":
      return pdfStyles.statusSubmitted;
    case "IN_REVIEW":
      return pdfStyles.statusInReview;
    case "PENDING":
      return pdfStyles.statusInReview;
    case "APPROVED":
      return pdfStyles.statusApproved;
    case "REJECTED":
      return pdfStyles.statusRejected;
    default:
      return pdfStyles.statusDraft;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    case "HIGH":
      return { backgroundColor: "#fed7aa", color: "#92400e" };
    case "MEDIUM":
      return { backgroundColor: "#dbeafe", color: "#1e40af" };
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" };
  }
};

// ── Reusable label+value pair ─────────────────────────────────────────────────
function LabelValue({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 7,
          fontWeight: "bold",
          color: GRAY_LABEL,
          textTransform: "uppercase",
          marginBottom: 1,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 8.5, color: "#1f2937" }}>{value || "—"}</Text>
    </View>
  );
}

// ── Bordered section box ──────────────────────────────────────────────────────
function SectionBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: BLUE, marginBottom: 8 }}>
      <View
        style={{
          backgroundColor: BLUE_LIGHT,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}
      >
        <Text style={{ fontSize: 8, fontWeight: "bold", color: BLUE }}>
          {title}
        </Text>
      </View>
      <View style={{ padding: 7 }}>{children}</View>
    </View>
  );
}

const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({
  purchaseOrder,
  qrCodeUrl,
  documentHeader,
}) => {
  const documentNumber = purchaseOrder.documentNumber;
  const qrData = generateDocumentQRData(
    "PURCHASE_ORDER",
    documentNumber,
    purchaseOrder.id,
    new Date(purchaseOrder.createdAt),
  );

  // Pull vendor details — vendor object (from DB preload) or flat fields
  const vendor = purchaseOrder.vendor;
  const vendorName = vendor?.name || purchaseOrder.vendorName || "—";
  // Build address from vendor object fields
  const vendorAddressParts = [
    vendor?.physicalAddress,
    vendor?.city,
    vendor?.country,
  ].filter(Boolean);
  const vendorAddress =
    vendorAddressParts.length > 0 ? vendorAddressParts.join(", ") : null;
  const vendorContact = vendor?.phone || null;
  const vendorEmail = vendor?.email || null;
  const vendorTpin = vendor?.taxId || null;

  // Shipping / receiver — from metadata only (set via Shipping & Tax tab)
  const meta = purchaseOrder.metadata || {};
  const receiverName =
    (meta.receiverName as string) || documentHeader?.orgName || "—";
  const receiverAddress = (meta.receiverAddress as string) || null;
  const receiverContact = (meta.receiverContact as string) || null;
  const receiverEmail = (meta.receiverEmail as string) || null;
  const receiverDept =
    (meta.receiverDept as string) || purchaseOrder.department || null;

  // Financial breakdown
  const subtotal = purchaseOrder.subtotal ?? purchaseOrder.totalAmount ?? 0;
  const taxRate = (meta.taxRate as number) ?? null;
  const taxAmount = taxRate
    ? (subtotal * taxRate) / 100
    : (purchaseOrder.tax ?? 0);
  const deliveryCost = (meta.deliveryCost as number) ?? 0;
  const totalValue = purchaseOrder.totalAmount ?? 0;

  // Metadata table fields
  const sourceReq = purchaseOrder.linkedRequisition || "—";
  const purchaseType = (meta.purchaseType as string) || "SERVICE OR GOODS";
  const fundSource =
    purchaseOrder.costCenter ||
    purchaseOrder.budgetCode ||
    (meta.fundSource as string) ||
    "—";
  const reqDept = purchaseOrder.department || "—";

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* ── Header ── */}
        <PDFHeader
          title="PURCHASE ORDER"
          logoUrl={documentHeader?.logoUrl}
          orgName={documentHeader?.orgName}
          tagline={documentHeader?.tagline}
        />

        {/* ── Doc number + Status/Priority ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: GRAY_BORDER,
          }}
        >
          <View>
            <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 2 }}>
              Document No: {documentNumber}
            </Text>
            <Text style={{ fontSize: 8, color: GRAY_LABEL }}>
              Date: {new Date(purchaseOrder.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 3,
                color: GRAY_LABEL,
              }}
            >
              STATUS &amp; PRIORITY
            </Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <View
                style={[
                  pdfStyles.statusBadge,
                  getStatusColor(purchaseOrder.status),
                ]}
              >
                <Text style={{ fontSize: 9 }}>
                  {capitalize(purchaseOrder.status || "DRAFT")}
                </Text>
              </View>
              {purchaseOrder.priority && (
                <View
                  style={[
                    pdfStyles.statusBadge,
                    getPriorityColor(purchaseOrder.priority),
                  ]}
                >
                  <Text style={{ fontSize: 9 }}>
                    {capitalize(purchaseOrder.priority)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Vendor Details + Shipping To (side by side) ── */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          {/* Vendor Details */}
          <View style={{ flex: 1, borderWidth: 1, borderColor: BLUE }}>
            <View
              style={{
                backgroundColor: BLUE_LIGHT,
                paddingHorizontal: 6,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: "bold", color: BLUE }}>
                VENDOR DETAILS
              </Text>
            </View>
            <View style={{ padding: 7 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  color: GRAY_LABEL,
                  marginBottom: 1,
                }}
              >
                VENDOR/SUPPLIER
              </Text>
              <Text
                style={{ fontSize: 9, fontWeight: "bold", marginBottom: 5 }}
              >
                {vendorName}
              </Text>
              {vendorAddress && (
                <LabelValue label="ADDRESS" value={vendorAddress} />
              )}
              {vendorContact && (
                <LabelValue label="CONTACT" value={vendorContact} />
              )}
              {vendorEmail && <LabelValue label="EMAIL" value={vendorEmail} />}
              {vendorTpin && <LabelValue label="TPIN" value={vendorTpin} />}
            </View>
          </View>

          {/* Shipping To */}
          <View style={{ flex: 1, borderWidth: 1, borderColor: BLUE }}>
            <View
              style={{
                backgroundColor: BLUE_LIGHT,
                paddingHorizontal: 6,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: "bold", color: BLUE }}>
                SHIPPING TO
              </Text>
            </View>
            <View style={{ padding: 7 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  color: GRAY_LABEL,
                  marginBottom: 1,
                }}
              >
                RECEIVER NAME
              </Text>
              <Text
                style={{ fontSize: 9, fontWeight: "bold", marginBottom: 5 }}
              >
                {receiverName}
              </Text>
              {receiverAddress && (
                <LabelValue label="ADDRESS" value={receiverAddress} />
              )}
              {receiverContact && (
                <LabelValue label="CONTACT" value={receiverContact} />
              )}
              {receiverEmail && (
                <LabelValue label="EMAIL" value={receiverEmail} />
              )}
              {receiverDept && (
                <LabelValue label="DEPARTMENT" value={receiverDept} />
              )}
            </View>
          </View>
        </View>

        {/* ── Metadata table: Source REQ / Purchase Type / Dept / Fund Source ── */}
        <View style={{ borderWidth: 1, borderColor: BLUE, marginBottom: 10 }}>
          {/* Header row */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: BLUE_LIGHT,
              borderBottomWidth: 1,
              borderBottomColor: BLUE,
            }}
          >
            {[
              "SOURCE REQUISITION",
              "PURCHASE TYPE",
              "REQUESTING DEPARTMENT",
              "FUND SOURCE",
            ].map((h, i) => (
              <Text
                key={h}
                style={{
                  flex: 1,
                  fontSize: 7,
                  fontWeight: "bold",
                  color: BLUE,
                  paddingHorizontal: 5,
                  paddingVertical: 3,
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: BLUE,
                }}
              >
                {h}
              </Text>
            ))}
          </View>
          {/* Data row */}
          <View style={{ flexDirection: "row" }}>
            {[sourceReq, purchaseType, reqDept, fundSource].map((v, i) => (
              <Text
                key={i}
                style={{
                  flex: 1,
                  fontSize: 8,
                  color: "#1f2937",
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: GRAY_BORDER,
                }}
              >
                {v}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Order Items ── */}
        {purchaseOrder.items && purchaseOrder.items.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>
              ORDER ITEMS:
            </Text>

            {/* Table */}
            <View style={{ borderWidth: 1, borderColor: BLUE }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#f3f4f6",
                  borderBottomWidth: 1,
                  borderBottomColor: BLUE,
                }}
              >
                {[
                  { label: "Item", flex: 0.4, align: "center" as const },
                  { label: "Description", flex: 2.5, align: "left" as const },
                  { label: "Qty", flex: 0.7, align: "center" as const },
                  { label: "Unit Price", flex: 1.2, align: "right" as const },
                  { label: "Total", flex: 1.2, align: "right" as const },
                ].map((col, i) => (
                  <Text
                    key={col.label}
                    style={{
                      flex: col.flex,
                      paddingVertical: 3,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      fontWeight: "bold",
                      color: BLUE,
                      textAlign: col.align,
                      borderLeftWidth: i > 0 ? 1 : 0,
                      borderLeftColor: BLUE,
                    }}
                  >
                    {col.label}
                  </Text>
                ))}
              </View>

              {/* Rows */}
              {purchaseOrder.items.map((item: any, index: number) => {
                const desc = item.description || item.itemDescription || "—";
                const unitPrice = item.unitPrice ?? item.estimatedCost ?? 0;
                const total =
                  (item.totalPrice ??
                    item.amount ??
                    item.quantity * unitPrice) ||
                  0;
                return (
                  <View
                    key={item.id || index}
                    style={{
                      flexDirection: "row",
                      borderBottomWidth: 1,
                      borderBottomColor: GRAY_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        flex: 0.4,
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        fontSize: 7.5,
                        textAlign: "center",
                        color: "#1f2937",
                      }}
                    >
                      {index + 1}
                    </Text>
                    <Text
                      style={{
                        flex: 2.5,
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        fontSize: 7.5,
                        color: "#1f2937",
                        borderLeftWidth: 1,
                        borderLeftColor: GRAY_BORDER,
                      }}
                    >
                      {desc}
                    </Text>
                    <Text
                      style={{
                        flex: 0.7,
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        fontSize: 7.5,
                        textAlign: "center",
                        color: "#1f2937",
                        borderLeftWidth: 1,
                        borderLeftColor: GRAY_BORDER,
                      }}
                    >
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""}
                    </Text>
                    <Text
                      style={{
                        flex: 1.2,
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        fontSize: 7.5,
                        textAlign: "right",
                        color: "#1f2937",
                        borderLeftWidth: 1,
                        borderLeftColor: GRAY_BORDER,
                      }}
                    >
                      {purchaseOrder.currency} {unitPrice.toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        flex: 1.2,
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        fontSize: 7.5,
                        textAlign: "right",
                        color: "#1f2937",
                        borderLeftWidth: 1,
                        borderLeftColor: GRAY_BORDER,
                      }}
                    >
                      {purchaseOrder.currency} {total.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ── Totals breakdown ── */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <View style={{ width: "42%" }}>
                {/* Sub Total */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 3,
                    borderBottomWidth: 1,
                    borderBottomColor: GRAY_BORDER,
                  }}
                >
                  <Text style={{ fontSize: 8, color: "#1f2937" }}>
                    ORDER SUB TOTAL:
                  </Text>
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "bold",
                      color: "#1f2937",
                    }}
                  >
                    {purchaseOrder.currency} {subtotal.toLocaleString()}
                  </Text>
                </View>
                {/* Tax — only when provided */}
                {taxAmount > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                      borderBottomWidth: 1,
                      borderBottomColor: GRAY_BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 8, color: "#1f2937" }}>
                      {taxRate ? `TOTAL TAX ${taxRate}% :` : "TOTAL TAX :"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      {purchaseOrder.currency} {taxAmount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {/* Delivery — only when provided */}
                {deliveryCost > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 3,
                      borderBottomWidth: 1,
                      borderBottomColor: GRAY_BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 8, color: "#1f2937" }}>
                      DELIVERY COST:
                    </Text>
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      {purchaseOrder.currency} {deliveryCost.toLocaleString()}
                    </Text>
                  </View>
                )}
                {/* Total Order Value */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                    borderBottomWidth: 2,
                    borderBottomColor: BLUE,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: "#1f2937",
                    }}
                  >
                    TOTAL ORDER VALUE:
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      color: GREEN_TOTAL,
                    }}
                  >
                    {purchaseOrder.currency} {totalValue.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Approval Chain ── */}
        {purchaseOrder.approvalHistory &&
          purchaseOrder.approvalHistory.length > 0 && (
            <ApprovalSignaturesSection
              approvalHistory={purchaseOrder.approvalHistory}
              documentType="Purchase Order"
            />
          )}

        {/* ── Footer ── */}
        <PDFFooter
          documentNumber={documentNumber}
          document={purchaseOrder}
          qrCodeUrl={qrCodeUrl ?? ""}
        />
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDF;
