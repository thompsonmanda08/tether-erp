"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVendor } from "@/hooks/use-vendor-queries";
import type { Vendor } from "@/types/core";

// ============================================================================
// TYPES
// ============================================================================

export interface InlineVendorFormProps {
  onSaved: (vendor: Vendor) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  physicalAddress: string;
  city: string;
  country: string;
  taxId: string;
  bankName: string;
  branchCode: string;
  accountName: string;
  accountNumber: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  physicalAddress?: string;
  city?: string;
  country?: string;
  taxId?: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  physicalAddress: "",
  city: "",
  country: "",
  taxId: "",
  bankName: "",
  branchCode: "",
  accountName: "",
  accountNumber: "",
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Inline new-vendor form for Step 2 of the PO Creation Wizard.
 *
 * Flat layout (no section grouping). Required fields: name, email, phone,
 * address, city, country, TPIN. Calls `useCreateVendor` on save. On API failure,
 * keeps the form open with data preserved and shows an inline error message.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 9.10
 */
export function InlineVendorForm({ onSaved, onCancel }: InlineVendorFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Use the mutation without the built-in onSuccess callback so we can
  // intercept the result and call onSaved with the created vendor.
  const createMutation = useCreateVendor();

  // ── field helpers ──────────────────────────────────────────────────────────

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear API error when user edits anything
    if (apiError) setApiError(null);
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Vendor name is required";
    if (!form.email.trim()) next.email = "Email is required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    if (!form.physicalAddress.trim())
      next.physicalAddress = "Physical address is required";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.country.trim()) next.country = "Country is required";
    if (!form.taxId.trim()) next.taxId = "Tax ID / TPIN is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!validate()) return;

    setApiError(null);

    createMutation.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        physicalAddress: form.physicalAddress.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        taxId: form.taxId.trim(),
        bankName: form.bankName.trim() || "",
        accountName: form.accountName.trim() || "",
        accountNumber: form.accountNumber.trim() || "",
        branchCode: form.branchCode.trim() || undefined,
      },
      {
        onSuccess: (response) => {
          const vendor = response.data as Vendor;
          onSaved(vendor);
        },
        onError: (error: Error) => {
          // Keep form open with data preserved; show inline error.
          setApiError(
            error.message || "Failed to create vendor. Please try again.",
          );
        },
      },
    );
  }

  const isPending = createMutation.isPending;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4 space-y-4"
      data-testid="inline-vendor-form"
    >
      {/* ── API error banner ── */}
      {apiError && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="inline-vendor-api-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Vendor Name (required) ── */}
      <div className="space-y-1.5">
        <Label htmlFor="inline-vendor-name">
          Vendor Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="inline-vendor-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Supplier name"
          disabled={isPending}
          data-testid="inline-vendor-name"
        />
        {errors.name && (
          <p
            className="text-xs text-destructive"
            data-testid="inline-vendor-name-error"
          >
            {errors.name}
          </p>
        )}
      </div>

      {/* ── Email & Phone (required) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inline-vendor-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="vendor@example.com"
            disabled={isPending}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inline-vendor-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+260 97..."
            disabled={isPending}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* ── Physical Address (required) ── */}
      <div className="space-y-1.5">
        <Label htmlFor="inline-vendor-address">
          Physical Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="inline-vendor-address"
          value={form.physicalAddress}
          onChange={(e) => set("physicalAddress", e.target.value)}
          placeholder="Street address, building, area..."
          rows={2}
          disabled={isPending}
        />
        {errors.physicalAddress && (
          <p className="text-xs text-destructive">{errors.physicalAddress}</p>
        )}
      </div>

      {/* ── City & Country (required) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inline-vendor-city"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Lusaka"
            disabled={isPending}
          />
          {errors.city && (
            <p className="text-xs text-destructive">{errors.city}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-country">
            Country <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inline-vendor-country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="Zambia"
            disabled={isPending}
          />
          {errors.country && (
            <p className="text-xs text-destructive">{errors.country}</p>
          )}
        </div>
      </div>

      {/* ── Tax ID / TPIN (required) ── */}
      <div className="space-y-1.5">
        <Label htmlFor="inline-vendor-taxid">
          Tax ID / TPIN <span className="text-destructive">*</span>
        </Label>
        <Input
          id="inline-vendor-taxid"
          value={form.taxId}
          onChange={(e) => set("taxId", e.target.value)}
          placeholder="Tax / TPIN number"
          disabled={isPending}
        />
        {errors.taxId && (
          <p className="text-xs text-destructive">{errors.taxId}</p>
        )}
      </div>

      {/* ── Bank fields (optional) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-bankname">Bank Name</Label>
          <Input
            id="inline-vendor-bankname"
            value={form.bankName}
            onChange={(e) => set("bankName", e.target.value)}
            placeholder="e.g. Zanaco (optional)"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-branchcode">Branch Code</Label>
          <Input
            id="inline-vendor-branchcode"
            value={form.branchCode}
            onChange={(e) => set("branchCode", e.target.value)}
            placeholder="Sort / branch code (optional)"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-accountname">Account Name</Label>
          <Input
            id="inline-vendor-accountname"
            value={form.accountName}
            onChange={(e) => set("accountName", e.target.value)}
            placeholder="Name on account (optional)"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-vendor-accountnumber">Account Number</Label>
          <Input
            id="inline-vendor-accountnumber"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="Account number (optional)"
            disabled={isPending}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          data-testid="inline-vendor-cancel"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          data-testid="inline-vendor-save"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Vendor
        </Button>
      </div>
    </div>
  );
}
