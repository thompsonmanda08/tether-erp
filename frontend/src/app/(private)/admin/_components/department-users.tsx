"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Department } from "@/types/department";
import { createDepartment, updateDepartment } from "@/app/_actions/config-actions";
import { QUERY_KEYS } from "@/lib/constants";

interface CreateOrUpdateDepartmentProps {
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
  initialData: Department | null;
  departmentId?: string;
  setInitialData: (data: Department | null) => void;
}

export function CreateOrUpdateDepartment({
  openModal,
  setOpenModal,
  initialData,
  departmentId,
  setInitialData,
}: CreateOrUpdateDepartmentProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager_name: "",
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code,
        description: initialData.description || "",
        manager_name: initialData.manager_name || "",
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        manager_name: "",
        is_active: true,
      });
    }
  }, [initialData, openModal]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (initialData && departmentId) {
        return await updateDepartment({
          id: departmentId,
          name: data.name,
          code: data.code,
          description: data.description,
          manager_name: data.manager_name,
          is_active: data.is_active,
          created_at: initialData.created_at,
          updated_at: new Date().toISOString(),
        } as Department);
      } else {
        const now = new Date().toISOString();
        return await createDepartment({
          id: `dept-${Date.now()}`,
          name: data.name,
          code: data.code,
          description: data.description,
          manager_name: data.manager_name,
          is_active: data.is_active,
          created_at: now,
          updated_at: now,
        } as Department);
      }
    },
    onSuccess: () => {
      toast.success(
        initialData ? "Department updated successfully" : "Department created successfully"
      );
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEPARTMENTS] });
      setOpenModal(false);
      setInitialData(null);
    },
    onError: (error) => {
      toast.error("Failed to save department");
      console.error("Error saving department:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.manager_name.trim()) {
      toast.error("Name, code, and manager name are required");
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Department" : "Create New Department"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update department information"
              : "Add a new department to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            required
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Enter department name"
            disabled={mutation.isPending}
          />

          <Input
            label="Department Code"
            required
            id="code"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
            placeholder="Enter department code"
            disabled={mutation.isPending}
          />

          <Input
            label="Manager Name"
            id="manager_name"
            value={formData.manager_name}
            onChange={(e) =>
              setFormData({ ...formData, manager_name: e.target.value })
            }
            placeholder="Enter manager name"
            disabled={mutation.isPending}
          />

          <Textarea
            label="Description"
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter department description"
            disabled={mutation.isPending}
            rows={4}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpenModal(false);
                setInitialData(null);
              }}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} isLoading={mutation.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
