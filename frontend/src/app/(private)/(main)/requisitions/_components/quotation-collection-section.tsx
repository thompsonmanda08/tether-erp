"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components";
import {
  FileText,
  Plus,
  ExternalLink,
  X,
  Trash2,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  Upload,
} from "lucide-react";
import FileUpload from "@/components/base/file-upload";
import { Quotation } from "@/types/core";
import { Vendor } from "@/types/vendor";
import { uploadToImageKit } from "@/lib/imagekit";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

interface QuotationCollectionSectionProps {
  quotations: Quotation[];
  requisitionId: string;
  currency: string;
  vendors: Vendor[];
  canEdit: boolean;
  onSave: (quotations: Quotation[]) => Promise<void>;
  /** Current selected vendor ID for the PO */
  selectedVendorId?: string;
  /** Amount of the selected quotation — disambiguates duplicate vendors */
  selectedVendorAmount?: number;
  /** fileUrl of the selected quotation — uniquely identifies which row is active */
  selectedQuotationFileId?: string;
  /** Callback when a vendor is selected from quotations */
  onSelectVendor?: (
    vendorId: string,
    vendorName: string,
    amount: number,
    fileUrl: string,
  ) => Promise<void>;
  /** Show vendor selection UI (for PO pages) */
  showVendorSelection?: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function lowestAmountIndex(quotations: Quotation[]): number {
  if (quotations.length === 0) return -1;
  let idx = 0;
  for (let i = 1; i < quotations.length; i++) {
    if (quotations[i].amount < quotations[idx].amount) idx = i;
  }
  return idx;
}

// ── component ─────────────────────────────────────────────────────────────────

export function QuotationCollectionSection({
  quotations,
  currency,
  vendors,
  canEdit,
  onSave,
  selectedVendorId,
  selectedVendorAmount,
  selectedQuotationFileId,
  onSelectVendor,
  showVendorSelection = false,
}: QuotationCollectionSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [selectingVendor, setSelectingVendor] = useState(false);

  // Add-form state
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [replaceFileKey, setReplaceFileKey] = useState(0);

  const count = quotations.length;
  const hasEnough = count >= 3;
  const lowestIdx = lowestAmountIndex(quotations);

  // ── add form ──────────────────────────────────────────────────────────────

  function resetForm() {
    setVendorId("");
    setVendorName("");
    setAmount("");
    setFile(null);
    setFileKey((k) => k + 1);
    setShowForm(false);
  }

  async function handleAdd() {
    if (!vendorName.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      let fileId = "";
      let fileName = "";
      let fileUrl = "";
      if (file) {
        const result = await uploadToImageKit(file, "requisitions/quotations");
        fileId = result.fileId;
        fileName = result.name;
        fileUrl = result.url;
      }
      const newQuotation: Quotation = {
        vendorId,
        vendorName: vendorName.trim(),
        amount: parseFloat(amount),
        currency,
        fileId,
        fileName,
        fileUrl,
        uploadedAt: new Date().toISOString(),
      };
      await onSave([...quotations, newQuotation]);
      resetForm();
      toast.success("Quotation added");
    } catch {
      toast.error("Failed to add quotation");
    } finally {
      setSaving(false);
    }
  }

  function handleVendorSelect(id: string) {
    setVendorId(id);
    const vendor = vendors.find((v) => v.id === id);
    if (vendor) setVendorName(vendor.name);
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(idx: number) {
    setDeletingIdx(idx);
    try {
      const updated = quotations.filter((_, i) => i !== idx);
      await onSave(updated);
      toast.success("Quotation removed");
    } catch {
      toast.error("Failed to remove quotation");
    } finally {
      setDeletingIdx(null);
    }
  }

  // ── replace file ──────────────────────────────────────────────────────────

  async function handleReplace(idx: number) {
    if (!replaceFile) {
      toast.error("Select a file to replace with");
      return;
    }
    setReplacingIdx(idx);
    try {
      const result = await uploadToImageKit(
        replaceFile,
        "requisitions/quotations",
      );
      const updated = quotations.map((q, i) =>
        i === idx
          ? {
              ...q,
              fileId: result.fileId,
              fileName: result.name,
              fileUrl: result.url,
              uploadedAt: new Date().toISOString(),
            }
          : q,
      );
      await onSave(updated);
      setReplaceFile(null);
      setReplaceFileKey((k) => k + 1);
      toast.success("Quote document replaced");
    } catch {
      toast.error("Failed to replace document");
    } finally {
      setReplacingIdx(null);
    }
  }

  // ── select vendor ─────────────────────────────────────────────────────────

  async function handleSelectQuotationVendor(
    qVendorId: string,
    qVendorName: string,
    qAmount: number,
    qFileUrl: string,
  ) {
    if (!onSelectVendor) return;
    setSelectingVendor(true);
    try {
      await onSelectVendor(qVendorId, qVendorName, qAmount, qFileUrl);
      toast.success(`${qVendorName} selected as supplier`);
    } catch {
      toast.error("Failed to select vendor");
    } finally {
      setSelectingVendor(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 pt-6 border-t space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">Quotations</h3>
          <Badge
            className={`text-xs px-2 py-0.5 ${
              hasEnough
                ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800"
                : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-800"
            }`}
          >
            {count}/3
          </Badge>
          {!hasEnough && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {3 - count} more required
            </span>
          )}
        </div>
        {canEdit && !showForm && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Quotation
          </Button>
        )}
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New Quotation</p>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendors.length > 0 ? (
              <SelectField
                label="Vendor"
                value={vendorId || "__none__"}
                onValueChange={(v) =>
                  handleVendorSelect(v === "__none__" ? "" : v)
                }
                placeholder="Select vendor..."
                options={[
                  { value: "__none__", label: "None (enter manually)" },
                  ...vendors.map((v) => ({ value: v.id, label: v.name })),
                ]}
              />
            ) : null}

            {!vendorId && (
              <Input
                label={
                  vendors.length > 0 ? "Or type vendor name" : "Vendor Name"
                }
                placeholder="Vendor name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            )}

            <Input
              label={`Quoted Amount (${currency})`}
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <FileUpload
            key={fileKey}
            id="quotation-file"
            label="Quote Document (optional)"
            accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp"
            maxFileSize={10}
            compact
            onFileChange={setFile}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              isLoading={saving}
              onClick={handleAdd}
            >
              Add Quotation
            </Button>
          </div>
        </div>
      )}

      {/* ── Quotation rows ── */}
      {quotations.length > 0 && (
        <div className="rounded-lg border overflow-hidden divide-y">
          {quotations.map((q, i) => {
            const isSelected =
              showVendorSelection &&
              (selectedQuotationFileId
                ? q.fileUrl === selectedQuotationFileId
                : !!selectedVendorId && q.vendorId === selectedVendorId);
            const isLowest = i === lowestIdx && quotations.length > 1;
            const isDeleting = deletingIdx === i;
            const isReplacing = replacingIdx === i;

            return (
              <div
                key={`${q.vendorId}-${i}`}
                className={cn(
                  "p-3 transition-colors",
                  isSelected
                    ? "bg-green-50 dark:bg-green-950/30"
                    : "hover:bg-muted/30",
                )}
              >
                {/* Main row */}
                <div className="flex items-center gap-3">
                  {/* Vendor + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-sm truncate">
                        {q.vendorName}
                      </span>
                      {isSelected && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Selected
                        </Badge>
                      )}
                      {isLowest && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800 text-xs gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Lowest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-mono font-semibold">
                        {formatCurrency(q.amount, q.currency || currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.uploadedAt).toLocaleDateString("en-ZM", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* View document */}
                    {q.fileUrl && (
                      <a
                        href={q.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        title="View quote document"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {/* Select / deselect (PO only) */}
                    {showVendorSelection && onSelectVendor && (
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={cn("text-xs h-7 px-2", {
                          "bg-green-600 hover:bg-green-700 text-white border-green-600":
                            isSelected,
                        })}
                        onClick={() =>
                          handleSelectQuotationVendor(
                            q.vendorId,
                            q.vendorName,
                            q.amount,
                            q.fileUrl,
                          )
                        }
                        disabled={selectingVendor}
                        title={
                          isSelected
                            ? "Selected supplier"
                            : "Select as supplier"
                        }
                      >
                        {isSelected ? "✓ Selected" : "Select"}
                      </Button>
                    )}

                    {/* Replace document */}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Replace quote document"
                        onClick={() =>
                          setReplacingIdx(replacingIdx === i ? null : i)
                        }
                        disabled={isDeleting || isReplacing}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Delete */}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove quotation"
                        onClick={() => handleDelete(i)}
                        disabled={isDeleting || isReplacing}
                        isLoading={isDeleting}
                      >
                        {!isDeleting && <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Replace file inline panel */}
                {replacingIdx === i && canEdit && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Replace quote document for {q.vendorName}
                    </p>
                    <FileUpload
                      key={replaceFileKey}
                      id={`replace-file-${i}`}
                      label=""
                      accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                      maxFileSize={10}
                      compact
                      onFileChange={setReplaceFile}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplacingIdx(null);
                          setReplaceFile(null);
                          setReplaceFileKey((k) => k + 1);
                        }}
                        disabled={isReplacing}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReplace(i)}
                        disabled={!replaceFile || isReplacing}
                        isLoading={isReplacing}
                        loadingText="Replacing..."
                      >
                        Replace Document
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {quotations.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No quotations added yet.
          {canEdit &&
            ' Click "Add Quotation" to begin collecting vendor quotes.'}
        </p>
      )}
    </div>
  );
}
