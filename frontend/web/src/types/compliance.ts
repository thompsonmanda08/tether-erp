/**
 * Compliance Types
 * Types for compliance tracking and management
 */

// ================== COMPLIANCE STATUS ==================

export type ComplianceStatus = "compliant" | "non-compliant" | "pending";

// ================== COMPLIANCE ITEM ==================

export interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  status: ComplianceStatus;
  lastChecked: Date;
  nextReview: Date;
  responsible: string;
}

// ================== COMPLIANCE TRACKING ==================

export interface ComplianceTrackingData {
  requirements: ComplianceItem[];
  totalRequirements: number;
  compliantCount: number;
  nonCompliantCount: number;
  pendingCount: number;
  overallStatus: ComplianceStatus;
  lastUpdated: Date;
}

// ================== COMPLIANCE FILTERS ==================

export interface ComplianceFilters {
  status?: ComplianceStatus;
  responsible?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ================== COMPLIANCE REPORT ==================

export interface ComplianceReport {
  id: string;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: ComplianceTrackingData;
  details: ComplianceItem[];
}