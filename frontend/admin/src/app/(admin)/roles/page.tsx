"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Copy,
  Eye,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportRoles,
  type Role,
  type Permission,
  type RoleStats,
  type RoleFilters,
} from "@/app/_actions/roles";
import { getAdminSessionStatus } from "@/app/_actions/auth";
import {
  useRoles,
  usePermissions,
  useRoleStats,
  useDeleteRole,
} from "@/hooks/use-roles";
import { RoleFiltersComponent } from "./components/role-filters";
import { RoleStatsGrid } from "./components/role-stats-grid";
import { RoleCreateDialog } from "./components/role-create-dialog";
import { RoleEditDialog } from "./components/role-edit-dialog";
import { RoleDetailsDialog } from "./components/role-details-dialog";
import { RoleCloneDialog } from "./components/role-clone-dialog";
import { RoleBulkActions } from "./components/role-bulk-actions";
import { PermissionsOverview } from "./components/permissions-overview";

export default function RolesPage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("roles");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const isSuperAdmin = currentUserRole === "super_admin";

  useEffect(() => {
    getAdminSessionStatus().then((status) => {
      setCurrentUserRole(status.role);
    });
  }, []);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Filters
  const [filters, setFilters] = useState<RoleFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== (filters.search || "")) {
        setFilters((prev) => ({ ...prev, search: searchTerm || undefined }));
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // TanStack Query hooks
  const {
    data: roles = [],
    isLoading,
    error: rolesError,
    refetch: refetchRoles,
    isRefetching,
  } = useRoles(filters);
  const { data: permissions = [] } = usePermissions();
  const { data: stats = null } = useRoleStats();
  const deleteRoleMutation = useDeleteRole();

  useEffect(() => {
    if (rolesError) toast.error("Failed to load roles data");
  }, [rolesError]);

  const handleRefresh = () => {
    refetchRoles();
  };

  const handleFiltersChange = (newFilters: RoleFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const handleExport = async (format: "csv" | "json" | "excel") => {
    try {
      const result = await exportRoles(format, filters);
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `roles-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Roles exported successfully");
      } else {
        toast.error(result.message || "Failed to export roles");
      }
    } catch (error) {
      console.error("Error exporting roles:", error);
      toast.error("Failed to export roles");
    }
  };

  const handleRoleSelect = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, roleId]);
    } else {
      setSelectedRoles((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRoles(roles.map((role) => role.id));
    } else {
      setSelectedRoles([]);
    }
  };

  const handleRoleAction = (action: string, role: Role) => {
    setSelectedRole(role);

    switch (action) {
      case "edit":
        setShowEditDialog(true);
        break;
      case "view":
        setShowDetailsDialog(true);
        break;
      case "clone":
        setShowCloneDialog(true);
        break;
      case "delete":
        handleDeleteRole(role);
        break;
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system_role) {
      toast.error("Cannot delete system roles");
      return;
    }

    if (role.user_count > 0) {
      toast.error("Cannot delete role with assigned users");
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete the role "${role.display_name}"?`,
      )
    ) {
      deleteRoleMutation.mutate(role.id, {
        onSuccess: (result) => {
          if (result.success) {
            toast.success("Role deleted successfully");
          } else {
            toast.error("Failed to delete role");
          }
        },
        onError: () => toast.error("Failed to delete role"),
      });
    }
  };

  const handleRoleUpdated = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setShowCloneDialog(false);
    setSelectedRole(null);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Roles & Permissions
          </h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions for access control
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Filters */}
      <RoleFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        onExport={handleExport}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Stats Grid */}
      <RoleStatsGrid stats={stats} isLoading={isLoading} />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          {/* Bulk Actions */}
          {selectedRoles.length > 0 && (
            <RoleBulkActions
              selectedRoles={selectedRoles}
              onActionComplete={() => {
                setSelectedRoles([]);
              }}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                {roles.length} total roles • {selectedRoles.length} selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                      <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No roles found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedRoles.length === roles.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role.id)}
                            onChange={(e) =>
                              handleRoleSelect(role.id, e.target.checked)
                            }
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {role.display_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {role.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {role.permissions.length} permissions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{role.user_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.is_active ? "default" : "secondary"}
                          >
                            {role.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              role.is_system_role ? "destructive" : "outline"
                            }
                          >
                            {role.is_system_role ? "System" : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleRoleAction("view", role)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleAction("edit", role)}
                                disabled={role.is_system_role && !isSuperAdmin}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleAction("clone", role)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Clone Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRoleAction("delete", role)}
                                disabled={
                                  role.is_system_role || role.user_count > 0
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionsOverview
            permissions={permissions}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Role and permission change history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Role Audit Trail</h3>
                <p className="text-sm text-muted-foreground mt-1">Coming Soon</p>
                <p className="text-xs text-muted-foreground/70 mt-2 max-w-md mx-auto">
                  Complete history of role and permission changes including who made changes, when, and what was modified.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RoleCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        permissions={permissions}
        onRoleCreated={handleRoleUpdated}
      />

      <RoleEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        role={selectedRole}
        permissions={permissions}
        onRoleUpdated={handleRoleUpdated}
        isSuperAdmin={isSuperAdmin}
      />

      <RoleDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        role={selectedRole}
      />

      <RoleCloneDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        role={selectedRole}
        onRoleCloned={handleRoleUpdated}
      />
    </div>
  );
}
