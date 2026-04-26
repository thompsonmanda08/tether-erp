/**
 * Vendor Types
 * Note: Core Vendor type moved to core.ts
 */

// Re-export core Vendor type
export type { Vendor } from "./core";

// ================== REQUEST TYPES ==================

export interface CreateVendorRequest {
  name: string;
  email: string;
  phone: string;
  contactPerson?: string;
  physicalAddress: string;
  city: string;
  country: string;
  taxId: string;
  bankName: string;
  branchCode?: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
}

export interface UpdateVendorRequest {
  name?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  physicalAddress?: string;
  city?: string;
  country?: string;
  taxId?: string;
  bankName?: string;
  branchCode?: string;
  accountName?: string;
  accountNumber?: string;
  swiftCode?: string;
  active?: boolean;
}

// ================== FILTER TYPES ==================

export interface VendorFilters {
  active?: boolean;
  country?: string;
  search?: string;
}
