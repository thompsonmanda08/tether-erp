/**
 * QR Code utility functions for PDF documents
 * Generates QR codes that encode document information for tracking and verification
 */

/**
 * Get the verification URL for a document
 * @param documentNumber The document number (unique identifier)
 * @param organizationId Optional organization ID for additional filtering
 */
export function getVerificationUrl(documentNumber: string, organizationId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let url = `${baseUrl}/verify/${encodeURIComponent(documentNumber)}`;

  // Add organization ID as query parameter if provided (for filtering/analytics)
  if (organizationId) {
    url += `?org=${encodeURIComponent(organizationId)}`;
  }

  return url;
}

/**
 * Generate QR code data for a document
 * Returns the verification URL that can be scanned to verify the document
 * @param documentType The type of document
 * @param documentNumber The document number
 * @param documentId The document UUID
 * @param timestamp The creation timestamp
 * @param organizationId Optional organization ID for additional context
 */
export function generateDocumentQRData(
  documentType: "REQUISITION" | "PURCHASE_ORDER" | "PAYMENT_VOUCHER" | "GRN",
  documentNumber: string,
  documentId: string,
  timestamp: Date,
  organizationId?: string
): string {
  // Return the verification URL - this is what gets encoded in the QR code
  return getVerificationUrl(documentNumber, organizationId);
}

/**
 * Generate QR code URL using a free QR service
 * We use qr-server.com which doesn't require API key
 */
export function getQRCodeUrl(data: string, size: number = 200): string {
  // Encode the data for URL
  const encodedData = encodeURIComponent(data);
  // Using QR Server API - free, no authentication needed
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Get the QR code image URL for a document
 * This returns a URL to a QR code image that encodes the verification URL
 * @param documentNumber The document number
 * @param size The size of the QR code image (default: 200)
 * @param organizationId Optional organization ID for additional context
 */
export function getDocumentQRCodeUrl(
  documentNumber: string,
  size: number = 200,
  organizationId?: string
): string {
  const verificationUrl = getVerificationUrl(documentNumber, organizationId);
  return getQRCodeUrl(verificationUrl, size);
}

/**
 * Create a local QR code as data URL
 * For offline/embedded QR codes in PDFs
 */
export async function generateQRCodeDataUrl(
  data: string,
  size: number = 200
): Promise<string> {
  try {
    const QRCode = require("qrcode");
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: size,
    });
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    // Fallback to online QR service
    return getQRCodeUrl(data, size);
  }
}

/**
 * Generate QR code data URL for a document verification
 * @param documentNumber The document number
 * @param size The size of the QR code image (default: 200)
 * @param organizationId Optional organization ID for additional context
 */
export async function generateDocumentQRCodeDataUrl(
  documentNumber: string,
  size: number = 200,
  organizationId?: string
): Promise<string> {
  const verificationUrl = getVerificationUrl(documentNumber, organizationId);
  return generateQRCodeDataUrl(verificationUrl, size);
}

/**
 * Format tracking information for display
 */
export function formatTrackingInfo(
  documentNumber: string,
  documentId: string,
  status: string,
  createdDate: Date
): string {
  return [
    `Document: ${documentNumber}`,
    `ID: ${documentId}`,
    `Status: ${status}`,
    `Created: ${createdDate.toLocaleDateString()}`,
  ].join(" | ");
}
