"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Department,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "@/app/_actions/departments";

const INITIAL_FORM_STATE: CreateDepartmentRequest & { is_active: boolean } = {
  name: "",
  code: "",
  description: "",
  manager_name: "",
  is_active: true,
};

export default function DepartmentsConfig() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<
    CreateDepartmentRequest & { is_active: boolean }
  >(INITIAL_FORM_STATE);
  const [error, setError] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    deptId: string | null;
  }>({
    open: false,
    deptId: null,
  });
  const [restoreConfirm, setRestoreConfirm] = useState<{
    open: boolean;
    deptId: string | null;
  }>({
    open: false,
    deptId: null,
  });

  // Fetch departments
  const {
    data: departmentsResponse,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["all-departments"],
    queryFn: () => getAllDepartments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const departments = departmentsResponse?.success
    ? departmentsResponse.data || []
    : [];

  // Create department mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateDepartmentRequest) => createDepartment(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Department created successfully");
        queryClient.invalidateQueries({ queryKey: ["all-departments"] });
        queryClient.invalidateQueries({ queryKey: ["active-departments"] });
        handleCloseModal();
      } else {
        setError(response.message || "Failed to create department");
        toast.error(response.message || "Failed to create department");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error(error.message || "Failed to create department");
    },
  });

  // Update department mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateDepartmentRequest) => updateDepartment(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Department updated successfully");
        queryClient.invalidateQueries({ queryKey: ["all-departments"] });
        queryClient.invalidateQueries({ queryKey: ["active-departments"] });
        handleCloseModal();
      } else {
        setError(response.message || "Failed to update department");
        toast.error(response.message || "Failed to update department");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error(error.message || "Failed to update department");
    },
  });

  // Delete department mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Department deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["all-departments"] });
        queryClient.invalidateQueries({ queryKey: ["active-departments"] });
      } else {
        toast.error(response.message);
      }
      setDeleteConfirm({ open: false, deptId: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
      setDeleteConfirm({ open: false, deptId: null });
    },
  });

  // Restore department mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreDepartment(id),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Department restored successfully");
        queryClient.invalidateQueries({ queryKey: ["all-departments"] });
        queryClient.invalidateQueries({ queryKey: ["active-departments"] });
      } else {
        toast.error(response.message);
      }
      setRestoreConfirm({ open: false, deptId: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore department");
      setRestoreConfirm({ open: false, deptId: null });
    },
  });

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setError("");
    setEditingDept(null);
  }, []);

  const handleOpenModal = (dept: Department | null = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || "",
        manager_name: dept.manager_name || "",
        is_active: dept.is_active,
      });
    } else {
      resetForm();
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Department name is required");
      return false;
    }
    if (!formData.code.trim()) {
      setError("Department code is required");
      return false;
    }

    const isDuplicate = departments?.some(
      (dept: Department) =>
        dept.code.toUpperCase() === formData.code.toUpperCase() &&
        dept.id !== editingDept?.id
    );
    if (isDuplicate) {
      setError("A department with this code already exists");
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    if (editingDept) {
      updateMutation.mutate({
        id: editingDept.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm.deptId) return;
    deleteMutation.mutate(deleteConfirm.deptId);
  };

  const handleRestoreConfirm = () => {
    if (!restoreConfirm.deptId) return;
    restoreMutation.mutate(restoreConfirm.deptId);
  };

  const activeDepts = departments?.filter((d: Department) => d.is_active) || [];
  const inactiveDepts =
    departments?.filter((d: Department) => !d.is_active) || [];

  if (isLoading) {
    return (
      <Card className="p-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-12" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <p className="text-sm text-destructive">
              Failed to load departments
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["all-departments"] })
              }
            >
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Departments Management</CardTitle>
            <CardDescription>
              Create and manage departments in your organization
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Active Departments ({activeDepts.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Departments currently in use
              </p>
            </div>

            {activeDepts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No active departments yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeDepts.map((dept: Department) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">
                          {dept.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{dept.code}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {dept.manager_name || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {dept.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(dept)}
                              className="gap-1 text-xs"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteConfirm({
                                  open: true,
                                  deptId: dept.id,
                                })
                              }
                              className="gap-1 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {inactiveDepts.length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Inactive Departments ({inactiveDepts.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deleted departments can be restored
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-dashed">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveDepts.map((dept: Department) => (
                      <TableRow key={dept.id} className="opacity-60">
                        <TableCell className="font-medium line-through">
                          {dept.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="line-through">
                            {dept.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm line-through">
                          {dept.manager_name || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground line-through">
                          {dept.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRestoreConfirm({ open: true, deptId: dept.id })
                            }
                            className="gap-1 text-xs"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Edit Department" : "Create New Department"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Input
              label="Department Name"
              placeholder="e.g., Operations, HR, Finance"
              value={formData.name}
              onChange={(e) => {
                setFormData((p) => ({ ...p, name: e.target.value }));
                setError("");
              }}
              required
            />

            <Input
              label="Department Code"
              placeholder="e.g., OPS, HR, FIN"
              value={formData.code}
              onChange={(e) => {
                setFormData((p) => ({
                  ...p,
                  code: e.target.value.toUpperCase(),
                }));
                setError("");
              }}
              required
            />

            <Input
              label="Manager Name (Optional)"
              placeholder="Full name of department manager"
              value={formData.manager_name}
              onChange={(e) => {
                setFormData((p) => ({ ...p, manager_name: e.target.value }));
                setError("");
              }}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Brief description of the department's role and responsibilities"
              value={formData.description}
              onChange={(e) => {
                setFormData((p) => ({ ...p, description: e.target.value }));
                setError("");
              }}
              rows={3}
            />

            {editingDept && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Department Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active
                      ? "Department is active"
                      : "Department is inactive"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: checked,
                    }))
                  }
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingDept
                    ? "Update Department"
                    : "Create Department"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, deptId: null })}
        onConfirm={handleDeleteConfirm}
        type="delete"
        title="Delete Department"
        description={`Are you sure you want to delete the "${
          departments?.find((d: Department) => d.id === deleteConfirm.deptId)
            ?.name || "Department"
        }" department? This action can be undone later.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationModal
        open={restoreConfirm.open}
        onOpenChange={(open) => setRestoreConfirm({ open, deptId: null })}
        onConfirm={handleRestoreConfirm}
        type="default"
        title="Restore Department"
        description={`Are you sure you want to restore the "${
          departments?.find((d: Department) => d.id === restoreConfirm.deptId)
            ?.name || "Department"
        }" department?`}
        confirmText="Restore"
        cancelText="Cancel"
      />
    </>
  );
}
