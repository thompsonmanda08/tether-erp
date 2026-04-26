"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Checkbox } from "@/components/ui/checkbox";
import type { WorkflowFormData, WorkflowConditions } from "@/types/workflow-config";

interface WorkflowDetailsFormProps {
  data: WorkflowFormData;
  onChange: (key: keyof WorkflowFormData, value: any) => void;
  errors: Record<string, string>;
}

const DOCUMENT_TYPES = [
  { value: "requisition", name: "Requisition" },
  { value: "purchase_order", name: "Purchase Order" },
  { value: "payment_voucher", name: "Payment Voucher" },
  { value: "grn", name: "Goods Received Note" },
  { value: "budget", name: "Budget" },
];

const ROUTING_TYPES = [
  { value: "procurement", name: "Procurement (Standard)" },
  { value: "accounting", name: "Accounting (Direct Payment)" },
];

export function WorkflowDetailsForm({
  data,
  onChange,
  errors,
}: WorkflowDetailsFormProps) {
  const entityType = data.entityType || data.documentType;
  const isRequisition = entityType === "requisition";
  const conditions = data.conditions || {};

  const updateConditions = (updates: Partial<WorkflowConditions>) => {
    onChange("conditions", { ...conditions, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <Input
            label="Workflow Name"
            required
            placeholder="e.g., Standard Requisition Approval"
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""}
            isInvalid={!!errors.name}
            errorText={errors.name}
          />

          {/* Document Type */}
          <SelectField
            label="Workflow Applies To"
            required
            placeholder="Select document type"
            value={entityType}
            onValueChange={(value) => {
              onChange("entityType", value);
              onChange("documentType", value); // Keep both for compatibility
              // Reset conditions when switching entity types
              if (value !== "requisition") {
                onChange("conditions", undefined);
              }
            }}
            options={DOCUMENT_TYPES}
            isInvalid={!!errors.entityType || !!errors.documentType}
            errorText={errors.entityType || errors.documentType}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Describe the purpose and use case for this workflow..."
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={3}
        />

        {/* Set as Default */}
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <Checkbox
            id="isDefault"
            checked={data.isDefault}
            onCheckedChange={(checked) => onChange("isDefault", checked)}
          />
          <label
            htmlFor="isDefault"
            className="text-sm font-medium cursor-pointer"
          >
            Set as default workflow for{" "}
            {entityType
              ? DOCUMENT_TYPES.find((t) => t.value === entityType)?.name
              : "selected document type"}
          </label>
        </div>

        {/* Routing & Automation Config - Only for Requisition workflows */}
        {isRequisition && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-sm font-semibold">Routing & Automation</h3>

            {/* Routing Type */}
            <SelectField
              label="Routing Type"
              placeholder="Select routing type"
              value={conditions.routingType || "procurement"}
              onValueChange={(value) =>
                updateConditions({ routingType: value as "procurement" | "accounting" })
              }
              options={ROUTING_TYPES}
            />

            {conditions.routingType === "accounting" && (
              <div className="space-y-4 pl-2 border-l-2 border-amber-300 ml-1">
                {/* Auto-Approve */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="autoApprove"
                    checked={conditions.autoApprove || false}
                    onCheckedChange={(checked) =>
                      updateConditions({ autoApprove: !!checked })
                    }
                  />
                  <label
                    htmlFor="autoApprove"
                    className="text-sm cursor-pointer"
                  >
                    Enable auto-approval for eligible requisitions
                  </label>
                </div>

                {conditions.autoApprove && (
                  <div className="space-y-3 pl-6">
                    <Input
                      label="Max Amount for Auto-Approval"
                      type="number"
                      placeholder="e.g., 5000"
                      value={conditions.autoApprovalMaxAmount?.toString() || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateConditions({
                          autoApprovalMaxAmount: val ? parseFloat(val) : undefined,
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no limit. Requisitions exceeding this
                      amount will go through normal approval stages.
                    </p>
                  </div>
                )}

                {/* Auto-Generate PO */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="autoGeneratePO"
                    checked={conditions.autoGeneratePO || false}
                    onCheckedChange={(checked) =>
                      updateConditions({ autoGeneratePO: !!checked })
                    }
                  />
                  <label
                    htmlFor="autoGeneratePO"
                    className="text-sm cursor-pointer"
                  >
                    Auto-generate Purchase Order after approval
                  </label>
                </div>

                {conditions.autoGeneratePO && (
                  <div className="flex items-center gap-3 pl-6">
                    <Checkbox
                      id="autoApprovePO"
                      checked={conditions.autoApprovePO || false}
                      onCheckedChange={(checked) =>
                        updateConditions({ autoApprovePO: !!checked })
                      }
                    />
                    <label
                      htmlFor="autoApprovePO"
                      className="text-sm cursor-pointer"
                    >
                      Skip PO approval (create as approved)
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
