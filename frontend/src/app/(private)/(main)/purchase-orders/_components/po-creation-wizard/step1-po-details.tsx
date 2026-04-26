"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { useActiveDepartments } from "@/hooks/use-department-queries";
import { useCurrencies } from "@/hooks/use-currencies";
import type { Requisition } from "@/types/requisition";
import type { WizardStep1State } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface Step1Props {
  data: WizardStep1State;
  requisition: Requisition;
  onChange: (data: WizardStep1State) => void;
  onNext: () => void;
}

interface Step1Errors {
  title?: string;
  departmentId?: string;
  deliveryDate?: string;
  currency?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateStep1(data: WizardStep1State): Step1Errors {
  const errors: Step1Errors = {};
  if (!data.title.trim()) {
    errors.title = "Title is required";
  }
  if (!data.departmentId.trim()) {
    errors.departmentId = "Department is required";
  }
  if (!data.deliveryDate) {
    errors.deliveryDate = "Delivery date is required";
  }
  if (!data.currency.trim()) {
    errors.currency = "Currency is required";
  }
  return errors;
}

// ============================================================================
// COMPONENT
// ============================================================================

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

/**
 * Step 1 of the PO Creation Wizard — PO Details form.
 *
 * Renders all required and optional Step 1 fields, displays the source
 * Requisition document number and total amount as read-only reference, and
 * validates required fields before calling `onNext`.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export function Step1PODetails({
  data,
  requisition,
  onChange,
  onNext,
}: Step1Props) {
  const [errors, setErrors] = useState<Step1Errors>({});

  const { data: departments = [], isLoading: departmentsLoading } =
    useActiveDepartments();
  const { data: currencies = [], isLoading: currenciesLoading } =
    useCurrencies();

  // ── field helpers ──────────────────────────────────────────────────────────

  const set = <K extends keyof WizardStep1State>(
    key: K,
    value: WizardStep1State[K],
  ) => {
    onChange({ ...data, [key]: value });
    // Clear the error for this field as soon as the user provides a value
    if (errors[key as keyof Step1Errors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleDepartmentChange = (value: string) => {
    const dept = Array.isArray(departments)
      ? departments.find((d) => d.id === value)
      : undefined;
    onChange({
      ...data,
      departmentId: value,
      department: dept?.name ?? value,
    });
    if (errors.departmentId) {
      setErrors((prev) => ({ ...prev, departmentId: undefined }));
    }
  };

  // ── next handler ───────────────────────────────────────────────────────────

  const handleNext = () => {
    const validationErrors = validateStep1(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onNext();
  };

  // ── currency options ───────────────────────────────────────────────────────

  const currencyOptions =
    Array.isArray(currencies) && currencies.length > 0
      ? currencies.map((c: { code: string; name: string }) => ({
          value: c.code,
          label: `${c.code} — ${c.name}`,
        }))
      : [
          { value: "ZMW", label: "ZMW — Zambian Kwacha" },
          { value: "USD", label: "USD — US Dollar" },
        ];

  // ── department options ─────────────────────────────────────────────────────

  const departmentOptions = Array.isArray(departments)
    ? departments.map((d) => ({ value: d.id, label: d.name }))
    : [];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Source Requisition (read-only) ── */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Source Requisition</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Document Number</span>
          <span className="font-mono font-medium">
            {requisition.documentNumber}
          </span>
          <span className="text-muted-foreground">Total Amount</span>
          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
            {requisition.currency}{" "}
            {requisition.totalAmount?.toLocaleString("en-ZM", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "0.00"}
          </span>
        </div>
      </div>

      <Separator />

      {/* ── Required fields ── */}
      <div className="space-y-4">
        <Input
          label="Title"
          name="po-title"
          required
          placeholder="Enter purchase order title"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          isInvalid={!!errors.title}
          errorText={errors.title}
        />
        {errors.title && (
          <span className="sr-only" data-testid="error-title">
            {errors.title}
          </span>
        )}

        <Textarea
          label="Description"
          name="po-description"
          placeholder="Describe the purpose of this purchase order (optional)"
          rows={3}
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <SelectField
              label="Department"
              name="po-department"
              required
              placeholder="Select department"
              isLoading={departmentsLoading}
              value={data.departmentId}
              onValueChange={handleDepartmentChange}
              options={departmentOptions}
              isInvalid={!!errors.departmentId}
            />
            {errors.departmentId && (
              <span
                className="ml-1 text-xs text-red-600 dark:text-red-400"
                data-testid="error-departmentId"
              >
                {errors.departmentId}
              </span>
            )}
          </div>

          <SelectField
            label="Priority"
            name="po-priority"
            value={data.priority}
            onValueChange={(v) =>
              set("priority", v as WizardStep1State["priority"])
            }
            options={PRIORITY_OPTIONS}
            placeholder="Select priority"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <DatePicker
              label="Delivery Date"
              name="po-delivery-date"
              required
              placeholder="Pick a delivery date"
              value={data.deliveryDate ?? undefined}
              onValueChange={(date) => {
                onChange({ ...data, deliveryDate: date ?? null });
                if (errors.deliveryDate) {
                  setErrors((prev) => ({ ...prev, deliveryDate: undefined }));
                }
              }}
              isInvalid={!!errors.deliveryDate}
              minDate={new Date()}
            />
            {errors.deliveryDate && (
              <span
                className="ml-1 text-xs text-red-600 dark:text-red-400"
                data-testid="error-deliveryDate"
              >
                {errors.deliveryDate}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <SelectField
              label="Currency"
              name="po-currency"
              required
              placeholder="Select currency"
              isLoading={currenciesLoading}
              value={data.currency}
              onValueChange={(v) => set("currency", v)}
              options={currencyOptions}
              isInvalid={!!errors.currency}
            />
            {errors.currency && (
              <span
                className="ml-1 text-xs text-red-600 dark:text-red-400"
                data-testid="error-currency"
              >
                {errors.currency}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Optional fields ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Budget Code"
            name="po-budget-code"
            placeholder="e.g. BUD-2025-001"
            value={data.budgetCode}
            onChange={(e) => set("budgetCode", e.target.value)}
          />
          <Input
            label="Cost Center"
            name="po-cost-center"
            placeholder="e.g. CC-FINANCE"
            value={data.costCenter}
            onChange={(e) => set("costCenter", e.target.value)}
          />
          <Input
            label="Project Code"
            name="po-project-code"
            placeholder="e.g. PROJ-001"
            value={data.projectCode}
            onChange={(e) => set("projectCode", e.target.value)}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleNext}
          className="w-full sm:w-auto"
          data-testid="step1-next-button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
