import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PaymentVoucher } from "@/types/payment-voucher";
import { pdfStyles } from "@/lib/pdf/pdf-styles";
import { generateDocumentQRData } from "@/lib/pdf/qr-utils";
import { PDFHeader, PDFFooter, DocumentHeader } from "./requisition-pdf";
import { capitalize } from "@/lib/utils";
import { ApprovalSignaturesSection } from "./approval-signatures-section";

interface PaymentVoucherPDFProps {
  paymentVoucher: PaymentVoucher;
  qrCodeUrl?: string;
  organizationLogoUrl?: string;
  documentHeader?: DocumentHeader;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return pdfStyles.statusDraft;
    case "SUBMITTED":
      return pdfStyles.statusSubmitted;
    case "IN_REVIEW":
      return pdfStyles.statusInReview;
    case "APPROVED":
      return pdfStyles.statusApproved;
    case "REVISION":
      return pdfStyles.statusInReview;
    case "REJECTED":
      return pdfStyles.statusRejected;
    case "PAID":
      return {
        ...pdfStyles.statusApproved,
        backgroundColor: "#d1fae5",
        color: "#065f46",
      };
    default:
      return pdfStyles.statusDraft;
  }
};

const PaymentVoucherPDF: React.FC<PaymentVoucherPDFProps> = ({
  paymentVoucher,
  qrCodeUrl,
  documentHeader,
}) => {
  const documentNumber = paymentVoucher.documentNumber;

  // Pull vendor details from vendor object
  const vendor = paymentVoucher.vendor;
  const vendorAddress =
    vendor?.physicalAddress || vendor?.city
      ? [vendor?.physicalAddress, vendor?.city, vendor?.country]
          .filter(Boolean)
          .join(", ")
      : null;
  const vendorContact = vendor?.phone || null;
  const vendorEmail = vendor?.email || null;
  const vendorTpin = vendor?.taxId || null;

  const qrData = generateDocumentQRData(
    "PAYMENT_VOUCHER",
    documentNumber,
    paymentVoucher.id,
    new Date(paymentVoucher.createdAt),
  );

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header with Republic of Zambia and Logo */}
        <PDFHeader
          title="PAYMENT VOUCHER"
          logoUrl={documentHeader?.logoUrl}
          orgName={documentHeader?.orgName}
          tagline={documentHeader?.tagline}
        />

        {/* Main Header Section */}
        <View
          style={[
            pdfStyles.header,
            {
              marginBottom: 16,
              paddingBottom: 10,
              flexDirection: "row",
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={{ textAlign: "left" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 2 }}>
              Document No: {documentNumber}
            </Text>
            <Text style={{ fontSize: 8, color: "#666", marginBottom: 3 }}>
              Date: {new Date(paymentVoucher.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* STATUS BADGE */}
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", marginBottom: 1 }}>
              STATUS
            </Text>
            <View style={{ marginBottom: 0, flexDirection: "row", gap: 4 }}>
              <View
                style={[
                  pdfStyles.statusBadge,
                  getStatusColor(paymentVoucher.status),
                ]}
              >
                <Text style={{ fontSize: 9 }}>
                  {capitalize(paymentVoucher.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Instruction Box */}
        <View
          style={{
            marginBottom: 10,
            padding: 6,
            backgroundColor: "#fef3c7",
            borderWidth: 1,
            borderColor: "#fcd34d",
          }}
        >
          <Text style={{ fontSize: 7.5, fontWeight: "bold", marginBottom: 2 }}>
            PAYMENT INSTRUCTIONS:
          </Text>
          <Text style={{ fontSize: 7, lineHeight: 1.4 }}>
            • All invoices must be attached with this voucher • Payment should
            be processed within the specified terms • Keep original copy for
            audit trail • QR code below provides digital verification
          </Text>
        </View>

        {/* SECTION 1: PAYEE & PAYMENT INFORMATION */}
        <View
          style={{
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#1e40af",
            padding: 7,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "bold",
              backgroundColor: "#dbeafe",
              padding: 3,
              marginBottom: 6,
            }}
          >
            SECTION 1: PAYEE & PAYMENT INFORMATION
          </Text>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 12,
              marginBottom: 7,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                PAYEE NAME
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.vendorName || "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                PAYMENT METHOD
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.paymentMethod || "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                PAYMENT DUE DATE
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.paymentDueDate
                  ? new Date(paymentVoucher.paymentDueDate).toLocaleDateString()
                  : "—"}
              </Text>
            </View>
          </View>

          {/* Vendor contact details row */}
          {(vendorAddress || vendorContact || vendorEmail || vendorTpin) && (
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 12,
                marginBottom: 7,
              }}
            >
              {vendorAddress && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    ADDRESS
                  </Text>
                  <Text style={{ fontSize: 8 }}>{vendorAddress}</Text>
                </View>
              )}
              {vendorContact && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    CONTACT
                  </Text>
                  <Text style={{ fontSize: 8 }}>{vendorContact}</Text>
                  {vendorEmail && (
                    <Text style={{ fontSize: 8 }}>{vendorEmail}</Text>
                  )}
                </View>
              )}
              {vendorTpin && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    TPIN
                  </Text>
                  <Text style={{ fontSize: 8 }}>{vendorTpin}</Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <View style={{ marginBottom: 7 }}>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 1,
                color: "#666",
              }}
            >
              DESCRIPTION OF PAYMENT
            </Text>
            <Text style={{ fontSize: 9 }}>
              {paymentVoucher.description || "—"}
            </Text>
          </View>

          {/* Source and Amount Row */}
          <View style={{ display: "flex", flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                SOURCE PO
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.linkedPO || "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                VENDOR ID
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.vendorId || "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: "bold",
                  marginBottom: 1,
                  color: "#666",
                }}
              >
                REQUEST DATE
              </Text>
              <Text style={{ fontSize: 9 }}>
                {paymentVoucher.requestedDate
                  ? new Date(paymentVoucher.requestedDate).toLocaleDateString()
                  : "—"}
              </Text>
            </View>
          </View>

          {/* Bank Details (if applicable) */}
          {paymentVoucher.paymentMethod === "bank_transfer" &&
            paymentVoucher.bankDetails && (
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: "#ddd",
                }}
              >
                <Text
                  style={{
                    fontSize: 7.5,
                    fontWeight: "bold",
                    marginBottom: 3,
                    color: "#1e40af",
                  }}
                >
                  BANK TRANSFER DETAILS:
                </Text>
                <View
                  style={{ display: "flex", flexDirection: "row", gap: 12 }}
                >
                  {paymentVoucher.bankDetails.bankName && (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: "bold",
                          marginBottom: 1,
                          color: "#666",
                        }}
                      >
                        BANK NAME
                      </Text>
                      <Text style={{ fontSize: 9 }}>
                        {paymentVoucher.bankDetails.bankName}
                      </Text>
                    </View>
                  )}
                  {paymentVoucher.bankDetails.accountNumber && (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: "bold",
                          marginBottom: 1,
                          color: "#666",
                        }}
                      >
                        ACCOUNT NUMBER
                      </Text>
                      <Text style={{ fontSize: 9 }}>
                        {paymentVoucher.bankDetails.accountNumber}
                      </Text>
                    </View>
                  )}
                  {paymentVoucher.bankDetails.accountName && (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: "bold",
                          marginBottom: 1,
                          color: "#666",
                        }}
                      >
                        ACCOUNT HOLDER
                      </Text>
                      <Text style={{ fontSize: 9 }}>
                        {paymentVoucher.bankDetails.accountName}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
        </View>

        {/* Line Items Table (if applicable) */}
        {paymentVoucher.items && paymentVoucher.items.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>
              PAYMENT BREAKDOWN:
            </Text>

            {/* Table Header */}
            <View
              style={{
                borderWidth: 1,
                borderColor: "#1e40af",
                marginBottom: 0,
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  backgroundColor: "#f3f4f6",
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e40af",
                }}
              >
                <Text
                  style={{
                    flex: 0.5,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: "#1e40af",
                    textAlign: "center",
                  }}
                >
                  Item
                </Text>
                <Text
                  style={{
                    flex: 2,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: "#1e40af",
                    borderLeftWidth: 1,
                    borderLeftColor: "#1e40af",
                  }}
                >
                  Description
                </Text>
                <Text
                  style={{
                    flex: 1,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: "#1e40af",
                    textAlign: "center",
                    borderLeftWidth: 1,
                    borderLeftColor: "#1e40af",
                  }}
                >
                  Qty
                </Text>
                <Text
                  style={{
                    flex: 1,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: "#1e40af",
                    textAlign: "right",
                    borderLeftWidth: 1,
                    borderLeftColor: "#1e40af",
                  }}
                >
                  Unit Price
                </Text>
                <Text
                  style={{
                    flex: 1,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: "#1e40af",
                    textAlign: "right",
                    borderLeftWidth: 1,
                    borderLeftColor: "#1e40af",
                  }}
                >
                  Amount
                </Text>
              </View>

              {/* Table Rows */}
              {paymentVoucher.items.map((item: any, index: number) => (
                <View
                  key={item.id}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      flex: 0.5,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      color: "#1f2937",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </Text>
                  <Text
                    style={{
                      flex: 2,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      color: "#1f2937",
                      borderLeftWidth: 1,
                      borderLeftColor: "#e5e7eb",
                    }}
                  >
                    {item.description}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      color: "#1f2937",
                      textAlign: "center",
                      borderLeftWidth: 1,
                      borderLeftColor: "#e5e7eb",
                    }}
                  >
                    {item.quantity}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      color: "#1f2937",
                      textAlign: "right",
                      borderLeftWidth: 1,
                      borderLeftColor: "#e5e7eb",
                    }}
                  >
                    {paymentVoucher.currency}{" "}
                    {item.unitPrice?.toLocaleString() || "0"}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      fontSize: 7.5,
                      color: "#1f2937",
                      textAlign: "right",
                      borderLeftWidth: 1,
                      borderLeftColor: "#e5e7eb",
                    }}
                  >
                    {paymentVoucher.currency}{" "}
                    {item.amount?.toLocaleString() || "0"}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 6,
                paddingTop: 4,
              }}
            >
              <View style={{ width: "35%" }}>
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingBottom: 4,
                    borderBottomWidth: 2,
                    borderBottomColor: "#1e40af",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "bold",
                      color: "#1f2937",
                    }}
                  >
                    TOTAL AMOUNT:
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      color: "#166534",
                    }}
                  >
                    {paymentVoucher.currency}{" "}
                    {paymentVoucher.totalAmount?.toLocaleString() || "0"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Budget Allocation Section */}
        {(paymentVoucher.budgetCode || paymentVoucher.costCenter) && (
          <View
            style={{
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#1e40af",
              padding: 7,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "bold",
                backgroundColor: "#dbeafe",
                padding: 3,
                marginBottom: 6,
              }}
            >
              BUDGET ALLOCATION DETAILS
            </Text>

            <View style={{ display: "flex", flexDirection: "row", gap: 12 }}>
              {paymentVoucher.budgetCode && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    BUDGET CODE
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    {paymentVoucher.budgetCode}
                  </Text>
                </View>
              )}
              {paymentVoucher.costCenter && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    COST CENTER
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    {paymentVoucher.costCenter}
                  </Text>
                </View>
              )}
              {paymentVoucher.projectCode && (
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "bold",
                      marginBottom: 1,
                      color: "#666",
                    }}
                  >
                    PROJECT CODE
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    {paymentVoucher.projectCode}
                  </Text>
                </View>
              )}
            </View>

            {/* Tax Information (if applicable) */}
            {(paymentVoucher.taxAmount ||
              paymentVoucher.withholdingTaxAmount) && (
              <View
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: "#ddd",
                  display: "flex",
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                {paymentVoucher.taxAmount && (
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 7,
                        fontWeight: "bold",
                        marginBottom: 1,
                        color: "#666",
                      }}
                    >
                      TAX AMOUNT
                    </Text>
                    <Text style={{ fontSize: 9 }}>
                      {paymentVoucher.currency}{" "}
                      {paymentVoucher.taxAmount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {paymentVoucher.withholdingTaxAmount && (
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 7,
                        fontWeight: "bold",
                        marginBottom: 1,
                        color: "#666",
                      }}
                    >
                      WITHHOLDING TAX
                    </Text>
                    <Text style={{ fontSize: 9 }}>
                      {paymentVoucher.currency}{" "}
                      {paymentVoucher.withholdingTaxAmount.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Payment Confirmation (if PAID) */}
        {paymentVoucher.status?.toUpperCase() === "PAID" && (
          <View
            style={{
              marginBottom: 12,
              padding: 7,
              backgroundColor: "#dcfce7",
              borderLeftWidth: 4,
              borderLeftColor: "#16a34a",
            }}
          >
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: "bold",
                marginBottom: 3,
                color: "#166534",
              }}
            >
              PAYMENT CONFIRMATION
            </Text>
            {paymentVoucher.paidAmount && (
              <Text style={{ fontSize: 9, marginBottom: 2 }}>
                Amount Paid: {paymentVoucher.currency}{" "}
                {paymentVoucher.paidAmount.toLocaleString()}
              </Text>
            )}
            {paymentVoucher.paidDate && (
              <Text style={{ fontSize: 9 }}>
                Date Paid:{" "}
                {new Date(paymentVoucher.paidDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* APPROVAL CHAIN */}
        {paymentVoucher.approvalHistory &&
          paymentVoucher.approvalHistory.length > 0 && (
            <ApprovalSignaturesSection
              approvalHistory={paymentVoucher.approvalHistory}
              documentType="Payment Voucher"
            />
          )}

        {/* Footer: QR Code, Tracking, and Branding */}
        <PDFFooter
          documentNumber={documentNumber}
          document={paymentVoucher}
          qrCodeUrl={qrCodeUrl ?? ""}
        />
      </Page>
    </Document>
  );
};

export default PaymentVoucherPDF;
