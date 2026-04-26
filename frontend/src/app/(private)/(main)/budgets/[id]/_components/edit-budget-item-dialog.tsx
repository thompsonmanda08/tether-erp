"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BudgetItem } from "@/types/budget";
import { validateBudgetItem } from "@/lib/budget-validation";
import { formatCurrency } from "@/lib/utils";

interface EditBudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: (item: BudgetItem) => void;
  existingItems: BudgetItem[];
  itemToEdit: BudgetItem | null;
  totalBudget: number;
  currency: string;
}

export function EditBudgetItemDialog({
  open,
  onOpenChange,
  onItemUpdated,
  existingItems,
  itemToEdit,
  totalBudget,
  currency,
}: EditBudgetItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    allocatedAmount: "",
    spentAmount: "",
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        category: itemToEdit.category,
        description: itemToEdit.description || "",
        allocatedAmount: itemToEdit.allocatedAmount.toString(),
        spentAmount: itemToEdit.spentAmount.toString(),
      });
    } else {
      setFormData({
        category: "",
        description: "",
        allocatedAmount: "",
        spentAmount: "",
      });
    }
  }, [itemToEdit, open]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const allocatedAmount = parseFloat(formData.allocatedAmount) || 0;
  const spentAmount = parseFloat(formData.spentAmount) || 0;
  const remainingAmount = allocatedAmount - spentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.allocatedAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const allocatedAmt = parseFloat(formData.allocatedAmount);
    const spentAmt = parseFloat(formData.spentAmount) || 0;

    // Validate the item
    const validation = validateBudgetItem(
      { allocatedAmount: allocatedAmt, spentAmount: spentAmt },
      existingItems,
      totalBudget,
      itemToEdit?.id, // Exclude current item from budget check
    );

    if (!validation.valid) {
      toast.error(validation.error || "Invalid budget item");
      return;
    }

    if (!itemToEdit) return;

    setIsSubmitting(true);
    try {
      const updatedItem: BudgetItem = {
        ...itemToEdit,
        category: formData.category,
        description: formData.description,
        allocatedAmount: allocatedAmt,
        spentAmount: spentAmt,
        remainingAmount: remainingAmount,
        updatedAt: new Date(),
      };

      onItemUpdated(updatedItem);
      toast.success("Budget item updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating budget item:", error);
      toast.error("An error occurred while updating the budget item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget Item</DialogTitle>
          <DialogDescription>
            Update the budget item details and track spending
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <Input
            label="Category"
            required
            id="category"
            placeholder="e.g., Hardware, Software, Personnel"
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            disabled={isSubmitting}
          />

          {/* Description */}
          <Textarea
            label="Description"
            id="description"
            placeholder="Describe this budget item (optional)"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />

          {/* Allocated Amount */}
          <Input
            label="Allocated Amount"
            required
            id="allocatedAmount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={formData.allocatedAmount}
            onChange={(e) =>
              handleInputChange("allocatedAmount", e.target.value)
            }
            disabled={isSubmitting}
          />

          {/* Spent Amount */}
          <div>
            <Input
              label="Spent Amount"
              id="spentAmount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.spentAmount}
              onChange={(e) => handleInputChange("spentAmount", e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Remaining: {formatCurrency(remainingAmount)}
            </p>
          </div>

          {/* Warning if spent > allocated */}
          {spentAmount > allocatedAmount && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                ⚠️ Spent amount exceeds allocated amount by{" "}
                {formatCurrency(spentAmount - allocatedAmount)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
              isLoading={isSubmitting}
              loadingText="Updating..."
            >
              Update Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
