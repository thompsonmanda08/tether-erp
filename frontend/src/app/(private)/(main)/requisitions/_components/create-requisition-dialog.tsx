"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectField } from "@/components/ui/select-field";
import {
  Plus,
  Trash2,
  FileText,
  ImageIcon,
  X,
  Loader2,
  Paperclip,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  RequisitionItem,
  RequisitionPriority,
  RequisitionAttachment,
  Requisition,
} from "@/types/requisition";
import { uploadToImageKit } from "@/lib/imagekit";
import {
  useCreateRequisition,
  useUpdateRequisition,
} from "@/hooks/use-requisition-mutations";
import { useCategories } from "@/hooks/use-category-queries";
import { useAllBudgets } from "@/hooks/use-budget-queries";
import { useActiveDepartments } from "@/hooks/use-department-queries";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { useConfigurationStatus } from "@/hooks/use-configuration-status";
import { ConfigurationChecklistBanner } from "@/components/ui/configuration-checklist-banner";

interface CreateRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequisitionCreated: () => void;
  userId: string;
  editingRequisition?: Requisition | null;
  isEditing?: boolean;
  initialStep?: "details" | "items";
}

export function CreateRequisitionDialog({
  open,
  onOpenChange,
  onRequisitionCreated,
  userId,
  editingRequisition = null,
  isEditing = false,
  initialStep = "details",
}: CreateRequisitionDialogProps) {
  const createMutation = useCreateRequisition(() => {
    // Reset form on success
    resetForm();
    onRequisitionCreated();
  });

  const updateMutation = useUpdateRequisition(() => {
    // Reset form on success
    resetForm();
    onRequisitionCreated();
  });

  // Fetch categories for the dropdown
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(
    1,
    50,
    true,
  );

  // Fetch budgets for the dropdown
  const { data: budgets = [], isLoading: budgetsLoading } = useAllBudgets();

  // Fetch departments for the dropdown
  const { data: departments = [], isLoading: departmentsLoading } =
    useActiveDepartments();

  // Check configuration status for required fields
  const configStatus = useConfigurationStatus({
    includeWorkflow: false, // Workflow is only required for submission, not creation
  });

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    departmentId: "",
    priority: "MEDIUM" as RequisitionPriority,
    requestedFor: "",
    justification: "",
    budgetCode: "N/A",
    sourceOfFunds: "",
    costCenter: "",
    projectCode: "",
    currency: "ZMW",
    isEstimate: true,
    requiredByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    items: [] as RequisitionItem[],
    categoryId: "OTHER",
    otherCategoryText: "",
    attachments: [] as RequisitionAttachment[],
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [step, setStep] = useState<"details" | "items">("details");

  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      departmentId: "",
      priority: "MEDIUM",
      requestedFor: "",
      justification: "",
      budgetCode: "N/A",
      sourceOfFunds: "",
      costCenter: "",
      projectCode: "",
      currency: "ZMW",
      isEstimate: true,
      requiredByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [],
      categoryId: "OTHER",
      otherCategoryText: "",
      attachments: [],
    });
    setUploadingFile(false);
    setStep("details");
  };

  const validateDetails = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title for the requisition");
      return false;
    }
    if (!formData.department.trim()) {
      toast.error("Please select a department");
      return false;
    }
    if (!formData.requestedFor.trim()) {
      toast.error("Please enter who this is requested for");
      return false;
    }
    if (!formData.justification.trim()) {
      toast.error("Please provide justification");
      return false;
    }
    if (!formData.budgetCode.trim() || formData.budgetCode === "") {
      toast.error("Please select a budget code");
      return false;
    }
    if (formData.categoryId === "OTHER" && !formData.otherCategoryText.trim()) {
      toast.error("Please specify the custom category name");
      return false;
    }
    return true;
  };

  // Populate form when editing
  useEffect(() => {
    if (isEditing && editingRequisition && open) {
      setFormData({
        title: editingRequisition.title || "",
        department: editingRequisition.department || "",
        departmentId: editingRequisition.departmentId || "",
        priority: editingRequisition.priority || "medium",
        requestedFor: editingRequisition.requestedFor || "",
        justification: editingRequisition.description || "",
        budgetCode: editingRequisition.budgetCode || "N/A",
        sourceOfFunds: editingRequisition.sourceOfFunds || "",
        costCenter: editingRequisition.costCenter || "",
        projectCode: editingRequisition.projectCode || "",
        currency: editingRequisition.currency || "ZMW",
        isEstimate: editingRequisition.isEstimate || false,
        requiredByDate: editingRequisition.requiredByDate
          ? new Date(editingRequisition.requiredByDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: editingRequisition.items || [],
        categoryId: editingRequisition.categoryId || "OTHER",
        otherCategoryText: editingRequisition.otherCategoryText || "",
        attachments:
          editingRequisition.attachments ||
          (editingRequisition.metadata
            ?.attachments as RequisitionAttachment[]) ||
          [],
      });
      setStep(initialStep);
    } else if (!isEditing && open) {
      resetForm();
    }
  }, [isEditing, editingRequisition, open, initialStep]);

  const totalAmount = formData.items.reduce(
    (sum, item) =>
      sum + (item.amount || (item.estimatedCost || 0) * item.quantity),
    0,
  );

  const handleAddItem = () => {
    const newItem: RequisitionItem = {
      id: Date.now().toString(),
      description: "",
      itemDescription: "", // Alias
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      estimatedCost: 0, // Alias
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleUpdateItem = (
    itemId: string,
    field: keyof RequisitionItem,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Calculate amount when quantity or estimatedCost changes
          if (field === "quantity" || field === "estimatedCost") {
            updatedItem.amount =
              updatedItem.quantity * (updatedItem.estimatedCost || 0);
            updatedItem.unitPrice = updatedItem.estimatedCost || 0;
          }

          // Ensure description is set from itemDescription
          if (field === "itemDescription") {
            updatedItem.description = value;
          }

          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const MAX_ATTACHMENTS = 5;
  const ACCEPTED_ATTACHMENT_TYPES =
    "application/pdf,image/jpeg,image/png,image/webp";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      toast.error("Only PDF and image files (JPG, PNG, WEBP) are allowed");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (formData.attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    setUploadingFile(true);
    try {
      const result = await uploadToImageKit(file, "requisitions/attachments");
      const attachment: RequisitionAttachment = {
        fileId: result.fileId,
        fileName: result.name,
        fileUrl: result.url,
        fileSize: result.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, attachment],
      }));
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.fileId !== fileId),
    }));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a title for the requisition");
      return;
    }
    if (!formData.department.trim()) {
      toast.error("Please select a department");
      return;
    }
    if (!formData.requestedFor.trim()) {
      toast.error("Please enter who this is requested for");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    if (!formData.justification.trim()) {
      toast.error("Please provide justification");
      return;
    }
    if (!formData.budgetCode.trim() || formData.budgetCode === "") {
      toast.error("Please select a budget code");
      return;
    }
    if (formData.categoryId === "OTHER" && !formData.otherCategoryText.trim()) {
      toast.error("Please specify the custom category name");
      return;
    }

    // Validate all items have descriptions and quantities
    const allItemsValid = formData.items.every(
      (item) =>
        (item.itemDescription?.trim() || item.description?.trim()) &&
        item.quantity > 0,
    );
    if (!allItemsValid) {
      toast.error("Please fill in all item details");
      return;
    }

    // Use the appropriate mutation hook based on mode
    if (isEditing && editingRequisition) {
      updateMutation.mutate({
        requisitionId: editingRequisition.id,
        title: formData.title,
        description: formData.justification,
        department: formData.department,
        departmentId: formData.departmentId || formData.department,
        priority: formData.priority,
        items: formData.items,
        totalAmount: totalAmount,
        currency: formData.currency,
        categoryId:
          formData.categoryId === "OTHER"
            ? undefined
            : formData.categoryId || undefined,
        preferredVendorId: undefined,
        isEstimate: formData.isEstimate,
        requiredByDate: formData.requiredByDate,
        budgetCode: formData.budgetCode,
        costCenter: formData.costCenter || formData.budgetCode,
        projectCode: formData.projectCode || formData.budgetCode,
        requestedFor: formData.requestedFor,
        otherCategoryText:
          formData.categoryId === "OTHER"
            ? formData.otherCategoryText
            : undefined,
        attachments:
          formData.attachments.length > 0 ? formData.attachments : undefined,
      });
    } else {
      createMutation.mutate({
        title: formData.title,
        description: formData.justification,
        department: formData.department,
        departmentId: formData.departmentId || formData.department,
        priority: formData.priority,
        items: formData.items,
        totalAmount: totalAmount,
        currency: formData.currency,
        categoryId:
          formData.categoryId === "OTHER"
            ? undefined
            : formData.categoryId || undefined,
        preferredVendorId: undefined,
        isEstimate: formData.isEstimate,
        requiredByDate: formData.requiredByDate,
        budgetCode: formData.budgetCode,
        sourceOfFunds: formData.sourceOfFunds,
        costCenter: formData.costCenter || formData.budgetCode,
        projectCode: formData.projectCode || formData.budgetCode,
        requestedFor: formData.requestedFor,
        otherCategoryText:
          formData.categoryId === "OTHER"
            ? formData.otherCategoryText
            : undefined,
        attachments:
          formData.attachments.length > 0 ? formData.attachments : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl! p-0 flex flex-col h-[90svh] max-h-[90vh]">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="font-bold">
            {isEditing ? "Edit Requisition" : "Create New Requisition"}
          </DialogTitle>

          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-3">
            <button
              type="button"
              onClick={() => setStep("details")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === "details"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${step === "details" ? "bg-primary-foreground/20" : "bg-muted"}`}
              >
                1
              </span>
              Details
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => {
                if (validateDetails()) setStep("items");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === "items"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${step === "items" ? "bg-primary-foreground/20" : "bg-muted"}`}
              >
                2
              </span>
              Items{" "}
              {formData.items.length > 0 && (
                <span className="opacity-70">({formData.items.length})</span>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-4">
          {/* Configuration Checklist Banner - Show if any required configs are missing */}
          {!configStatus.allConfigured && !configStatus.isLoading && (
            <ConfigurationChecklistBanner
              requirements={configStatus.requirements}
              variant="creation"
              title="Complete Required Configurations"
              description="The following configurations must be set up before you can create requisitions:"
            />
          )}

          {/* Loading State */}
          {(budgetsLoading || categoriesLoading || departmentsLoading) && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading form data...</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Details ── */}
          {step === "details" && (
            <>
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Title"
                    required
                    placeholder="Enter requisition title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                  <Input
                    label="Requested For"
                    required
                    placeholder="e.g., John Mwale"
                    value={formData.requestedFor}
                    onChange={(e) =>
                      setFormData({ ...formData, requestedFor: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Department"
                    required
                    isLoading={departmentsLoading}
                    placeholder="Select department"
                    value={formData.department}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        department: value,
                        departmentId: Array.isArray(departments)
                          ? departments.find((d) => d.name === value)?.id ||
                            value
                          : value,
                      })
                    }
                    options={
                      Array.isArray(departments)
                        ? departments.map((department) => ({
                            value: department.name,
                            label: department.name,
                          }))
                        : []
                    }
                  />

                  <SelectField
                    label="Priority"
                    required
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        priority: value as RequisitionPriority,
                      })
                    }
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ]}
                    placeholder="Select priority"
                  />
                </div>

                {/* Category Selection */}
                <div
                  className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", {
                    "sm:grid-cols-2": formData.categoryId === "OTHER",
                  })}
                >
                  <SelectField
                    label="Category"
                    className="w-full"
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        categoryId: value,
                        otherCategoryText: "",
                      })
                    }
                    isLoading={categoriesLoading}
                    options={[
                      ...(Array.isArray(categories)
                        ? categories.map((category) => ({
                            value: category.id,
                            label: category.name,
                          }))
                        : []),
                      { value: "OTHER", label: "Other (specify)" },
                    ]}
                    placeholder="Select a category"
                  />

                  {/* Other Category Text Input */}
                  {formData.categoryId === "OTHER" && (
                    <Input
                      label="Specify Category"
                      required
                      placeholder="Enter custom category name"
                      value={formData.otherCategoryText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          otherCategoryText: e.target.value,
                        })
                      }
                    />
                  )}
                </div>

                <div className="flex gap-4 flex-wrap md:grid grid-cols-3 md:items-end">
                  <SelectField
                    label="Budget Code"
                    required
                    placeholder="Select budget code"
                    isLoading={budgetsLoading}
                    value={formData.budgetCode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, budgetCode: value || "N/A" })
                    }
                    options={[
                      { value: "N/A", label: "N/A" },
                      ...(Array.isArray(budgets)
                        ? budgets.map((budget) => ({
                            value: budget.budgetCode,
                            label: `${budget.budgetCode} - ${budget.name}`,
                          }))
                        : []),
                    ]}
                  />

                  <SelectField
                    label="Currency"
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    options={[
                      { value: "ZMW", label: "ZMW" },
                      { value: "USD", label: "USD" },
                    ]}
                    placeholder="Select currency"
                  />

                  <DatePicker
                    label="Required By Date"
                    value={formData.requiredByDate}
                    onValueChange={(date) =>
                      setFormData({
                        ...formData,
                        requiredByDate: date as Date,
                      })
                    }
                  />
                </div>

                <Input
                  label="Project Code"
                  placeholder="Project code [Optional]"
                  value={formData.projectCode}
                  onChange={(e) =>
                    setFormData({ ...formData, projectCode: e.target.value })
                  }
                />

                <Input
                  label="Source of Funds"
                  placeholder="e.g., Government Grant, Donor Funding, Internal Budget"
                  value={formData.sourceOfFunds}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceOfFunds: e.target.value })
                  }
                />

                <div className="space-y-2">
                  <Textarea
                    id="justification"
                    label="Justification"
                    required
                    placeholder="Explain why these items are needed..."
                    rows={3}
                    value={formData.justification}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        justification: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Supporting Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">
                        Supporting Documents
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Attach invoices, quotes, or receipts (PDF, JPG, PNG).
                        Max 5 files, 5MB each.
                      </p>
                    </div>
                    {formData.attachments.length < MAX_ATTACHMENTS && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 pointer-events-none"
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                          {uploadingFile ? "Uploading..." : "Attach File"}
                        </Button>
                      </label>
                    )}
                  </div>

                  {formData.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {formData.attachments.map((attachment) => (
                        <div
                          key={attachment.fileId}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-foreground/[0.02]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {attachment.mimeType === "application/pdf" ? (
                              <FileText className="h-5 w-5 text-red-500 shrink-0" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(attachment.fileSize)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveAttachment(attachment.fileId)
                            }
                            className="text-muted-foreground hover:text-red-500 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <Paperclip className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
                      <p className="text-muted-foreground text-xs">
                        No documents attached
                      </p>
                    </div>
                  )}

                  {formData.attachments.length >= MAX_ATTACHMENTS && (
                    <p className="text-xs text-amber-600">
                      Maximum number of attachments reached ({MAX_ATTACHMENTS})
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Items ── */}
          {step === "items" && (
            <>
              {/* Items Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Items</h3>

                <div className="rounded-lg border border-border overflow-hidden">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1.75rem_1fr_3.5rem_8rem_6.5rem_1.75rem] gap-x-3 px-3 py-2 bg-muted/60 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      #
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                      Qty
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Unit Cost ({formData.currency})
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Total
                    </span>
                    <span />
                  </div>

                  {/* Item rows */}
                  <div className="divide-y divide-border/60">
                    {formData.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1.75rem_1fr_3.5rem_8rem_6.5rem_1.75rem] gap-x-3 px-3 py-2 items-center hover:bg-muted/20 transition-colors"
                      >
                        {/* # */}
                        <span className="text-xs text-muted-foreground/50 font-mono tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        {/* Description */}
                        <input
                          className="min-w-0 w-full bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 border border-transparent focus:border-border transition-colors"
                          placeholder="Item description…"
                          required
                          value={item.itemDescription || item.description || ""}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id || "",
                              "itemDescription",
                              e.target.value,
                            )
                          }
                        />

                        {/* Qty */}
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-transparent text-sm text-center tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1 py-1 border border-transparent focus:border-border transition-colors"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id || "",
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />

                        {/* Unit cost */}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent text-sm text-right tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1.5 py-1 border border-transparent focus:border-border transition-colors"
                          value={item.estimatedCost || ""}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id || "",
                              "estimatedCost",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />

                        {/* Line total */}
                        <span className="text-sm font-semibold text-right tabular-nums">
                          {(
                            item.quantity * (item.estimatedCost || 0)
                          ).toLocaleString("en-ZM", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id || "")}
                          className="text-muted-foreground/30 hover:text-red-500 transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add item row */}
                    <button
                      type="button"
                      disabled={budgetsLoading || categoriesLoading}
                      onClick={handleAddItem}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add item
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {formData.items.length > 0 && (
                <div className="gradient-primary rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {formData.isEstimate ? "Estimated" : ""} Total Amount
                    </span>
                    <span className="text-2xl font-bold text-white tracking-tight">
                      {formData.currency}{" "}
                      {totalAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 h-10">
                    <Checkbox
                      id="isEstimate"
                      checked={formData.isEstimate}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isEstimate: checked === true,
                        })
                      }
                    />
                    <span className="text-sm italic text-white/60">
                      This is an estimated cost
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="bg-card/5 backdrop-blur-xs shrink-0 flex flex-col-reverse justify-end gap-3 p-4 rounded-b-lg border-t py-6 sm:flex-row sm:py-6">
          {step === "details" ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (validateDetails()) setStep("items");
                }}
                className="gap-2 min-w-32"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("details")}
                className="gap-2"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={createMutation.isPending || updateMutation.isPending}
                loadingText={isEditing ? "Updating..." : "Creating..."}
                className="min-w-32"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !configStatus.allConfigured
                }
              >
                {isEditing ? "Update Requisition" : "Create Requisition"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
