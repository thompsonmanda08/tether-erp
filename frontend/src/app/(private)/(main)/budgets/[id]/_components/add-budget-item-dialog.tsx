"use client";

import { useState } from "react";
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
import {
  validateBudgetItem,
  calculateTotalAllocated,
  calculateRemainingBudget,
} from "@/lib/budget-validation";
import { formatCurrency } from "@/lib/utils";

interface AddBudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: (item: {
    category: string;
    description: string;
    allocatedAmount: number;
    spentAmount: number;
  }) => void;
  existingItems: BudgetItem[];
  totalBudget: number;
  currency: string;
}

export function AddBudgetItemDialog({
  open,
  onOpenChange,
  onItemAdded,
  existingItems,
  totalBudget,
  currency,
}: AddBudgetItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    allocatedAmount: "",
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const remainingBudget = calculateRemainingBudget(totalBudget, existingItems);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.allocatedAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const allocatedAmount = parseFloat(formData.allocatedAmount);

    // Validate the item
    const validation = validateBudgetItem(
      { allocatedAmount, spentAmount: 0 },
      existingItems,
      totalBudget,
    );

    if (!validation.valid) {
      toast.error(validation.error || "Invalid budget item");
      return;
    }

    setIsSubmitting(true);
    try {
      onItemAdded({
        category: formData.category,
        description: formData.description,
        allocatedAmount,
        spentAmount: 0,
      });

      toast.success("Budget item added successfully");
      setFormData({
        category: "",
        description: "",
        allocatedAmount: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding budget item:", error);
      toast.error("An error occurred while adding the budget item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
          <DialogDescription>
            Add a new line item to your budget allocation. Remaining budget:{" "}
            {formatCurrency(remainingBudget)}
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
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
