"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  MapPin,
  ToggleRight,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectField } from "@/components/ui/select-field";
import { SearchSelectField } from "@/components/ui/search-select-field";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/app/_actions/config-actions";
import { queryKeys } from "@/lib/query-keys";
import { useProvinces, useTowns } from "@/hooks/use-location-queries";

interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  provinceId: string;
  townId: string;
  address?: string;
  managerId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BranchFormData {
  name: string;
  code: string;
  provinceId: string;
  townId: string;
  address: string;
  isActive: boolean;
}

const INITIAL_FORM: BranchFormData = {
  name: "",
  code: "",
  provinceId: "",
  townId: "",
  address: "",
  isActive: true,
};

export default function BranchesClient() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(INITIAL_FORM);
  const [error, setError] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    branchId: string | null;
  }>({ open: false, branchId: null });

  const {
    data: branchesResponse,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: queryKeys.config.branches(),
    queryFn: () => getBranches({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  // Location reference data
  const { data: provinces = [], isLoading: provincesLoading } = useProvinces();
  // Form dropdown — only runs when a province is selected
  const { data: towns = [], isLoading: townsLoading } = useTowns(
    formData.provinceId || undefined,
  );
  // All towns — for resolving names in the table
  const { data: allTowns = [] } = useTowns("all");

  const getProvinceName = (id: string) =>
    provinces.find((p) => p.id === id)?.name ?? id;
  const getTownName = (id: string) =>
    allTowns.find((t) => t.id === id)?.name ?? id;

  const branches: Branch[] = branchesResponse?.success
    ? (branchesResponse.data as Branch[]) || []
    : [];

  const createMutation = useMutation({
    mutationFn: (data: BranchFormData) =>
      createBranch({
        name: data.name,
        code: data.code,
        townId: data.townId,
        provinceId: data.provinceId,
        address: data.address || undefined,
      }),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Branch created successfully");
        queryClient.invalidateQueries({
          queryKey: queryKeys.config.branches(),
        });
        handleCloseModal();
      } else {
        setError(response.message || "Failed to create branch");
        toast.error(response.message || "Failed to create branch");
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message || "Failed to create branch");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BranchFormData & { id: string }) =>
      updateBranch({
        id: data.id,
        name: data.name,
        code: data.code,
        townId: data.townId,
        provinceId: data.provinceId,
        address: data.address || undefined,
        isActive: data.isActive,
      }),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Branch updated successfully");
        queryClient.invalidateQueries({
          queryKey: queryKeys.config.branches(),
        });
        handleCloseModal();
      } else {
        setError(response.message || "Failed to update branch");
        toast.error(response.message || "Failed to update branch");
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message || "Failed to update branch");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Branch deleted successfully");
        queryClient.invalidateQueries({
          queryKey: queryKeys.config.branches(),
        });
      } else {
        toast.error(response.message || "Failed to delete branch");
      }
      setDeleteConfirm({ open: false, branchId: null });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete branch");
      setDeleteConfirm({ open: false, branchId: null });
    },
  });

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setError("");
    setEditingBranch(null);
  }, []);

  const handleOpenModal = (branch: Branch | null = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code,
        provinceId: branch.provinceId,
        townId: branch.townId,
        address: branch.address || "",
        isActive: branch.isActive,
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
      setError("Branch name is required");
      return false;
    }
    if (!formData.code.trim()) {
      setError("Branch code is required");
      return false;
    }
    if (!formData.provinceId) {
      setError("Province is required");
      return false;
    }
    if (!formData.townId) {
      setError("Town / District is required");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (editingBranch) {
      updateMutation.mutate({ ...formData, id: editingBranch.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const activeBranches = branches.filter((b) => b.isActive);
  const inactiveBranches = branches.filter((b) => !b.isActive);

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
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
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
            <p className="text-sm text-destructive">Failed to load branches</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: queryKeys.config.branches(),
                })
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
            <CardTitle>Branch Management</CardTitle>
            <CardDescription>
              Manage your organization&apos;s physical branches and locations
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Active Branches ({activeBranches.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Branches currently in operation
              </p>
            </div>

            {activeBranches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No branches yet. Add one to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Town</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeBranches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">
                          {branch.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{branch.code}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getProvinceName(branch.provinceId)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getTownName(branch.townId)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {branch.address || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(branch)}
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
                                  branchId: branch.id,
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

          {inactiveBranches.length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Inactive Branches ({inactiveBranches.length})
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-dashed">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Town</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveBranches.map((branch) => (
                      <TableRow key={branch.id} className="opacity-60">
                        <TableCell className="font-medium line-through">
                          {branch.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="line-through">
                            {branch.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground line-through">
                          {getProvinceName(branch.provinceId)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground line-through">
                          {getTownName(branch.townId)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground line-through">
                          {branch.address || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-green-600 hover:text-green-700"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                id: branch.id,
                                name: branch.name,
                                code: branch.code,
                                provinceId: branch.provinceId,
                                townId: branch.townId,
                                address: branch.address || "",
                                isActive: true,
                              })
                            }
                          >
                            <ToggleRight className="h-3 w-3" />
                            Activate
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
              {editingBranch ? "Edit Branch" : "Add New Branch"}
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
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Input
              label="Branch Name"
              placeholder="e.g., Lusaka Central Branch"
              value={formData.name}
              onChange={(e) => {
                setFormData((p) => ({ ...p, name: e.target.value }));
                setError("");
              }}
              required
            />

            <Input
              label="Branch Code"
              placeholder="e.g., LCA, KIT, COP"
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

            <SelectField
              label="Province"
              value={formData.provinceId}
              options={provinces.map((p) => ({ value: p.id, label: p.name }))}
              isLoading={provincesLoading}
              onValueChange={(value) => {
                setFormData((p) => ({ ...p, provinceId: value, townId: "" }));
                setError("");
              }}
            />

            <SearchSelectField
              label="Town / District"
              value={formData.townId}
              options={towns.map((t) => ({
                id: t.id,
                label: t.name,
                value: t.id,
              }))}
              isLoading={townsLoading}
              isDisabled={!formData.provinceId}
              onModal
              onValueChange={(value) => {
                setFormData((p) => ({ ...p, townId: value }));
                setError("");
              }}
            />

            <Input
              label="Address (Optional)"
              placeholder="Physical street address"
              value={formData.address}
              onChange={(e) => {
                setFormData((p) => ({ ...p, address: e.target.value }));
              }}
            />

            {editingBranch && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Branch Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isActive
                      ? "Branch is active"
                      : "Branch is inactive"}
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((p) => ({ ...p, isActive: checked }))
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
                  : editingBranch
                    ? "Update Branch"
                    : "Create Branch"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, branchId: null })}
        onConfirm={() => {
          if (deleteConfirm.branchId) {
            deleteMutation.mutate(deleteConfirm.branchId);
          }
        }}
        type="delete"
        title="Delete Branch"
        description={`Are you sure you want to delete the "${
          branches.find((b) => b.id === deleteConfirm.branchId)?.name ||
          "Branch"
        }" branch? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
