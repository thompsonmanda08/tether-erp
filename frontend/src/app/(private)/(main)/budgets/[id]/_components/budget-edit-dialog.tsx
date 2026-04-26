"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Budget } from "@/types/budget";
import { useActiveDepartments } from "@/hooks/use-department-queries";

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onSave: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

const currencies = [
  { code: "ZMW", label: "Zambian Kwacha (K)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
];

export function BudgetEditDialog({
  open,
  onOpenChange,
  budget,
  onSave,
  isSubmitting,
}: BudgetEditDialogProps) {
  const { data: departments = [], isLoading: isLoadingDepartments } =
    useActiveDepartments();

  const [formData, setFormData] = useState({
    name: budget.name || "",
    description: budget.description || "",
    department: budget.department || "",
    departmentId: budget.departmentId || "",
    fiscalYear: budget.fiscalYear || "",
    totalBudget: budget.totalBudget.toString(),
    currency: budget.currency || "ZMW",
  });

  // Reset form when budget changes
  useEffect(() => {
    setFormData({
      name: budget.name || "",
      description: budget.description || "",
      department: budget.department || "",
      departmentId: budget.departmentId || "",
      fiscalYear: budget.fiscalYear || "",
      totalBudget: budget.totalBudget.toString(),
      currency: budget.currency || "ZMW",
    });
  }, [budget]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDepartmentChange = (departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    setFormData((prev) => ({
      ...prev,
      departmentId,
      department: dept?.name || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSave({
      name: formData.name,
      description: formData.description,
      department: formData.department,
      departmentId: formData.departmentId,
      fiscalYear: formData.fiscalYear,
      totalBudget: parseFloat(formData.totalBudget),
      currency: formData.currency,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Update budget information. Budget items are managed separately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Budget Name */}
          <Input
            label="Budget Name"
            required
            id="name"
            placeholder="e.g., IT Department Annual Budget 2024"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={isSubmitting}
          />

          {/* Description */}
          <Textarea
            label="Description"
            id="description"
            placeholder="Add a description for this budget (optional)"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />

          {/* Department */}
          <SelectField
            label="Department"
            required
            placeholder={
              isLoadingDepartments
                ? "Loading departments..."
                : "Select a department"
            }
            value={formData.departmentId}
            onValueChange={handleDepartmentChange}
            disabled={isSubmitting || isLoadingDepartments}
            isLoading={isLoadingDepartments}
            options={departments.map((dept) => ({
              value: dept.id,
              label: dept.name,
            }))}
          />

          {/* Fiscal Year */}
          <Input
            label="Fiscal Year"
            required
            id="fiscalYear"
            type="number"
            placeholder="2024"
            value={formData.fiscalYear}
            onChange={(e) => handleInputChange("fiscalYear", e.target.value)}
            disabled={isSubmitting}
          />

          {/* Total Budget and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Budget"
              required
              id="totalBudget"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.totalBudget}
              onChange={(e) =>
                handleInputChange("totalBudget", e.target.value)
              }
              disabled={isSubmitting}
            />

            <SelectField
              label="Currency"
              required
              value={formData.currency}
              onValueChange={(value) => handleInputChange("currency", value)}
              disabled={isSubmitting}
              options={currencies.map((curr) => ({
                value: curr.code,
                label: curr.label,
              }))}
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} loadingText="Saving...">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
