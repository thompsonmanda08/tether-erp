"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Checkbox } from "@/components/ui/checkbox";
import { useActiveRoles } from "@/hooks/use-role-queries";
import type { WorkflowStage } from "@/types/workflow-config";

interface StageFormProps {
  stage?: WorkflowStage | null;
  onSave: (stage: WorkflowStage) => void;
  onCancel: () => void;
  errors: Record<string, string>;
}

export function StageForm({ stage, onSave, onCancel, errors }: StageFormProps) {
  // Fetch roles from backend
  const { data: roles = [], isLoading: rolesLoading } = useActiveRoles();


  const [formData, setFormData] = useState<WorkflowStage>(() => {
    if (stage) {
      // Use existing stage data for editing
      const initialData = {
        id: stage.id || "",
        order: stage.order || stage.stageNumber || 1,
        name: stage.name || stage.stageName || "",
        description: stage.description || "",
        approverRole: stage.approverRole || stage.requiredRole || "",
        requiredApprovals: stage.requiredApprovals || 1,
        canReject: stage.canReject !== undefined ? stage.canReject : true,
        canReassign: stage.canReassign !== undefined ? stage.canReassign : true,
        stageNumber: stage.stageNumber || stage.order || 1,
        stageName: stage.stageName || stage.name || "",
        requiredRole: stage.requiredRole || stage.approverRole || "",
        canBeReassigned:
          stage.canBeReassigned !== undefined ? stage.canBeReassigned : true,
      };

      return initialData;
    } else {
      // Default data for new stage
      return {
        id: "",
        order: 1,
        name: "",
        description: "",
        approverRole: "" as any,
        requiredApprovals: 1,
        canReject: true,
        canReassign: true,
        stageNumber: 1,
        stageName: "",
        requiredRole: "",
        canBeReassigned: true,
      };
    }
  });

  // When roles load, normalize any legacy system role UUID → name in the form
  useEffect(() => {
    if (!roles.length) return;
    const rawRole = formData.approverRole as string;
    if (!rawRole) return;
    // If the stored value is a system role's UUID, convert to its name
    const matched = roles.find((r) => r.id === rawRole && r.isDefault);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        approverRole: matched.name as any,
        requiredRole: matched.name,
      }));
    }
  }, [roles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update form data when stage prop changes (important for editing)
  useEffect(() => {
    if (stage) {
      const updatedData = {
        id: stage.id || "",
        order: stage.order || stage.stageNumber || 1,
        name: stage.name || stage.stageName || "",
        description: stage.description || "",
        approverRole: stage.approverRole || stage.requiredRole || "",
        requiredApprovals: stage.requiredApprovals || 1,
        canReject: stage.canReject !== undefined ? stage.canReject : true,
        canReassign: stage.canReassign !== undefined ? stage.canReassign : true,
        stageNumber: stage.stageNumber || stage.order || 1,
        stageName: stage.stageName || stage.name || "",
        requiredRole: stage.requiredRole || stage.approverRole || "",
        canBeReassigned:
          stage.canBeReassigned !== undefined ? stage.canBeReassigned : true,
      };

      setFormData(updatedData);
    }
  }, [stage]);

  const handleChange = (key: keyof WorkflowStage, value: any) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [key]: value,
      };

      // Ensure consistency between name/stageName and approverRole/requiredRole
      if (key === "name") {
        updated.stageName = value;
      } else if (key === "stageName") {
        updated.name = value;
      } else if (key === "approverRole") {
        updated.requiredRole = value;
      } else if (key === "requiredRole") {
        updated.approverRole = value;
      }

      return updated;
    });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Stage Name */}
      <Input
        label="Stage Name"
        required
        placeholder="e.g., Department Manager Review"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        className={errors.name ? "border-destructive" : ""}
        isInvalid={!!errors.name}
        errorText={errors.name}
      />

      {/* Description */}
      <Textarea
        label="Description"
        placeholder="Describe what this stage is responsible for..."
        value={formData.description}
        onChange={(e) => handleChange("description", e.target.value)}
        rows={2}
      />

      {/* Approver Role */}
      <SelectField
        label="Approver Role"
        required
        placeholder="Select approver role"
        value={formData.approverRole}
        onValueChange={(value) => handleChange("approverRole", value)}
        isLoading={rolesLoading}
        isInvalid={!!errors.approverRole}
        errorText={errors.approverRole}
        options={roles.map((role) => ({
          // System roles (isDefault=true) are stored by name — stable across DB resets.
          // Custom org roles are stored by UUID — stable per org.
          value: role.isDefault ? role.name : role.id,
          label: role.name,
        }))}
      />

      {/* Required Approvals */}
      <SelectField
        label="Required Approvals"
        required
        placeholder="Select number of approvals"
        value={String(formData.requiredApprovals)}
        onValueChange={(value) =>
          handleChange("requiredApprovals", parseInt(value))
        }
        isInvalid={!!errors.requiredApprovals}
        errorText={errors.requiredApprovals}
        options={[
          { value: "1", label: "1 Approval" },
          { value: "2", label: "2 Approvals" },
          { value: "3", label: "3 Approvals" },
          { value: "5", label: "All Approvals" },
        ]}
      />

      {/* Permissions */}
      <div className="space-y-3 border-t pt-4">
        <label className="text-sm font-medium">Stage Permissions</label>

        <div className="flex items-center gap-3">
          <Checkbox
            id="canReject"
            checked={formData.canReject}
            onCheckedChange={(checked) => handleChange("canReject", checked)}
          />
          <label htmlFor="canReject" className="text-sm cursor-pointer">
            Approvers can reject documents
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="canReassign"
            checked={formData.canReassign}
            onCheckedChange={(checked) => handleChange("canReassign", checked)}
          />
          <label htmlFor="canReassign" className="text-sm cursor-pointer">
            Approvers can reassign to others
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {stage ? "Update Stage" : "Add Stage"}
        </Button>
      </div>
    </div>
  );
}
