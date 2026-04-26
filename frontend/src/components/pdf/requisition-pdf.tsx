import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { Requisition, RequisitionAttachment } from "@/types/requisition";
import { pdfStyles } from "@/lib/pdf/pdf-styles";
import { generateDocumentQRData } from "@/lib/pdf/qr-utils";
import { capitalize } from "@/lib/utils";
import { ApprovalSignaturesSection } from "./approval-signatures-section";

export interface DocumentHeader {
  logoUrl?: string;
  orgName?: string;
  tagline?: string;
}

interface RequisitionPDFProps {
  requisition: Requisition;
  qrCodeUrl?: string;
  organizationLogoUrl?: string;
  documentHeader?: DocumentHeader;
}

interface PDFHeaderProps {
  title?: string;
  logoUrl?: string;
  orgName?: string;
  tagline?: string;
}

interface PDFFooterProps {
  qrCodeUrl: string;
  documentNumber: string;
  document: Requisition | any;
}

export const PDFHeader = ({
  title = "PURCHASE REQUISITION",
  logoUrl,
  orgName,
  tagline,
}: PDFHeaderProps) => (
  <View
    style={{
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    }}
  >
    <View
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Logo */}
      <View style={{ width: 36, height: 36 }}>
        <Image
          src={"/images/coat-of-arms.png"}
          style={{ width: 36, height: 36, objectFit: "contain" }}
        />
      </View>
      {/* ORG NAME AND TAGLINE */}
      <View
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "bold", marginBottom: 2 }}>
          {"REPUBLIC OF ZAMBIA"}
        </Text>
        {orgName && (
          <Text style={{ fontSize: 13, fontWeight: "600", marginBottom: 2 }}>
            {orgName}
          </Text>
        )}
        {tagline && (
          <Text style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>
            {tagline}
          </Text>
        )}
      </View>
      {/* Logo */}
      <View style={{ width: 36, height: 36 }}>
        <Image
          src={logoUrl}
          style={{ width: 36, height: 36, objectFit: "cover" }}
        />
      </View>
    </View>
    <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8 }}>
      {title}
    </Text>
  </View>
);

export const PDFFooter = ({
  qrCodeUrl,
  documentNumber,
  document,
}: PDFFooterProps) => (
  <>
    <View
      style={{
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}
    >
      <View
        style={{
          display: "flex",
          flexBasis: "60%",
          flexDirection: "row",
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        {/* QR Code Section */}
        {qrCodeUrl && (
          <View style={{ width: 60, height: 60 }}>
            <Image source={qrCodeUrl} style={{ width: 60, height: 60 }} />
          </View>
        )}

        {/* Tracking Information */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 3 }}>
            DOCUMENT TRACKING
          </Text>
          <Text style={{ fontSize: 8, marginBottom: 2 }}>
            Tracking Code: {documentNumber}
          </Text>
          <Text style={{ fontSize: 8, marginBottom: 2 }}>
            Status: {capitalize(document.status)}
          </Text>
          <Text style={{ fontSize: 7, marginBottom: 2 }}>
            Document ID: {document.id}
          </Text>
          <Text style={{ fontSize: 7, marginBottom: 2 }}>
            Created: {new Date(document.createdAt).toLocaleDateString()}{" "}
            {new Date(document.createdAt).toLocaleTimeString()}
          </Text>
          <Text style={{ fontSize: 7 }}>
            Generated: {new Date().toLocaleDateString()}{" "}
            {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {/* Tether-ERP Logo */}
      <View
        style={{
          display: "flex",
          flexBasis: "40%",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        {" "}
        <View style={{ marginBottom: 0, marginTop: "auto", paddingTop: 10 }}>
          <Image
            src={"/images/logo/logo-full-light.png"}
            style={{ width: 80, height: 24 }}
          />
        </View>
        <View
          style={{
            marginTop: "auto",
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: "#ddd",
            textAlign: "center",
          }}
        >
          <Text style={{ fontSize: 7, color: "#999" }}>
            This is a Tether-ERP system-generated document. Digital signatures and
            QR codes verify authenticity.
          </Text>
        </View>
      </View>
    </View>
  </>
);

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
    default:
      return pdfStyles.statusDraft;
  }
};

const RequisitionPDF: React.FC<RequisitionPDFProps> = ({
  requisition,
  qrCodeUrl,
  organizationLogoUrl,
  documentHeader,
}) => {
  const documentNumber = requisition.documentNumber;
  const qrData = generateDocumentQRData(
    "REQUISITION",
    documentNumber,
    requisition.id,
    new Date(requisition.createdAt),
  );

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header with Organization Name and Logo */}
        <PDFHeader
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
              Date: {new Date(requisition.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* STATUS AND PRIORITY BADGES */}
          <View style={{ textAlign: "right" }}>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                marginBottom: 2,
                marginLeft: 2,
              }}
            >
              Status & PRIORITY
            </Text>
            <View>
              <View style={{ marginBottom: 0, flexDirection: "row", gap: 4 }}>
                <View
                  style={[
                    pdfStyles.statusBadge,
                    getStatusColor(requisition.status),
                  ]}
                >
                  <Text style={{ fontSize: 9 }}>
                    {capitalize(requisition.status)}
                  </Text>
                </View>
                {requisition.priority && (
                  <View
                    style={[
                      pdfStyles.statusBadge,
                      {
                        backgroundColor:
                          requisition.priority?.toUpperCase() === "URGENT"
                            ? "#fee2e2"
                            : requisition.priority?.toUpperCase() === "HIGH"
                              ? "#fed7aa"
                              : "#dbeafe",
                        color:
                          requisition.priority?.toUpperCase() === "URGENT"
                            ? "#991b1b"
                            : requisition.priority?.toUpperCase() === "HIGH"
                              ? "#92400e"
                              : "#1e40af",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 9 }}>
                      {capitalize(requisition.priority)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 1:  OFFICIAL USE ONLY */}
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
            SECTION 1: REQUISITION DETAILS
          </Text>

          {/* Requisition Info */}
          <View
            style={{
              marginBottom: 7,
              display: "flex",
              flexDirection: "row",
              gap: 12,
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
                DEPARTMENT
              </Text>
              <Text style={{ fontSize: 9 }}>
                {requisition.department || "—"}
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
                PRIORITY
              </Text>
              <Text style={{ fontSize: 9 }}>{requisition.priority || "—"}</Text>
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
                BUDGET CODE
              </Text>
              <Text style={{ fontSize: 8 }}>
                {requisition.budgetCode || "—"}
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
                CATEGORY
              </Text>
              <Text style={{ fontSize: 9 }}>
                {requisition.categoryName ||
                  requisition.otherCategoryText ||
                  "—"}
              </Text>
            </View>
          </View>

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
              DESCRIPTION / JUSTIFICATION
            </Text>
            <Text style={{ fontSize: 9 }}>
              {requisition.description || "No justification provided"}
            </Text>
          </View>

          {/* Requester Info */}
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
                REQUESTED BY
              </Text>
              <Text style={{ fontSize: 9 }}>
                {requisition.requesterName ||
                  requisition.requestedByName ||
                  "—"}
              </Text>
              {requisition.requestedByRole && (
                <Text style={{ fontSize: 7, color: "#999" }}>
                  {requisition.requestedByRole}
                </Text>
              )}
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
                DATE REQUESTED
              </Text>
              <Text style={{ fontSize: 9 }}>
                {new Date(requisition.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        {requisition.items && requisition.items.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>
              PLEASE PURCHASE THE FOLLOWING GOODS/SERVICES:
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
                  Total
                </Text>
              </View>

              {/* Table Rows */}
              {requisition.items.map((item: any, index: number) => {
                // Handle both naming conventions (description/itemDescription, unitPrice/estimatedCost)
                const itemDescription =
                  item.description || item.itemDescription || "";
                const unitPrice = item.unitPrice || item.estimatedCost || 0;
                const totalPrice =
                  item.totalPrice || item.quantity * unitPrice || 0;

                return (
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
                      {itemDescription}
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
                      {requisition.currency}{" "}
                      {unitPrice?.toLocaleString() || "0"}
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
                      {requisition.currency}{" "}
                      {totalPrice?.toLocaleString() || "0"}
                    </Text>
                  </View>
                );
              })}
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
                    ESTIMATED COST:
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      color: "#166534",
                    }}
                  >
                    {requisition.currency}{" "}
                    {requisition.totalAmount?.toLocaleString() || "0"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Approval Signatures Section */}
        {requisition.approvalHistory &&
          requisition.approvalHistory.length > 0 && (
            <ApprovalSignaturesSection
              approvalHistory={requisition.approvalHistory}
              documentType="Requisition"
            />
          )}

        {/* Footer: QR Code and Tracking Information */}
        <PDFFooter
          documentNumber={documentNumber}
          document={requisition}
          qrCodeUrl={qrCodeUrl ?? ""}
        />
      </Page>
    </Document>
  );
};

export default RequisitionPDF;
