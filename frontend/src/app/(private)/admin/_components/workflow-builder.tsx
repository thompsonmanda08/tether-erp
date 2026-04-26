"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, ArrowRight } from "lucide-react";
import type { WorkflowFormData, WorkflowStage } from "@/types/workflow-config";
import { WorkflowDetailsForm } from "./workflow-details-form";
import { StageForm } from "./workflow-stage-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StageItem } from "./workflow-stage-item";
import { toast } from "sonner";

interface WorkflowBuilderProps {
  onSubmit: (data: WorkflowFormData) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  initialData?: WorkflowFormData;
}

export function WorkflowBuilder({
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: WorkflowBuilderProps) {
  const [formData, setFormData] = useState<WorkflowFormData>(() => {
    const defaultData = {
      name: "",
      description: "",
      entityType: "requisition",
      documentType: "requisition", // Keep for compatibility
      stages: [],
      isDefault: false,
      isActive: true,
    };

    if (initialData) {
      // Ensure all stages have proper IDs
      const stagesWithIds =
        initialData.stages?.map((stage, index) => ({
          ...stage,
          id: stage.id || `stage-${Date.now()}-${index}`,
          order: stage.order || stage.stageNumber || index + 1,
          stageNumber: stage.stageNumber || stage.order || index + 1,
        })) || [];

      // Ensure both entityType and documentType are set for compatibility
      // Also normalize to lowercase to match backend expectations
      const rawEntityType =
        initialData.entityType || initialData.documentType || "requisition";
      const entityType = rawEntityType.toLowerCase();

      return {
        ...defaultData,
        ...initialData,
        entityType: entityType,
        documentType: entityType, // Keep both for compatibility
        stages: stagesWithIds,
      };
    }

    return defaultData;
  });
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageErrors, setStageErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formData.stages.findIndex((s) => s.id === active.id);
      const newIndex = formData.stages.findIndex((s) => s.id === over.id);

      const newStages = arrayMove(formData.stages, oldIndex, newIndex).map(
        (stage, idx) => ({
          ...stage,
          order: idx + 1,
        })
      );

      setFormData({ ...formData, stages: newStages });
    }
  };

  const handleAddStage = () => {
    if (formData.stages.length >= 5) {
      toast.error("Maximum 5 stages allowed per workflow");
      return;
    }
    setEditingStageId(null);
    setShowStageDialog(true);
  };

  const handleEditStage = (stageId: string) => {
    const stageToEdit = formData.stages.find((s) => s.id === stageId);

    setEditingStageId(stageId);
    setShowStageDialog(true);
  };

  const handleDeleteStage = (stageId: string) => {
    const newStages = formData.stages
      .filter((s) => s.id !== stageId)
      .map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));
    setFormData({ ...formData, stages: newStages });
    toast.success("Stage removed");
  };

  const handleSaveStage = (stage: WorkflowStage) => {
    const errors = validateStage(stage);
    if (Object.keys(errors).length > 0) {
      setStageErrors(errors);
      return;
    }

    // Ensure consistency between alias fields with proper defaults
    const normalizedStage: WorkflowStage = {
      ...stage,
      name: stage.name || stage.stageName || "",
      stageName: stage.stageName || stage.name || "",
      approverRole: stage.approverRole || stage.requiredRole || "",
      requiredRole: stage.requiredRole || stage.approverRole || "",
      order: stage.order || stage.stageNumber || 1,
      stageNumber: stage.stageNumber || stage.order || 1,
    };

    if (editingStageId) {
      const updatedStages = formData.stages.map((s) =>
        s.id === editingStageId ? { ...normalizedStage, id: editingStageId } : s
      );
      setFormData({ ...formData, stages: updatedStages });
      toast.success("Stage updated");
    } else {
      const newStage: WorkflowStage = {
        ...normalizedStage,
        id: `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: formData.stages.length + 1,
        stageNumber: formData.stages.length + 1,
      };
      setFormData({
        ...formData,
        stages: [...formData.stages, newStage],
      });
      toast.success("Stage added");
    }

    setShowStageDialog(false);
    setEditingStageId(null);
    setStageErrors({});
  };

  const validateStage = (stage: WorkflowStage): Record<string, string> => {
    const errors: Record<string, string> = {};

    const stageName = stage.name || stage.stageName || "";
    const approverRole = stage.approverRole || stage.requiredRole || "";
    const requiredApprovals = stage.requiredApprovals || 1;

    if (!stageName.trim()) {
      errors.name = "Stage name is required";
    }
    if (!approverRole.toString().trim()) {
      errors.approverRole = "Approver role is required";
    }
    if (requiredApprovals < 1) {
      errors.requiredApprovals = "At least 1 approval is required";
    }

    return errors;
  };

  const handleFormChange = (key: keyof WorkflowFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (formErrors[key]) {
      const newErrors = { ...formErrors };
      delete newErrors[key];
      setFormErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Workflow name is required";
    }
    if (!formData.entityType && !formData.documentType) {
      errors.entityType = "Document type is required";
    }
    // Allow 0 stages when auto-approve is enabled (accounting workflow)
    const hasAutoApprove = formData.conditions?.autoApprove === true;
    if (formData.stages.length === 0 && !hasAutoApprove) {
      errors.stages = "At least one stage is required (or enable auto-approval)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    await onSubmit(formData);
  };

  const handleCloseDialog = () => {
    setShowStageDialog(false);
    setEditingStageId(null);
    setStageErrors({});
  };

  const editingStage = editingStageId
    ? formData.stages.find((s) => s.id === editingStageId)
    : null;

  return (
    <div className="space-y-6">
      {/* Workflow Details */}
      <WorkflowDetailsForm
        data={formData}
        onChange={handleFormChange}
        errors={formErrors}
      />

      {/* Stages Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Approval Stages</CardTitle>
          <Button onClick={handleAddStage} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Stage
          </Button>
        </CardHeader>
        <CardContent>
          {formData.stages.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No stages added yet. Create your first approval stage.
              </p>
              <Button onClick={handleAddStage} variant="outline">
                Add First Stage
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={formData.stages.map(
                  (s) => s.id || `stage-${s.stageNumber || s.order || 0}`
                )}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {formData.stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex flex-col items-center w-full"
                    >
                      <StageItem
                        stage={stage}
                        onEdit={() =>
                          handleEditStage(
                            stage.id ||
                              `stage-${stage.stageNumber || stage.order || 0}`
                          )
                        }
                        onDelete={() =>
                          handleDeleteStage(
                            stage.id ||
                              `stage-${stage.stageNumber || stage.order || 0}`
                          )
                        }
                      />
                      {index < formData.stages.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {formErrors.stages && (
            <p className="text-sm text-destructive mt-4">{formErrors.stages}</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? "Creating..."
            : mode === "create"
              ? "Create Workflow"
              : "Update Workflow"}
        </Button>
      </div>

      {/* Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStageId ? "Edit Stage" : "Add Stage"}
            </DialogTitle>
            <DialogDescription>
              {editingStageId
                ? "Update the stage details"
                : "Create a new approval stage for your workflow"}
            </DialogDescription>
          </DialogHeader>
          <StageForm
            stage={editingStage}
            onSave={handleSaveStage}
            onCancel={handleCloseDialog}
            errors={stageErrors}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
