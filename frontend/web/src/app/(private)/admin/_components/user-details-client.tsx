"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Mail,
  Building2,
  Briefcase,
  Shield,
  Activity,
  Clock,
  User as UserIcon,
  Calendar,
  Edit,
  Phone,
  Hash,
  CreditCard,
  Loader2,
  LogIn,
  Key,
  Ban,
  CheckCircle,
  MonitorSmartphone,
  UserCog,
  FileText,
  Globe,
  Smartphone,
  LogOut,
  AlertTriangle,
  Download,
} from "lucide-react";
import { generateAvatarFallback, getAvatarSrc } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import CreateUserForm from "../_components/create-user-dialog";
import {
  useAdminUserWorkStats,
  useAdminUserActivity,
  useAdminUserSessions,
  useAdminUserSecurityEvents,
  useAdminUserLoginHistory,
} from "@/hooks/use-admin-user-activity";
import { adminTerminateAllSessions, exportUserActivity, impersonateUser } from "@/app/_actions/activity";
import { adminUpdateUserStatus, adminResetUserPassword } from "@/app/_actions/user-actions";
import { toast } from "sonner";

interface UserDetailsClientProps {
  user: User;
}

function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getAccountAge(createdAt: string | Date | null | undefined): string {
  if (!createdAt) return "Unknown";
  const days = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

export function UserDetailsClient({ user }: UserDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [userActive, setUserActive] = useState(user.is_active ?? user.active ?? true);

  const workStats = useAdminUserWorkStats(user.id);

  async function handleTerminateAllSessions() {
    if (!confirm("Terminate all sessions for this user?")) return;
    setIsTerminating(true);
    try {
      const result = await adminTerminateAllSessions(user.id);
      if (result.success) {
        toast.success("All sessions terminated");
      } else {
        toast.error(result.message || "Failed to terminate sessions");
      }
    } finally {
      setIsTerminating(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return;
    setIsResettingPassword(true);
    try {
      const result = await adminResetUserPassword(user.id);
      if (result.success) {
        toast.success("Password reset email sent");
      } else {
        toast.error(result.message || "Failed to send reset email");
      }
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = userActive ? "suspended" : "active";
    const label = userActive ? "suspend" : "activate";
    if (!confirm(`Are you sure you want to ${label} this account?`)) return;
    setIsUpdatingStatus(true);
    try {
      const result = await adminUpdateUserStatus(user.id, newStatus);
      if (result.success) {
        setUserActive(!userActive);
        toast.success(`Account ${newStatus === "active" ? "activated" : "suspended"}`);
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleImpersonate() {
    if (!confirm("Generate an impersonation token for this user? This action will be logged.")) return;
    setIsImpersonating(true);
    try {
      const result = await impersonateUser(user.id);
      if (result.success && result.data?.token) {
        await navigator.clipboard.writeText(result.data.token);
        toast.success("Impersonation token copied to clipboard (valid for 15 minutes)");
      } else {
        toast.error(result.message || "Failed to generate token");
      }
    } finally {
      setIsImpersonating(false);
    }
  }

  const fullName =
    user.name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    "Unknown User";
  const avatarFallback = generateAvatarFallback(fullName);
  const avatarSrc = user.preferences?.avatar || user.avatar || getAvatarSrc(fullName);

  return (
    <>
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
                className="from-primary to-primary/80 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br shadow-lg"
              >
                <ArrowLeft className="text-primary-foreground h-7 w-7" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  User Details
                </h1>
                <p className="text-muted-foreground text-sm">
                  View and manage user information
                </p>
              </div>
            </div>
            <Button onClick={() => setIsEditingUser(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-6 px-4 py-6">
        {/* User Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="text-2xl">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold">{fullName}</h1>
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {user.mfa_enabled && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        MFA Enabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {user.username || user.email}
                  </p>
                </div>

                {/* Account metadata row */}
                <div className="bg-muted/50 flex flex-wrap gap-6 rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground">Last login:</span>
                    <span className="font-medium">
                      {user.last_login
                        ? formatRelativeTime(user.last_login)
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground">Account age:</span>
                    <span className="font-medium">
                      {getAccountAge(user.created_at)}
                    </span>
                  </div>
                </div>

                {/* Profile fields */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Department
                      </p>
                      <p className="text-sm font-medium">
                        {user.department || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Role</p>
                      <p className="text-sm font-medium capitalize">
                        {user.role_name || user.role || "N/A"}
                      </p>
                    </div>
                  </div>

                  {user.position && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Position
                        </p>
                        <p className="text-sm font-medium">{user.position}</p>
                      </div>
                    </div>
                  )}

                  {(user.phone || user.contact) && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="text-sm font-medium">
                          {user.phone || user.contact}
                        </p>
                      </div>
                    </div>
                  )}

                  {user.manNumber && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <Hash className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Man Number
                        </p>
                        <p className="text-sm font-medium">{user.manNumber}</p>
                      </div>
                    </div>
                  )}

                  {user.nrcNumber && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          NRC Number
                        </p>
                        <p className="text-sm font-medium">{user.nrcNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleResetPassword} disabled={isResettingPassword}>
            <Key className="h-4 w-4" />
            {isResettingPassword ? "Sending..." : "Reset Password"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleToggleStatus} disabled={isUpdatingStatus}>
            {userActive ? (
              <>
                <Ban className="h-4 w-4" />
                {isUpdatingStatus ? "Suspending..." : "Suspend Account"}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {isUpdatingStatus ? "Activating..." : "Activate Account"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleTerminateAllSessions}
            disabled={isTerminating}
          >
            {isTerminating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MonitorSmartphone className="h-4 w-4" />
            )}
            Terminate All Sessions
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleImpersonate}
            disabled={isImpersonating}
          >
            {isImpersonating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4" />
            )}
            Impersonate User
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Documents Created */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Documents Created
                  </CardTitle>
                  <CardDescription>Documents submitted by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {workStats.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : workStats.data ? (
                    <div>
                      <p className="text-3xl font-bold">
                        {workStats.data.documents_created?.total ?? 0}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {Object.entries(workStats.data.documents_created?.breakdown ?? {}).map(
                          ([key, count]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="font-medium">{count as number}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5" />
                    Approvals Made
                  </CardTitle>
                  <CardDescription>Workflow decisions by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {workStats.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : workStats.data ? (
                    <div>
                      <p className="text-3xl font-bold">
                        {workStats.data.approvals?.total ?? 0}
                      </p>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-green-600">
                          ✓ {workStats.data.approvals?.approved ?? 0} approved
                        </span>
                        <span className="text-red-600">
                          ✗ {workStats.data.approvals?.rejected ?? 0} rejected
                        </span>
                      </div>
                      {(workStats.data.pending_tasks ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          {workStats.data.pending_tasks} pending task(s)
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Security and account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Account Type</span>
                      <Badge variant="outline" className="capitalize">
                        {user.role?.replace(/_/g, " ") || "User"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">MFA Status</span>
                      <Badge
                        variant={user.mfa_enabled ? "default" : "secondary"}
                      >
                        {user.mfa_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Account Status
                      </span>
                      <Badge
                        variant={user.is_active ? "default" : "destructive"}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {user.created_at && (
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">Created At</span>
                        <span className="font-medium">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    )}
                    {user.updated_at && (
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                          Last Updated
                        </span>
                        <span className="font-medium">
                          {formatDate(user.updated_at)}
                        </span>
                      </div>
                    )}
                    {user.last_login && (
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">Last Login</span>
                        <span className="font-medium">
                          {formatDate(user.last_login)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <ActivityLogTab userId={user.id} />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionsTab userId={user.id} />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <SecurityTab userId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Edit User Modal */}
        <CreateUserForm
          showTrigger={false}
          role={(user.role as any) || "requester"}
          isOpenModal={isEditingUser}
          user={user}
          setIsOpenModal={(open) => {
            if (!open) {
              setIsEditingUser(false);
              router.refresh();
            }
          }}
        />
      </div>
    </>
  );
}

// ─── Activity Log Tab ────────────────────────────────────────────────────────

function formatActionLabel(s: string) {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getActionIcon(actionType: string) {
  if (actionType.includes("login")) return <LogIn className="h-4 w-4 text-blue-500" />;
  if (actionType.includes("password")) return <Key className="h-4 w-4 text-amber-500" />;
  if (actionType.includes("session")) return <MonitorSmartphone className="h-4 w-4 text-purple-500" />;
  if (actionType.includes("profile") || actionType.includes("preferences")) return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (actionType.includes("requisition") || actionType.includes("purchase") || actionType.includes("voucher") || actionType.includes("grn") || actionType.includes("budget")) return <FileText className="h-4 w-4 text-blue-400" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function ActivityLogTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, isError } = useAdminUserActivity(userId, { page, limit: 20 });
  const activities: any[] = data?.activities ?? [];
  const totalPages: number = data?.pagination?.total_pages ?? 1;

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportUserActivity(userId, "csv");
      if (result.success && result.data?.blobUrl) {
        const a = document.createElement("a");
        a.href = result.data.blobUrl;
        a.download = result.data.filename ?? `activity-${userId}.csv`;
        a.click();
        URL.revokeObjectURL(result.data.blobUrl);
      } else {
        toast.error(result.message || "Export failed");
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>All actions performed by this user</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}
        {isError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity data yet. Actions will appear here once the user starts using the system.
          </p>
        )}
        {!isLoading && !isError && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Activity className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No activity recorded</p>
            <p className="text-sm text-muted-foreground">
              Activity will be logged as the user performs actions.
            </p>
          </div>
        )}
        {!isLoading && activities.length > 0 && (
          <>
            <div className="space-y-2">
              {activities.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {getActionIcon(entry.action_type || entry.actionType || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {formatActionLabel(entry.action_type || entry.actionType || "Unknown")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{new Date(entry.created_at || entry.createdAt).toLocaleString()}</span>
                      {(entry.ip_address || entry.ipAddress) && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{entry.ip_address || entry.ipAddress}</span>
                        </>
                      )}
                      {entry.source === "admin_audit" && (
                        <Badge variant="outline" className="text-xs">Admin Action</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sessions Tab ────────────────────────────────────────────────────────────

function SessionsTab({ userId }: { userId: string }) {
  const { data, isLoading, isError, terminate, terminateAll } = useAdminUserSessions(userId);
  const sessions: any[] = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Sessions
            </CardTitle>
            <CardDescription>Active and recent sessions for this user</CardDescription>
          </div>
          {sessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (confirm("Terminate ALL sessions for this user?")) {
                  terminateAll.mutate();
                }
              }}
              disabled={terminateAll.isPending}
            >
              {terminateAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Terminate All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}
        {isError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sessions data available.
          </p>
        )}
        {!isLoading && !isError && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <MonitorSmartphone className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No sessions</p>
            <p className="text-sm text-muted-foreground">This user has no active or recent sessions.</p>
          </div>
        )}
        {!isLoading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {(session.deviceType === "mobile" || session.device_type === "mobile") ? (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {(() => {
                          const browser = session.browser && session.browser !== "Unknown" ? session.browser : "";
                          const os = session.os && session.os !== "Unknown OS" && session.os !== "Unknown" ? session.os : "";
                          const device = session.device_type && session.device_type !== "Desktop" ? session.device_type : "";
                          if (browser && os) return `${browser} on ${os}`;
                          if (browser) return browser;
                          if (os) return os;
                          if (device) return device;
                          return session.ipAddress || session.ip_address ? "Browser Session" : "Unknown Session";
                        })()}
                      </span>
                      {(session.isCurrent || session.is_current) && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      {(session.isExpired || session.is_expired) && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
                      )}
                    </div>
                    {(session.ipAddress || session.ip_address) && (
                      <p className="text-xs font-mono text-muted-foreground">
                        {session.ipAddress || session.ip_address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(session.createdAt || session.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!(session.isCurrent || session.is_current) && !(session.isExpired || session.is_expired) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => terminate.mutate(session.id)}
                    disabled={terminate.isPending}
                  >
                    {terminate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab({ userId }: { userId: string }) {
  const logins = useAdminUserLoginHistory(userId, { limit: 20 });
  const secEvents = useAdminUserSecurityEvents(userId, { limit: 20 });

  const loginEntries: any[] = logins.data?.logins ?? [];
  const securityEntries: any[] = secEvents.data?.events ?? [];

  return (
    <div className="space-y-6">
      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogIn className="h-4 w-4" />
            Login History
          </CardTitle>
          <CardDescription>Recent login attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {logins.isLoading && <Skeleton className="h-32 w-full" />}
          {!logins.isLoading && loginEntries.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No login history yet.</p>
          )}
          {loginEntries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">IP Address</th>
                    <th className="pb-2 pr-4">Device / Browser</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loginEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-muted/50">
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at || entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {entry.ip_address || entry.ipAddress || "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {[entry.device, entry.browser].filter(v => v && v !== "Unknown" && v !== "Desktop").join(" / ") || "—"}
                      </td>
                      <td className="py-2">
                        {(entry.success || entry.action_type === "login") ? (
                          <Badge variant="default" className="text-xs">Success</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security Events
          </CardTitle>
          <CardDescription>Password changes, lockouts, session terminations</CardDescription>
        </CardHeader>
        <CardContent>
          {secEvents.isLoading && <Skeleton className="h-32 w-full" />}
          {!secEvents.isLoading && securityEntries.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No security events recorded.</p>
          )}
          {securityEntries.length > 0 && (
            <div className="space-y-2">
              {securityEntries.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    {(event.action_type || event.actionType)?.includes("failed") ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatActionLabel(event.action_type || event.actionType || "Unknown")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.created_at || event.createdAt).toLocaleString()}
                      {(event.ip_address || event.ipAddress) && ` · ${event.ip_address || event.ipAddress}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
