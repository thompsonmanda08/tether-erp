import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { ApprovalRecord } from "@/types/core";

interface ApprovalSignaturesSectionProps {
  approvalHistory: ApprovalRecord[];
  documentType?: string;
}

/**
 * Compact Approval Chain Section
 * Renders approved signatories before the PDF footer.
 * Adapts column count to chain length: 1→1col, 2→2col, 3-5→3col, 6+→4col
 */
export const ApprovalSignaturesSection: React.FC<
  ApprovalSignaturesSectionProps
> = ({ approvalHistory }) => {
  const approvedRecords = approvalHistory.filter(
    (r) => r.status?.toUpperCase() === "APPROVED",
  );

  if (!approvedRecords || approvedRecords.length === 0) return null;

  const count = approvedRecords.length;
  const cols = count === 1 ? 1 : count === 2 ? 2 : count <= 5 ? 3 : 4;
  // Percentage widths that fit within react-pdf's flex model
  const widthMap: Record<number, string> = {
    1: "58%",
    2: "47%",
    3: "30%",
    4: "22%",
  };
  const cardWidth = widthMap[cols];

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "—";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const getName = (r: ApprovalRecord) =>
    r.approverName || r.actionTakenBy || "Unknown";

  const getRole = (r: ApprovalRecord) =>
    r.assignedRole || r.actionTakenByRole || null;

  const getDate = (r: ApprovalRecord) => r.approvedAt || r.actionTakenAt;

  return (
    <View
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: "1.5px solid #ddd",
      }}
    >
      {/* Section heading */}
      <Text
        style={{
          fontSize: 8,
          fontWeight: "bold",
          marginBottom: 5,
          color: "#1e3a8a",
          textAlign: "center",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        Approval Chain
      </Text>

      {/* Card grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 5,
          justifyContent: count === 1 ? "center" : "flex-start",
        }}
      >
        {approvedRecords.map((r, idx) => (
          <View
            key={idx}
            style={{
              width: cardWidth,
              border: "1px solid #d1d5db",
              borderRadius: 3,
              padding: 5,
              backgroundColor: "#f9fafb",
            }}
          >
            {/* Signature area */}
            <View
              style={{
                minHeight: 22,
                borderBottom: "1px solid #d1d5db",
                marginBottom: 4,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {r.signature ? (
                <Image
                  src={r.signature}
                  style={{ maxHeight: 22, maxWidth: "100%", objectFit: "contain" }}
                />
              ) : (
                <Text
                  style={{ fontSize: 6, color: "#9ca3af", fontStyle: "italic" }}
                >
                  [Electronically Approved]
                </Text>
              )}
            </View>

            {/* Approver name */}
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                color: "#111827",
                marginBottom: 1,
              }}
            >
              {getName(r)}
            </Text>

            {/* Position */}
            {r.position && (
              <Text
                style={{
                  fontSize: 6,
                  color: "#374151",
                  marginBottom: 1,
                }}
              >
                {r.position}
              </Text>
            )}

            {/* Man No */}
            {r.manNumber && (
              <Text
                style={{
                  fontSize: 6,
                  color: "#6b7280",
                  marginBottom: 1,
                }}
              >
                Man No: {r.manNumber}
              </Text>
            )}

            {/* Role (fallback label) */}
            {!r.position && getRole(r) && (
              <Text
                style={{
                  fontSize: 6,
                  color: "#6b7280",
                  fontStyle: "italic",
                  marginBottom: 1,
                }}
              >
                {getRole(r)}
              </Text>
            )}

            {/* Approval date */}
            <Text style={{ fontSize: 6, color: "#6b7280", marginTop: 2 }}>
              {formatDate(getDate(r))}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer note */}
      <Text
        style={{
          fontSize: 6,
          color: "#9ca3af",
          marginTop: 5,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        This document has been electronically approved by the above signatories.
      </Text>
    </View>
  );
};
