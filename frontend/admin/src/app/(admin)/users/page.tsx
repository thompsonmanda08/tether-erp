"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Users,
  UserCog,
  UserPlus,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Monitor,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { notify } from "@/lib/utils";

// Platform users
import { type PlatformUser, type UserFilters } from "@/app/_actions/users";
import {
  useUsers,
  useUserStats,
  useUpdateUserStatus,
} from "@/hooks/use-users";
import { UserDetailsDialog } from "./components/user-details-dialog";
import { UserActionsDropdown } from "./components/user-actions-dropdown";
import { UserBulkActions } from "./components/user-bulk-actions";
import { UserAdvancedFilters } from "./components/user-advanced-filters";
import { UserCreateDialog } from "./components/user-create-dialog";

// Admin users
import {
  exportAdminUsers,
  type AdminUser,
  type AdminUserFilters,
} from "@/app/_actions/admin-users";
import { getAdminSessionStatus } from "@/app/_actions/auth";
import {
  useAdminUsers,
  useAdminUserStats,
  useAdminRoles,
} from "@/hooks/use-admin-users";
import { AdminUserFiltersComponent } from "./components/admin-user-filters";
import { AdminUserStatsGrid } from "./components/admin-user-stats-grid";
import { AdminUserCreateDialog } from "./components/admin-user-create-dialog";
import { AdminUserEditDialog } from "./components/admin-user-edit-dialog";
import { AdminUserDetailsDialog } from "./components/admin-user-details-dialog";
import { AdminUserActionsDropdown } from "./components/admin-user-actions-dropdown";
import { AdminUserBulkActions } from "./components/admin-user-bulk-actions";

// ─────────────────────────────────────────────────────────────────────────────
// Platform Users Tab
// ─────────────────────────────────────────────────────────────────────────────

function PlatformUsersTab() {
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    status: "all",
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const { data: userData, isLoading, error: userError } = useUsers(filters);
  const { data: statsData } = useUserStats();
  const updateStatusMutation = useUpdateUserStatus();

  const users = userData?.users ?? [];
  const pagination = {
    total: userData?.total ?? 0,
    page: userData?.page ?? 1,
    limit: userData?.limit ?? 20,
    totalPages: userData?.totalPages ?? 0,
  };

  const stats = statsData ?? {
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    pending_users: 0,
    users_created_this_month: 0,
    users_logged_in_today: 0,
  };

  useEffect(() => {
    if (userError) notify({ title: "Failed to load users", type: "error" });
  }, [userError]);

  const handleStatusChange = (
    userId: string,
    status: "active" | "suspended" | "inactive",
  ) => {
    updateStatusMutation.mutate(
      { id: userId, status },
      {
        onSuccess: (result) => {
          if (result.success) {
            notify({ title: `User ${status} successfully`, type: "success" });
          } else {
            notify({ title: result.message || "Failed to update user status", type: "error" });
          }
        },
        onError: () => notify({ title: "Failed to update user status", type: "error" }),
      },
    );
  };

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
    if (status === "pending" || !emailVerified) return <Badge variant="warning">Pending</Badge>;
    if (status === "inactive") return <Badge variant="secondary">Inactive</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      user: "bg-gray-100 text-gray-800",
      viewer: "bg-green-100 text-green-800",
    };
    return (
      <Badge variant="outline" className={roleColors[role] || "bg-gray-100 text-gray-800"}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Manage all platform users and their organization memberships
        </p>
        <Button onClick={() => setShowCreateUser(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">+{stats.users_created_this_month} this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_users}</div>
            <p className="text-xs text-muted-foreground">{stats.users_logged_in_today} logged in today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended_users}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_users}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>All Platform Users</CardTitle>
          <CardDescription>Manage and support all platform users</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() =>
              setFilters({ search: "", status: "all", page: 1, limit: 20, sort_by: "created_at", sort_order: "desc" })
            }
          />
          <UserBulkActions
            users={users}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            onUsersUpdated={() => {}}
          />

          <div className="space-y-4">
            {isLoading && users.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        setSelectedUsers((prev) =>
                          checked ? [...prev, user.id] : prev.filter((id) => id !== user.id),
                        );
                      }}
                      aria-label={`Select ${user.name}`}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        {getStatusBadge(user.status, user.email_verified)}
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Mail className="mr-1 h-3 w-3" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {user.phone}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Building2 className="mr-1 h-3 w-3" />
                          {user.organizations.length} org{user.organizations.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {user.organizations.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Organizations:</span>
                          {user.organizations.slice(0, 3).map((org) => (
                            <Badge key={org.organization_id} variant="outline" className="text-xs">
                              {org.organization_name}
                              {org.is_primary && <span className="ml-1 text-primary">★</span>}
                            </Badge>
                          ))}
                          {user.organizations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.organizations.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        {user.last_login
                          ? `Last login: ${new Date(user.last_login).toLocaleDateString()}`
                          : "Never logged in"}
                      </div>
                      <div className="text-muted-foreground">{user.login_count} total logins</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedUser(user); setShowUserDetails(true); }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    <UserActionsDropdown
                      user={user}
                      onStatusChange={handleStatusChange}
                      onUserUpdated={() => {}}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((p) => ({ ...p, page: p.page! - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((p) => ({ ...p, page: p.page! + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <UserDetailsDialog
          user={selectedUser}
          open={showUserDetails}
          onOpenChange={setShowUserDetails}
          onUserUpdated={() => {}}
        />
      )}
      <UserCreateDialog
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onUserCreated={() => {}}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Users Tab
// ─────────────────────────────────────────────────────────────────────────────

function AdminUsersTab() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getAdminSessionStatus().then((status) => {
      if (status.user?.id) setCurrentUserId(status.user.id);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm !== (filters.search || "")) {
        setFilters((prev) => ({ ...prev, search: searchTerm || undefined }));
      }
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, filters.search]);

  const {
    data: users = [],
    isLoading,
    error: usersError,
    refetch,
    isRefetching,
  } = useAdminUsers(filters);
  const { data: stats = null } = useAdminUserStats();
  const { data: roles = [] } = useAdminRoles();

  useEffect(() => {
    if (usersError) toast.error("Failed to load admin users");
  }, [usersError]);

  const handleUserAction = (action: string, user: AdminUser) => {
    setSelectedUser(user);
    if (action === "edit") setShowEditDialog(true);
    if (action === "view") setShowDetailsDialog(true);
  };

  const handleUserUpdated = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedUser(null);
  };

  const handleExport = async (format: "csv" | "json" | "excel") => {
    try {
      const result = await exportAdminUsers(format, filters);
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin-users-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
      } else {
        toast.error(result.message || "Export failed");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const getStatusBadge = (user: AdminUser) => {
    if (user.is_locked)
      return <Badge variant="destructive" className="flex items-center gap-1"><Lock className="h-3 w-3" />Locked</Badge>;
    if (!user.is_active)
      return <Badge variant="secondary" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Inactive</Badge>;
    return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
  };

  const getUserInitials = (user: AdminUser) =>
    `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Manage admin console users and their system access
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Admin User
          </Button>
        </div>
      </div>

      <AdminUserFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => { setFilters({}); setSearchTerm(""); }}
        onExport={handleExport}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roles={roles}
      />

      <AdminUserStatsGrid stats={stats} isLoading={isLoading} />

      {selectedUsers.length > 0 && (
        <AdminUserBulkActions
          selectedUsers={selectedUsers}
          onActionComplete={() => { setSelectedUsers([]); refetch(); }}
          roles={roles}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            {users.length} total admin users • {selectedUsers.length} selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No admin users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={(e) =>
                        setSelectedUsers(e.target.checked ? users.map((u) => u.id) : [])
                      }
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) =>
                          setSelectedUsers((prev) =>
                            e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id),
                          )
                        }
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.full_name}
                            {user.is_super_admin && <Shield className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.slice(0, 2).map((role) => (
                          <Badge key={role.id} variant="outline" className="text-xs">
                            {role.display_name}
                          </Badge>
                        ))}
                        {user.roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{user.roles.length - 2} more</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{user.session_count}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.two_factor_enabled ? "default" : "secondary"}>
                        {user.two_factor_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AdminUserActionsDropdown
                        user={user}
                        onAction={handleUserAction}
                        onUserUpdated={handleUserUpdated}
                        currentUserId={currentUserId ?? undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdminUserCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserUpdated}
      />
      <AdminUserEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={selectedUser}
        roles={roles}
        onUserUpdated={handleUserUpdated}
      />
      <AdminUserDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        user={selectedUser}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Consolidated Users Page
// ─────────────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "admins" ? "admins" : "platform";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage platform users and admin console users
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Platform Users
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Admin Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-6">
          <PlatformUsersTab />
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <AdminUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
