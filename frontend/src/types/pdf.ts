/**
 * PDF and Export Types
 * Types for PDF generation, QR codes, and export functionality
 */

// ================== QR CODE TYPES ==================

export interface QRCodeData {
  documentType: 'REQUISITION' | 'PURCHASE_ORDER' | 'PAYMENT_VOUCHER';
  documentNumber: string;
  documentId: string;
  timestamp: number;
}

// ================== WATERMARK TYPES ==================

export interface WatermarkOptions {
  text: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
}

// ================== EMAIL TYPES ==================

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailOptions {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  attachments?: string[];
}

// ================== BATCH EXPORT TYPES ==================

export interface BatchExportProgress {
  total: number;
  completed: number;
  current: string;
  error?: string;
}

export interface BatchExportResult {
  fileName: string;
  success: boolean;
  error?: string;
}

// ================== PDF GENERATION TYPES ==================

export interface PDFGenerationOptions {
  includeQR?: boolean;
  includeWatermark?: boolean;
  watermarkOptions?: WatermarkOptions;
  includeSignatures?: boolean;
  includeAttachments?: boolean;
}

export interface PDFExportRequest {
  documentId: string;
  documentType: string;
  options?: PDFGenerationOptions;
}