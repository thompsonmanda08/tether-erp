import type { Quotation } from "@/types/core";

// ================== WIZARD STATE INTERFACES ==================

export interface WizardStep1State {
  title: string;
  description: string;
  departmentId: string;
  department: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  budgetCode: string;
  costCenter: string;
  projectCode: string;
  deliveryDate: Date | null;
  currency: string;
}

export interface WizardVendorEntry {
  /** Stable local key for React list rendering */
  localId: string;
  /** Set after vendor is saved to backend; empty string for pre-save */
  vendorId: string;
  vendorName: string;
  quotations: Quotation[];
  /** fileUrl of the quotation row selected as the active quote for this vendor */
  selectedQuotationFileId?: string;
  /** Quoted amount from the selected quotation row */
  quotedAmount?: number;
}

export interface WizardStep2State {
  vendors: WizardVendorEntry[];
  /** localId of the vendor designated as the final supplier */
  selectedVendorLocalId: string | null;
  /** Live quotations (starts from REQ metadata, updated as user adds more) */
  quotations?: Quotation[];
  /** fileUrl of the selected quotation row */
  selectedQuotationFileId?: string;
  /** Quoted amount from the selected quotation */
  selectedQuotedAmount?: number;
}

export interface WizardStep3State {
  workflowId: string;
  procurementFlow: "" | "goods_first" | "payment_first";
}

export interface WizardState {
  step1: WizardStep1State;
  step2: WizardStep2State;
  step3: WizardStep3State;
}

// ================== PURE UTILITY FUNCTIONS ==================

/**
 * Computes the absolute and percentage variance between an estimated cost and a quoted amount.
 * Requirements: 4.2
 */
export function computeVariance(
  estimatedCost: number,
  quotedAmount: number,
): { absolute: number; percentage: number } {
  const absolute = quotedAmount - estimatedCost;
  const percentage = estimatedCost > 0 ? (absolute / estimatedCost) * 100 : 0;
  return { absolute, percentage };
}

/**
 * Returns the Tailwind color class for a variance value.
 * - Green  : vendor price is below estimated cost (absolute < 0)
 * - Amber  : variance is positive but within 10 % of estimated cost
 * - Red    : variance exceeds 10 % of estimated cost
 * Requirements: 4.3, 4.4, 4.5
 */
export function varianceColorClass(
  absolute: number,
  percentage: number,
): string {
  if (absolute < 0) return "text-green-600 dark:text-green-400";
  if (percentage <= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
