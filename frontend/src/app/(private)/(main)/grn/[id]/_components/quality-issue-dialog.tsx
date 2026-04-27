"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { GRNItem } from "@/types/goods-received-note";

interface QualityIssue {
  itemDescription: string;
  issueType: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

interface QualityIssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: GRNItem[];
  onAddIssue: (issue: Omit<QualityIssue, "id">) => void;
}

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "text-yellow-600" },
  { value: "MEDIUM", label: "Medium", color: "text-orange-600" },
  { value: "HIGH", label: "High", color: "text-red-600" },
] as const;

export function QualityIssueReportDialog({
  open,
  onOpenChange,
  items,
  onAddIssue,
}: QualityIssueReportDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = items.find((item) => item.id === selectedItemId);

  const handleSubmit = async () => {
    if (!selectedItemId || !description.trim() || !severity) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      onAddIssue({
        itemDescription: selectedItem?.description || "",
        issueType: "quality_issue",
        description: description.trim(),
        severity,
      });

      toast.success("Quality issue reported successfully");
      setSelectedItemId("");
      setDescription("");
      setSeverity("MEDIUM");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to report quality issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedItemId("");
      setDescription("");
      setSeverity("MEDIUM");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Report Quality Issue</DialogTitle>
          </div>
          <DialogDescription>
            Document quality issues or defects found during goods inspection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Selection */}
          <div className="space-y-2">
            <Label htmlFor="item-select">Item *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="item-select">
                <SelectValue placeholder="Select item with issue" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item, index) => (
                  <SelectItem
                    key={item.id || index}
                    value={item.id || `item-${index}`}
                  >
                    {index + 1}. {item.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Details Preview */}
          {selectedItem && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition:</span>
                <span className="font-medium">{selectedItem.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received Qty:</span>
                <span className="font-medium">
                  {selectedItem.quantityReceived}
                </span>
              </div>
              {selectedItem.notes && (
                <div className="text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                  <p className="text-xs font-medium mb-1">Notes:</p>
                  <p>{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Severity Selection */}
          <div className="space-y-2">
            <Label htmlFor="severity-select">Severity Level *</Label>
            <Select
              value={severity}
              onValueChange={(val) =>
                setSeverity(val as "LOW" | "MEDIUM" | "HIGH")
              }
            >
              <SelectTrigger id="severity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${getSeverityBgColor(option.value)}`}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Low: Minor cosmetic issues | Medium: Functional concerns | High:
              Critical defects
            </p>
          </div>

          {/* Issue Description */}
          <Textarea
            label="Issue Description"
            required
            id="description"
            placeholder="Describe the quality issue, defect, or damage..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
            descriptionText={`${description.length}/500 characters`}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !selectedItemId ||
              !description.trim() ||
              !severity
            }
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting ? "Reporting..." : "Report Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getSeverityBgColor(severity: "LOW" | "MEDIUM" | "HIGH"): string {
  switch (severity) {
    case "LOW":
      return "bg-yellow-400";
    case "MEDIUM":
      return "bg-orange-400";
    case "HIGH":
      return "bg-red-500";
  }
}
