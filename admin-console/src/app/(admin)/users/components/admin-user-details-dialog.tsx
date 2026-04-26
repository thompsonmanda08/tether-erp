"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  User,
  Mail,
  Calendar,
  Activity,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUserActivity,
  getAdminUserSessions,
  terminateAdminUserSession,
  terminateAllAdminUserSessions,
  type AdminUser,
  type AdminUserActivity,
  type AdminUserSession,
} from "@/app/_actions/admin-users";

interface AdminUserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

export function AdminUserDetailsDialog({
  open,
  onOpenChange,
  user,
}: AdminUserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activity, setActivity] = useState<AdminUserActivity[]>([]);
  const [sessions, setSessions] = useState<AdminUserSession[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    if (user && open) {
      if (activeTab === "activity") {
        loadActivity();
      } else if (activeTab === "sessions") {
        loadSessions();
      }
    }
  }, [user, open, activeTab]);

  const loadActivity = async () => {
    if (!user) return;

    setIsLoadingActivity(true);
    try {
      const result = await getAdminUserActivity(user.id, 50);
      if (result.success) {
        setActivity(result.data || []);
      } else {
        toast.error("Failed to load user activity");
      }
    } catch (error) {
      console.error("Error loading activity:", error);
      toast.error("Failed to load user activity");
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const loadSessions = async () => {
    if (!user) return;

    setIsLoadingSessions(true);
    try {
      const result = await getAdminUserSessions(user.id);
      if (result.success) {
        setSessions(result.data || []);
      } else {
        toast.error("Failed to load user sessions");
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Failed to load user sessions");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const result = await terminateAdminUserSession(user.id, sessionId);
      if (result.success) {
        toast.success("Session terminated successfully");
        loadSessions();
      } else {
        toast.error("Failed to terminate session");
      }
    } catch (error) {
      console.error("Error terminating session:", error);
      toast.error("Failed to terminate session");
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!user) return;

    if (
      confirm(
        "Are you sure you want to terminate all sessions for this user? They will be logged out immediately.",
      )
    ) {
      try {
        const result = await terminateAllAdminUserSessions(user.id);
        if (result.success) {
          toast.success("All sessions terminated successfully");
          loadSessions();
        } else {
          toast.error("Failed to terminate sessions");
        }
      } catch (error) {
        console.error("Error terminating sessions:", error);
        toast.error("Failed to terminate sessions");
      }
    }
  };

  if (!user) {
    return null;
  }

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "logout":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "failed_login":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin User Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Sessions
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-hidden">
            <TabsContent
              value="overview"
              className="space-y-4 overflow-y-auto max-h-[60vh]"
            >
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Full Name
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Email Address
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created Date
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString()
                            : "Never"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last Login
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Account Status</span>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Admin Type</span>
                      <Badge
                        variant={
                          user.is_super_admin ? "destructive" : "outline"
                        }
                      >
                        {user.is_super_admin ? "Super Admin" : "Regular Admin"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Account Lock</span>
                      <div className="flex items-center gap-2">
                        {user.is_locked ? (
                          <Lock className="h-4 w-4 text-red-600" />
                        ) : (
                          <Unlock className="h-4 w-4 text-green-600" />
                        )}
                        <Badge
                          variant={user.is_locked ? "destructive" : "default"}
                        >
                          {user.is_locked ? "Locked" : "Unlocked"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Two-Factor Auth</span>
                      <Badge
                        variant={
                          user.two_factor_enabled ? "default" : "secondary"
                        }
                      >
                        {user.two_factor_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Sessions</span>
                      <Badge variant="outline">{user.session_count}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Login Attempts</span>
                      <Badge
                        variant={
                          user.login_attempts > 3 ? "destructive" : "outline"
                        }
                      >
                        {user.login_attempts}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Created By
                      </p>
                      <p className="font-medium">
                        {user.created_by || "System"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Updated By
                      </p>
                      <p className="font-medium">
                        {user.updated_by || "System"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Activity
                      </p>
                      <p className="font-medium">
                        {user.last_activity_at
                          ? new Date(user.last_activity_at).toLocaleString()
                          : "No recent activity"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Account Locked Until
                      </p>
                      <p className="font-medium">
                        {user.locked_until
                          ? new Date(user.locked_until).toLocaleString()
                          : "Not locked"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="roles"
              className="space-y-4 overflow-y-auto max-h-[60vh]"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assigned Roles</CardTitle>
                  <CardDescription>
                    Roles and permissions assigned to this admin user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.roles.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No roles assigned
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {user.roles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {role.display_name}
                              </h4>
                              {role.is_system_role && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  System
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Assigned:{" "}
                                {new Date(
                                  role.assigned_at,
                                ).toLocaleDateString()}
                              </span>
                              <span>By: {role.assigned_by}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Permissions Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Permissions Summary</CardTitle>
                  <CardDescription>
                    All permissions granted through role assignments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.permissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No permissions assigned
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="outline"
                          className="text-xs"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="activity"
              className="space-y-4 overflow-y-auto max-h-[60vh]"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>
                      Last 50 activities for this admin user
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadActivity}
                    disabled={isLoadingActivity}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isLoadingActivity ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingActivity ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-4 p-4"
                        >
                          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No activity found
                    </p>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {activity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start space-x-4 p-4 border rounded-lg"
                          >
                            {getActivityIcon(item.action)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{item.action}</h4>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Resource: {item.resource}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.ip_address}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Monitor className="h-3 w-3" />
                                  {item.user_agent.substring(0, 50)}...
                                </span>
                              </div>
                              {Object.keys(item.details).length > 0 && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground">
                                    View Details
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                    {JSON.stringify(item.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="sessions"
              className="space-y-4 overflow-y-auto max-h-[60vh]"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Active Sessions</CardTitle>
                    <CardDescription>
                      Current login sessions for this admin user
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSessions}
                      disabled={isLoadingSessions}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${isLoadingSessions ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                    {sessions.filter((s) => s.is_active).length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleTerminateAllSessions}
                      >
                        Terminate All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-4 p-4 border rounded-lg"
                        >
                          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No active sessions
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>User Agent</TableHead>
                          <TableHead>Last Activity</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <Badge
                                variant={
                                  session.is_active ? "default" : "secondary"
                                }
                              >
                                {session.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {session.ip_address}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {session.user_agent}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                session.last_activity_at,
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {new Date(session.expires_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {session.is_active && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleTerminateSession(session.id)
                                  }
                                >
                                  Terminate
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
