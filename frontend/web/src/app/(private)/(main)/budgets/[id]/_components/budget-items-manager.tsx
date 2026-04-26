"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  allocatedAmount: number;
}

interface BudgetItemsManagerProps {
  items: BudgetItem[];
  totalBudget: number;
  currency?: string;
  isEditable: boolean;
  onItemsChange: (items: BudgetItem[]) => void;
}

export function BudgetItemsManager({
  items: initialItems,
  totalBudget,
  currency = "K",
  isEditable,
  onItemsChange,
}: BudgetItemsManagerProps) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems || []);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    allocatedAmount: "",
  });

  // Sync local state with prop changes
  useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);

  // Calculate totals
  const totalAllocated = useMemo(() => {
    return items.reduce((sum, item) => sum + item.allocatedAmount, 0);
  }, [items]);

  const remainingBudget = totalBudget - totalAllocated;
  const allocationPercentage = (totalAllocated / totalBudget) * 100;

  const resetForm = () => {
    setFormData({
      category: "",
      description: "",
      allocatedAmount: "",
    });
    setEditingItem(null);
  };

  const handleAddItem = () => {
    const amount = parseFloat(formData.allocatedAmount);

    if (!formData.category.trim()) {
      toast.error("Category is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (totalAllocated + amount > totalBudget) {
      toast.error(
        `Cannot exceed total budget. Remaining: ${formatCurrency(remainingBudget, currency)}`,
      );
      return;
    }

    const newItem: BudgetItem = {
      id: Date.now().toString(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      allocatedAmount: amount,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    onItemsChange(updatedItems);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Budget item added successfully");
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      description: item.description,
      allocatedAmount: item.allocatedAmount.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    const amount = parseFloat(formData.allocatedAmount);

    if (!formData.category.trim()) {
      toast.error("Category is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // Calculate remaining budget excluding the item being edited
    const otherItemsTotal = items
      .filter((item) => item.id !== editingItem.id)
      .reduce((sum, item) => sum + item.allocatedAmount, 0);

    if (otherItemsTotal + amount > totalBudget) {
      const available = totalBudget - otherItemsTotal;
      toast.error(
        `Cannot exceed total budget. Available: ${formatCurrency(available, currency)}`,
      );
      return;
    }

    const updatedItems = items.map((item) =>
      item.id === editingItem.id
        ? {
            ...item,
            category: formData.category.trim(),
            description: formData.description.trim(),
            allocatedAmount: amount,
          }
        : item,
    );

    setItems(updatedItems);
    onItemsChange(updatedItems);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Budget item updated successfully");
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter((item) => item.id !== itemId);
    setItems(updatedItems);
    onItemsChange(updatedItems);
    toast.success("Budget item removed");
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Items</CardTitle>
            <CardDescription>
              Breakdown of budget allocation by category
            </CardDescription>
          </div>
          {isEditable && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Total Budget
            </p>
            <p className="text-2xl font-bold">
              {currency}
              {totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Allocated
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {currency}
              {totalAllocated.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Remaining
            </p>
            <p
              className={`text-2xl font-bold ${remainingBudget < 0 ? "text-red-600" : "text-green-600"}`}
            >
              {currency}
              {remainingBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Allocation Progress</span>
            <span
              className={
                allocationPercentage > 100 ? "text-red-600 font-semibold" : ""
              }
            >
              {allocationPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                allocationPercentage > 100
                  ? "bg-red-600"
                  : allocationPercentage === 100
                    ? "bg-green-600"
                    : "bg-blue-600"
              }`}
              style={{
                width: `${Math.min(allocationPercentage, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Validation Alert */}
        {remainingBudget < 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Budget items exceed total budget by {currency}
              {Math.abs(remainingBudget).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Items Table */}
        {items.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                  {isEditable && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const percentage = (item.allocatedAmount / totalBudget) * 100;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currency}
                        {item.allocatedAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      {isEditable && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No budget items added yet</p>
            {isEditable && (
              <p className="text-sm mt-2">
                Click "Add Item" to start allocating your budget
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Budget Item" : "Add Budget Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the budget item details below"
                : `Add a new budget item. Remaining budget: ${formatCurrency(remainingBudget, currency)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              label="Category"
              required
              id="category"
              placeholder="e.g., Salaries, Equipment, Travel"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            />

            <Input
              label="Description"
              required
              id="description"
              placeholder="Brief description of this budget item"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />

            <div>
              <Input
                label={`Amount (${currency})`}
                required
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.allocatedAmount}
                onChange={(e) =>
                  setFormData({ ...formData, allocatedAmount: e.target.value })
                }
              />
              {formData.allocatedAmount && (
                <p className="text-sm text-muted-foreground">
                  {(
                    (parseFloat(formData.allocatedAmount) / totalBudget) *
                    100
                  ).toFixed(1)}
                  % of total budget
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
              {editingItem ? "Update" : "Add"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
