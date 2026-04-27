"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldIcon, Plus, Edit, Eye, InfoIcon, View } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getRolesAction,
  OrganizationRole,
} from "@/app/_actions/roles-permissions";
import { createRole, updateRole } from "@/app/_actions/roles-permissions";
import {
  getAvailablePermissionsAction,
  getRolePermissionsAction,
  assignPermissionAction,
  removePermissionAction,
} from "@/app/_actions/roles-permissions";

interface RolesPermissionsProps {
  // No longer requires departmentId since roles are organization-wide
}

interface RoleFormData {
  name: string;
  description?: string;
}

interface PermissionGroup {
  resource: string;
  permissions: string[];
}

// Parse permission string (e.g., "requisition:view" -> { resource: "requisition", action: "view" })
const parsePermission = (permission: string) => {
  const [resource, action] = permission.split(":");
  return { resource, action };
};

// Group permissions by resource
const groupPermissionsByResource = (
  permissions: string[],
): PermissionGroup[] => {
  const groups: { [key: string]: string[] } = {};

  permissions.forEach((permission) => {
    const { resource, action } = parsePermission(permission);
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(action);
  });

  return Object.entries(groups).map(([resource, actions]) => ({
    resource,
    permissions: actions.map((action) => `${resource}:${action}`),
  }));
};

// Format resource name for display
const formatResourceName = (resource: string): string => {
  return resource
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Format action name for display
const formatActionName = (action: string): string => {
  return action.charAt(0).toUpperCase() + action.slice(1);
};

export default function UserRolesConfig({}: RolesPermissionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);

  // Fetch roles for this organization
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: [QUERY_KEYS.ROLES],
    queryFn: async () => {
      // Fetch roles from backend via action
      const response = await getRolesAction();
      if (!response.success)
        throw new Error(response.message || "Failed to fetch roles");
      return response?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (rolesLoading) {
    return (
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-56" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-md border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>
    );
  }

  if (!roles?.length || roles?.length === 0) {
    return (
      <>
        <div className="col-span-full rounded-lg border border-dashed">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No Organization Roles</EmptyTitle>
              <EmptyDescription>
                No custom roles have been created for this organization yet.
                Create your first role to get started.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRole(null);
                    setOpenRoleModal(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Role
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </div>
        <CreateOrUpdateRoleDialog
          openModal={openRoleModal}
          setOpenModal={setOpenRoleModal}
          initialData={editingRole}
          setInitialData={setEditingRole}
        />
      </>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Organization Roles</h3>
            <p className="text-muted-foreground text-sm">
              Manage custom roles for your organization. Permissions can be
              configured separately for each role.
            </p>
          </div>
          <Button
              size="sm"
              onClick={() => {
                setEditingRole(null);
                setOpenRoleModal(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Role
            </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="relative cursor-pointer rounded-md border p-4 transition-colors hover:bg-muted/50"
            >
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-2 h-8 w-8 p-0"
                title={role.isDefault ? "View system role" : "Edit role"}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRole(role);
                  setOpenRoleModal(true);
                }}
              >
                {role.isDefault ? (
                  <View className="h-4 w-4" />
                ) : (
                  <Edit className="h-4 w-4" />
                )}
              </Button>
              <div
                className="mb-2 flex items-center gap-2"
                title={role.isActive ? "Active" : "Inactive"}
              >
                <ShieldIcon className="h-5 w-5" />
                <h3 className="font-medium capitalize">{role.name}</h3>
              </div>
              <p className="text-muted-foreground text-xs">
                {role.description || "No description provided"}
              </p>
              <p className="text-xs capitalize font-medium text-muted-foreground mt-2">
                {role.permissionsCount || 0} permissions assigned
              </p>
            </div>
          ))}
        </div>
      </Card>

      <CreateOrUpdateRoleDialog
        openModal={openRoleModal}
        setOpenModal={setOpenRoleModal}
        initialData={editingRole}
        setInitialData={setEditingRole}
      />
    </>
  );
}

const ROLE_INITIAL_STATE: RoleFormData = {
  name: "",
  description: "",
};

interface CreateOrUpdateRoleDialogProps {
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  initialData: OrganizationRole | null;
  setInitialData: React.Dispatch<React.SetStateAction<OrganizationRole | null>>;
}

function CreateOrUpdateRoleDialog({
  openModal,
  setOpenModal,
  initialData,
  setInitialData,
}: CreateOrUpdateRoleDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RoleFormData>(
    initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
        }
      : ROLE_INITIAL_STATE,
  );
  const [error, setError] = useState<{ status: boolean; message: string }>({
    status: false,
    message: "",
  });

  // Permissions state - only for editing existing roles
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);

  // Fetch available permissions (only when editing)
  const { data: availablePermissionsResponse, isLoading: permissionsLoading } =
    useQuery({
      queryKey: [QUERY_KEYS.ROLE_PERMISSIONS, "available"],
      queryFn: () => getAvailablePermissionsAction(),
      enabled: !!initialData && openModal, // Only fetch when editing a role
      staleTime: 5 * 60 * 1000,
    });

  const availablePermissions: string[] = useMemo(() => {
    if (
      !availablePermissionsResponse?.success ||
      !availablePermissionsResponse?.data
    )
      return [];
    // Backend returns string[] directly
    return availablePermissionsResponse.data;
  }, [availablePermissionsResponse]);

  // Fetch permissions for the role being edited
  const { data: rolePermissionsResponse, isLoading: rolePermissionsLoading } =
    useQuery({
      queryKey: [QUERY_KEYS.ROLE_PERMISSIONS, initialData?.id],
      queryFn: () => getRolePermissionsAction(initialData!.id),
      enabled: !!initialData?.id && openModal,
      staleTime: 5 * 60 * 1000,
    });

  // Set role permissions when data loads
  useEffect(() => {
    if (
      rolePermissionsResponse?.success &&
      rolePermissionsResponse?.data &&
      initialData
    ) {
      setRolePermissions(rolePermissionsResponse.data);
      setHasPermissionChanges(false);
    }
  }, [rolePermissionsResponse, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || "",
      });
    } else {
      setFormData(ROLE_INITIAL_STATE);
    }
  }, [initialData, openModal]);

  // Toggle permission
  const togglePermission = (permission: string) => {
    setRolePermissions((prev) => {
      const isCurrentlyAssigned = prev.includes(permission);
      const newPermissions = isCurrentlyAssigned
        ? prev.filter((p) => p !== permission)
        : [...prev, permission];

      setHasPermissionChanges(true);
      return newPermissions;
    });
  };

  // Toggle all permissions
  const toggleAllPermissions = () => {
    const allPermissions = availablePermissions;
    const allSelected = allPermissions.every((permission) =>
      rolePermissions.includes(permission),
    );

    if (allSelected) {
      // Deselect all
      setRolePermissions([]);
    } else {
      // Select all
      setRolePermissions([...allPermissions]);
    }
    setHasPermissionChanges(true);
  };

  // Check if all permissions are selected
  const areAllPermissionsSelected = useMemo(() => {
    return (
      availablePermissions.length > 0 &&
      availablePermissions.every((permission) =>
        rolePermissions.includes(permission),
      )
    );
  }, [availablePermissions, rolePermissions]);

  // Check if some permissions are selected (for indeterminate state)
  const areSomePermissionsSelected = useMemo(() => {
    return rolePermissions.length > 0 && !areAllPermissionsSelected;
  }, [rolePermissions, areAllPermissionsSelected]);

  // Toggle all permissions for a specific resource group
  const toggleGroupPermissions = (groupPermissions: string[]) => {
    const allGroupSelected = groupPermissions.every((permission) =>
      rolePermissions.includes(permission),
    );

    if (allGroupSelected) {
      // Deselect all permissions in this group
      setRolePermissions((prev) =>
        prev.filter((p) => !groupPermissions.includes(p)),
      );
    } else {
      // Select all permissions in this group
      setRolePermissions((prev) => {
        const newPermissions = [...prev];
        groupPermissions.forEach((permission) => {
          if (!newPermissions.includes(permission)) {
            newPermissions.push(permission);
          }
        });
        return newPermissions;
      });
    }
    setHasPermissionChanges(true);
  };

  // Check if all permissions in a group are selected
  const areAllGroupPermissionsSelected = (groupPermissions: string[]) => {
    return (
      groupPermissions.length > 0 &&
      groupPermissions.every((permission) =>
        rolePermissions.includes(permission),
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      return initialData
        ? updateRole(initialData.id, data.name, data.description)
        : createRole(data.name, data.description || "", []);
    },
    onSuccess: async (response) => {
      if (response.success) {
        toast.success(
          `Role ${initialData ? "updated" : "created"} successfully`,
        );

        // If this is an edit and we have permission changes, save them too
        if (initialData && hasPermissionChanges) {
          await savePermissions();
        } else {
          // Invalidate roles query
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.ROLES],
          });
          setOpenModal(false);
        }
      } else {
        toast.error(response.message);
        setError({
          status: true,
          message: response.message || "An error occurred",
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "An error occurred");
      setError({ status: true, message: err.message });
    },
  });

  // Save permissions
  const savePermissions = async () => {
    if (!initialData) return;

    try {
      // Get current permissions from the server
      const currentPermissionsResponse = await getRolePermissionsAction(
        initialData.id,
      );
      const currentPermissions = currentPermissionsResponse.success
        ? currentPermissionsResponse.data || []
        : [];

      // Find permissions to add and remove
      const permissionsToAdd = rolePermissions.filter(
        (p) => !currentPermissions.includes(p),
      );
      const permissionsToRemove = currentPermissions.filter(
        (p) => !rolePermissions.includes(p),
      );

      // Add new permissions
      for (const permission of permissionsToAdd) {
        await assignPermissionAction(initialData.id, permission);
      }

      // Remove old permissions
      for (const permission of permissionsToRemove) {
        await removePermissionAction(initialData.id, permission);
      }

      toast.success("Permissions updated successfully");
      setHasPermissionChanges(false);

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ROLES],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ROLE_PERMISSIONS, initialData.id],
      });

      setOpenModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update permissions");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setOpenModal(open);
      if (!open) {
        setInitialData(null);
        setFormData(ROLE_INITIAL_STATE);
        setError({ status: false, message: "" });
        setRolePermissions([]);
        setHasPermissionChanges(false);
      }
    },
    [setOpenModal, setInitialData],
  );

  const isLoading = saveMutation.isPending;
  const permissionGroups = groupPermissionsByResource(availablePermissions);
  const isSystemRole = initialData?.isDefault ?? false;

  return (
    <Dialog open={openModal} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("lg:max-w-5xl p-0 overflow-y-auto max-h-[90vh]", {
          "max-h-[90vh] overflow-y-auto": initialData,
        })}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>
            {initialData
              ? isSystemRole
                ? "View System Role"
                : "Update Role"
              : "Create New Role"}
          </DialogTitle>
          {isSystemRole && (
            <p className="text-sm text-muted-foreground">
              System roles cannot be modified. You can view the assigned
              permissions below.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {/* Basic Role Information */}
          <div className="space-y-4">
            <Input
              label="Role Name"
              placeholder="e.g., Chief Finance Officer, Auditor, Manager"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              disabled={isSystemRole}
            />
            <Textarea
              label="Description"
              placeholder="A detailed description of the role and its responsibilities"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
              disabled={isSystemRole}
            />
          </div>

          {/* Permissions Matrix - Only show when editing */}
          {initialData && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Role Permissions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure which resources and actions this role can access
                </p>

                {/* Select All Checkbox - Hide for system roles */}
                {!isSystemRole &&
                  !permissionsLoading &&
                  !rolePermissionsLoading &&
                  availablePermissions.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="select-all-permissions"
                        checked={areAllPermissionsSelected}
                        onCheckedChange={toggleAllPermissions}
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="select-all-permissions"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {areAllPermissionsSelected
                          ? "Deselect All Permissions"
                          : areSomePermissionsSelected
                            ? `Select All Permissions (${rolePermissions.length} of ${availablePermissions.length} selected)`
                            : "Select All Permissions"}
                      </label>
                    </div>
                  )}

                {/* Permission Changes Indicator - Hide for system roles */}
                {initialData && hasPermissionChanges && !isSystemRole && (
                  <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 my-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        You have unsaved permission changes
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Permission changes will be saved when you update the
                        role
                      </p>
                    </div>
                  </div>
                )}

                {permissionsLoading || rolePermissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-6 w-6" />
                    <span className="text-muted-foreground ml-2">
                      Loading permissions...
                    </span>
                  </div>
                ) : permissionGroups.length > 0 ? (
                  <div className="space-y-6">
                    {permissionGroups.map((group) => (
                      <div
                        key={group.resource}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-base">
                            {formatResourceName(group.resource)}
                          </h4>
                          {!isSystemRole && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`select-all-${group.resource}`}
                                checked={areAllGroupPermissionsSelected(
                                  group.permissions,
                                )}
                                onCheckedChange={() =>
                                  toggleGroupPermissions(group.permissions)
                                }
                                disabled={isLoading}
                              />
                              <label
                                htmlFor={`select-all-${group.resource}`}
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                Select All
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                          {group.permissions.map((permission) => {
                            const { action } = parsePermission(permission);
                            const isAssigned =
                              rolePermissions.includes(permission);

                            return (
                              <div
                                key={permission}
                                className="flex items-center space-x-2"
                              >
                                <Switch
                                  id={permission}
                                  checked={isAssigned}
                                  onCheckedChange={() =>
                                    togglePermission(permission)
                                  }
                                  disabled={isLoading || isSystemRole}
                                />
                                <label
                                  htmlFor={permission}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {formatActionName(action)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No permissions available for configuration</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card/10 backdrop-blur-xs sticky bottom-0 flex flex-col-reverse justify-end gap-3 p-4 rounded-b-lg border-t py-6 sm:flex-row sm:py-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant={isSystemRole ? "outline" : "destructive"}
                disabled={isLoading}
              >
                {isSystemRole ? "Close" : "Cancel"}
              </Button>
            </DialogClose>
            {!isSystemRole && (
              <Button
                type="submit"
                disabled={isLoading || !formData.name}
                isLoading={isLoading}
                loadingText="Saving..."
              >
                {initialData ? "Update Role" : "Create Role"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
