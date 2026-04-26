"use client";

import { useState, useMemo } from "react";
import { WorkflowStage } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

export interface WorkflowStageFormProps {
  stage: WorkflowStage;
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  requiresSignature?: boolean;
  isLoading?: boolean;
}

export function WorkflowStageForm({
  stage,
  onSubmit,
  onCancel,
  requiresSignature = false,
  isLoading = false,
}: WorkflowStageFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Parse stage requirements/fields from metadata
  const requiredFields = useMemo(() => {
    const fields: Array<{
      name: string;
      label: string;
      type: "text" | "textarea" | "email" | "number";
      required: boolean;
      placeholder?: string;
    }> = [];

    if ((stage as any).requiresRemarks) {
      fields.push({
        name: "remarks",
        label: "Approval Remarks",
        type: "textarea",
        required: true,
        placeholder: "Please provide your comments on this approval",
      });
    }

    if ((stage as any).requiresAttachments) {
      fields.push({
        name: "attachments",
        label: "Supporting Documents",
        type: "text",
        required: true,
        placeholder: "Attach relevant documents (not yet implemented)",
      });
    }

    if ((stage as any).customFields && Array.isArray((stage as any).customFields)) {
      ((stage as any).customFields as any[]).forEach((field: any) => {
        fields.push({
          name: field.name || "custom_field",
          label: field.label || "Field",
          type: field.type || "text",
          required: field.required || false,
          placeholder: field.placeholder,
        });
      });
    }

    // Always include a notes field if no other fields
    if (fields.length === 0) {
      fields.push({
        name: "notes",
        label: "Additional Notes",
        type: "textarea",
        required: false,
        placeholder: "Optional notes about this stage action",
      });
    }

    return fields;
  }, [stage]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setTouched((prev) => new Set(prev).add(fieldName));
  };

  const handleBlur = (fieldName: string) => {
    setTouched((prev) => new Set(prev).add(fieldName));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    requiredFields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        errors.push(`${field.label} is required`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit form"
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          {stage.stageName}
        </CardTitle>
        <CardDescription>{stage.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Info */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-200">
              Complete the following information to proceed with this approval stage.
              {requiresSignature && " Your digital signature will be required to confirm."}
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {requiredFields.map((field) => {
              const isTouched = touched.has(field.name);
              const hasValue = !!formData[field.name];
              const isInvalid =
                field.required &&
                isTouched &&
                !hasValue;

              return (
                <div key={field.name}>
                  {field.type === "textarea" ? (
                    <Textarea
                      label={field.label}
                      required={field.required}
                      id={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      onBlur={() => handleBlur(field.name)}
                      disabled={isLoading}
                      className={`${
                        isInvalid
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      } resize-none`}
                      rows={4}
                    />
                  ) : (
                    <Input
                      label={field.label}
                      required={field.required}
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      onBlur={() => handleBlur(field.name)}
                      disabled={isLoading}
                      className={
                        isInvalid
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    />
                  )}

                  {isInvalid && (
                    <p className="text-xs text-red-600 font-medium">
                      {field.label} is required
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Field Counter */}
          {requiredFields.filter((f) => f.required).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {requiredFields.map((field) => (
                <Badge
                  key={field.name}
                  variant={
                    field.required && formData[field.name]
                      ? "default"
                      : "outline"
                  }
                >
                  {field.required && formData[field.name] ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {field.label}
                    </>
                  ) : (
                    field.label
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              isLoading={isLoading}
              loadingText="Processing..."
            >
              Continue to Next Stage
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
