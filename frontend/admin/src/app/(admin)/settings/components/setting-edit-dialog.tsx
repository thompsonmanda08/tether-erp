"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  Settings,
  Shield,
  Zap,
  Link,
  Bell,
  Palette,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { SystemSetting } from "@/app/_actions/settings";

interface SettingEditDialogProps {
  setting?: SystemSetting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    setting: Omit<
      SystemSetting,
      "id" | "created_at" | "updated_at" | "created_by" | "updated_by"
    >,
  ) => void;
  isLoading?: boolean;
}

export function SettingEditDialog({
  setting,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: SettingEditDialogProps) {
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    type: "string" as SystemSetting["type"],
    category: "general" as SystemSetting["category"],
    description: "",
    default_value: "",
    is_required: false,
    is_secret: false,
    environment: "all" as SystemSetting["environment"],
    validation: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
      pattern: "",
      options: [] as string[],
    },
  });

  const [showValue, setShowValue] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [optionsInput, setOptionsInput] = useState("");

  const isEditing = !!setting;

  const categories = [
    { value: "general", label: "General" },
    { value: "security", label: "Security" },
    { value: "performance", label: "Performance" },
    { value: "integration", label: "Integration" },
    { value: "notification", label: "Notification" },
    { value: "ui", label: "User Interface" },
  ];

  const types = [
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" },
    { value: "array", label: "Array" },
  ];

  const environments = [
    { value: "all", label: "All Environments" },
    { value: "production", label: "Production" },
    { value: "staging", label: "Staging" },
    { value: "development", label: "Development" },
  ];

  useEffect(() => {
    if (setting) {
      setFormData({
        key: setting.key,
        value: setting.value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        default_value: setting.default_value,
        is_required: setting.is_required,
        is_secret: setting.is_secret,
        environment: setting.environment,
        validation: {
          min: setting.validation?.min,
          max: setting.validation?.max,
          pattern: setting.validation?.pattern || "",
          options: setting.validation?.options || [],
        },
      });
      setOptionsInput(setting.validation?.options?.join(", ") || "");
      setShowValue(!setting.is_secret);
    } else {
      setFormData({
        key: "",
        value: "",
        type: "string",
        category: "general",
        description: "",
        default_value: "",
        is_required: false,
        is_secret: false,
        environment: "all",
        validation: {
          min: undefined,
          max: undefined,
          pattern: "",
          options: [],
        },
      });
      setOptionsInput("");
      setShowValue(true);
    }
    setValidationErrors({});
  }, [setting, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleValidationChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      validation: {
        ...prev.validation,
        [field]: value,
      },
    }));
  };

  const handleOptionsChange = (value: string) => {
    setOptionsInput(value);
    const options = value
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
    handleValidationChange("options", options);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.key.trim()) {
      errors.key = "Setting key is required";
    } else if (!/^[a-zA-Z][a-zA-Z0-9._]*$/.test(formData.key)) {
      errors.key =
        "Key must start with a letter and contain only letters, numbers, dots, and underscores";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (formData.type === "number") {
      if (formData.value && isNaN(Number(formData.value))) {
        errors.value = "Value must be a valid number";
      }
      if (formData.default_value && isNaN(Number(formData.default_value))) {
        errors.default_value = "Default value must be a valid number";
      }
    }

    if (formData.type === "boolean") {
      if (
        formData.value &&
        !["true", "false"].includes(formData.value.toLowerCase())
      ) {
        errors.value = "Value must be true or false";
      }
      if (
        formData.default_value &&
        !["true", "false"].includes(formData.default_value.toLowerCase())
      ) {
        errors.default_value = "Default value must be true or false";
      }
    }

    if (formData.type === "json") {
      if (formData.value) {
        try {
          JSON.parse(formData.value);
        } catch {
          errors.value = "Value must be valid JSON";
        }
      }
      if (formData.default_value) {
        try {
          JSON.parse(formData.default_value);
        } catch {
          errors.default_value = "Default value must be valid JSON";
        }
      }
    }

    if (formData.type === "array") {
      if (formData.value) {
        try {
          const parsed = JSON.parse(formData.value);
          if (!Array.isArray(parsed)) {
            errors.value = "Value must be a valid JSON array";
          }
        } catch {
          errors.value = "Value must be a valid JSON array";
        }
      }
      if (formData.default_value) {
        try {
          const parsed = JSON.parse(formData.default_value);
          if (!Array.isArray(parsed)) {
            errors.default_value = "Default value must be a valid JSON array";
          }
        } catch {
          errors.default_value = "Value must be a valid JSON array";
        }
      }
    }

    if (
      formData.validation.min !== undefined &&
      formData.validation.max !== undefined
    ) {
      if (formData.validation.min > formData.validation.max) {
        errors.validation =
          "Minimum value cannot be greater than maximum value";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const settingData = {
      ...formData,
      validation: {
        ...formData.validation,
        min: formData.validation.min || undefined,
        max: formData.validation.max || undefined,
        pattern: formData.validation.pattern || undefined,
        options:
          formData.validation.options.length > 0
            ? formData.validation.options
            : undefined,
      },
    };

    const hasValidation =
      settingData.validation.min ||
      settingData.validation.max ||
      settingData.validation.pattern ||
      (settingData.validation.options &&
        settingData.validation.options.length > 0);

    const finalSettingData = {
      ...settingData,
      ...(hasValidation ? { validation: settingData.validation } : {}),
    };

    onSave(finalSettingData);
  };

  const resetToDefault = () => {
    setFormData((prev) => ({
      ...prev,
      value: prev.default_value,
    }));
  };

  const selectedCategory = categories.find(
    (cat) => cat.value === formData.category,
  );

  // Pick an icon for the dialog title based on category
  const categoryIconMap: Record<string, React.ElementType> = {
    general: Settings,
    security: Shield,
    performance: Zap,
    integration: Link,
    notification: Bell,
    ui: Palette,
  };
  const CategoryIcon = categoryIconMap[formData.category] || Settings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            {isEditing ? "Edit Setting" : "Create Setting"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the system setting configuration."
              : "Create a new system setting configuration."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="key"
                label="Setting Key"
                required
                value={formData.key}
                onChange={(e) => handleInputChange("key", e.target.value)}
                placeholder="e.g., app.session_timeout"
                disabled={isEditing}
                isInvalid={!!validationErrors.key}
                errorText={validationErrors.key}
              />

              <SelectField
                label="Type"
                required
                value={formData.type}
                onValueChange={(value) => handleInputChange("type", value)}
                options={types}
                classNames={{ wrapper: "max-w-full" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Describe what this setting controls..."
                className={cn(validationErrors.description && "border-red-500")}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-600">
                  {validationErrors.description}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Value Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Value Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Current Value — label has a Reset button so we keep it separate */}
              <div className="space-y-2">
                <Label htmlFor="value" className="flex items-center gap-2">
                  Current Value
                  {formData.default_value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetToDefault}
                      className="h-6 px-2 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </Label>
                <div className="relative">
                  {formData.type === "json" || formData.type === "array" ? (
                    <Textarea
                      id="value"
                      value={formData.value}
                      onChange={(e) =>
                        handleInputChange("value", e.target.value)
                      }
                      placeholder={
                        formData.type === "json"
                          ? '{"key": "value"}'
                          : '["item1", "item2"]'
                      }
                      className={cn(
                        "font-mono text-sm",
                        validationErrors.value && "border-red-500",
                        formData.is_secret &&
                          !showValue &&
                          "text-security-disc",
                      )}
                    />
                  ) : (
                    <Input
                      id="value"
                      type={
                        formData.is_secret && !showValue ? "password" : "text"
                      }
                      value={formData.value}
                      onChange={(e) =>
                        handleInputChange("value", e.target.value)
                      }
                      placeholder={
                        formData.type === "boolean"
                          ? "true or false"
                          : formData.type === "number"
                            ? "123"
                            : "Enter value..."
                      }
                      isInvalid={!!validationErrors.value}
                      errorText={validationErrors.value}
                    />
                  )}
                  {formData.is_secret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValue(!showValue)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      {showValue ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                {(formData.type === "json" || formData.type === "array") &&
                  validationErrors.value && (
                    <p className="text-sm text-red-600">
                      {validationErrors.value}
                    </p>
                  )}
              </div>

              {/* Default Value */}
              <div className="space-y-2">
                <Label htmlFor="default_value">Default Value</Label>
                {formData.type === "json" || formData.type === "array" ? (
                  <Textarea
                    id="default_value"
                    value={formData.default_value}
                    onChange={(e) =>
                      handleInputChange("default_value", e.target.value)
                    }
                    placeholder={
                      formData.type === "json"
                        ? '{"key": "value"}'
                        : '["item1", "item2"]'
                    }
                    className={cn(
                      "font-mono text-sm",
                      validationErrors.default_value && "border-red-500",
                    )}
                  />
                ) : (
                  <Input
                    id="default_value"
                    value={formData.default_value}
                    onChange={(e) =>
                      handleInputChange("default_value", e.target.value)
                    }
                    placeholder={
                      formData.type === "boolean"
                        ? "true or false"
                        : formData.type === "number"
                          ? "123"
                          : "Enter default value..."
                    }
                    isInvalid={!!validationErrors.default_value}
                    errorText={validationErrors.default_value}
                  />
                )}
                {(formData.type === "json" || formData.type === "array") &&
                  validationErrors.default_value && (
                    <p className="text-sm text-red-600">
                      {validationErrors.default_value}
                    </p>
                  )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Category"
                value={formData.category}
                onValueChange={(value) =>
                  handleInputChange("category", value)
                }
                options={categories}
                classNames={{ wrapper: "max-w-full" }}
              />

              <SelectField
                label="Environment"
                value={formData.environment}
                onValueChange={(value) =>
                  handleInputChange("environment", value)
                }
                options={environments}
                classNames={{ wrapper: "max-w-full" }}
              />
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_required", checked)
                  }
                />
                <Label
                  htmlFor="is_required"
                  className="flex items-center gap-1"
                >
                  Required Setting
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_secret"
                  checked={formData.is_secret}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_secret", checked)
                  }
                />
                <Label htmlFor="is_secret" className="flex items-center gap-1">
                  Secret Setting
                  <Eye className="h-3 w-3 text-amber-500" />
                </Label>
              </div>
            </div>
          </div>

          {/* Validation Rules */}
          {(formData.type === "string" || formData.type === "number") && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Validation Rules</h3>

                {formData.type === "number" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="min"
                      label="Minimum Value"
                      type="number"
                      value={formData.validation.min || ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "min",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="No minimum"
                    />
                    <Input
                      name="max"
                      label="Maximum Value"
                      type="number"
                      value={formData.validation.max || ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "max",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="No maximum"
                    />
                  </div>
                )}

                {formData.type === "string" && (
                  <>
                    <Input
                      name="pattern"
                      label="Validation Pattern (Regex)"
                      value={formData.validation.pattern || ""}
                      onChange={(e) =>
                        handleValidationChange("pattern", e.target.value)
                      }
                      placeholder="e.g., ^[a-zA-Z0-9]+$"
                      classNames={{ input: "font-mono text-sm" }}
                    />

                    <div className="space-y-2">
                      <Input
                        name="options"
                        label="Allowed Values (comma-separated)"
                        value={optionsInput}
                        onChange={(e) => handleOptionsChange(e.target.value)}
                        placeholder="e.g., option1, option2, option3"
                      />
                      {formData.validation.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {formData.validation.options.map((option, index) => (
                            <Badge key={index} variant="secondary">
                              {option}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {validationErrors.validation && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors.validation}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {/* Warnings */}
          {formData.is_required && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This setting is marked as required. The system may not function
                properly if this setting is not configured.
              </AlertDescription>
            </Alert>
          )}

          {formData.is_secret && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This setting is marked as secret. Its value will be hidden in
                the UI and encrypted in storage.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            isLoading={isLoading}
            loadingText="Saving..."
          >
            {isEditing ? "Update Setting" : "Create Setting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
