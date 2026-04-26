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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Building2,
  Activity,
  Shield,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { notify } from "@/lib/utils";
import {
  getUserActivity,
  getUserSessions,
  getUserOrganizations,
  terminateUserSession,
  terminateAllUserSessions,
  type PlatformUser,
  type UserActivity,
  type UserSession,
  type UserOrganization,
} from "@/app/_actions/users";

interface UserDetailsDialogProps {
  user: PlatformUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadUserDetails();
    }
  }, [open, user]);

  const loadUserDetails = async () => {
    setIsLoading(true);
    try {
      // Load user activity
      const activityResult = await getUserActivity(user.id, 1, 20);
      if (activityResult.success && activityResult.data) {
        setActivities(activityResult.data.activities || []);
      }

      // Load user sessions
      const sessionsResult = await getUserSessions(user.id);
      if (sessionsResult.success && sessionsResult.data) {
        setSessions(sessionsResult.data || []);
      }

      // Load user organizations
      const orgsResult = await getUserOrganizations(user.id);
      if (orgsResult.success && orgsResult.data) {
        setOrganizations(orgsResult.data || []);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const result = await terminateUserSession(user.id, sessionId);
      if (result.success) {
        notify({ title: "Session terminated successfully", type: "success" });
        loadUserDetails();
      } else {
        notify({ title: "Failed to terminate session", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to terminate session", type: "error" });
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const result = await terminateAllUserSessions(user.id);
      if (result.success) {
        notify({ title: "All sessions terminated successfully", type: "success" });
        loadUserDetails();
      } else {
        notify({ title: "Failed to terminate all sessions", type: "error" });
      }
    } catch (error) {
      notify({ title: "Failed to terminate all sessions", type: "error" });
    }
  };

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === "suspended") {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (status === "pending" || !emailVerified) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (status === "inactive") {
      return <Badge variant="outline">Inactive</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const formatUserAgent = (userAgent: string) => {
    // Simple user agent parsing for display
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Details: {user.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive view of user information, activity, and sessions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(user.status, user.email_verified)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Role:</span>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                      {user.email_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Logins:</span>
                    <span className="text-sm font-bold">{user.login_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Login:</span>
                    <span className="text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Organizations:</span>
                    <span className="text-sm font-bold">
                      {user.organizations.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Sessions:</span>
                    <span className="text-sm font-bold">
                      {sessions.filter((s) => s.is_active).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {user.profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {user.profile.department && (
                    <div>
                      <span className="text-sm font-medium">Department:</span>
                      <p className="text-sm text-muted-foreground">
                        {user.profile.department}
                      </p>
                    </div>
                  )}
                  {user.profile.job_title && (
                    <div>
                      <span className="text-sm font-medium">Job Title:</span>
                      <p className="text-sm text-muted-foreground">
                        {user.profile.job_title}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Memberships ({organizations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    User is not a member of any organizations
                  </div>
                ) : (
                  <div className="space-y-4">
                    {organizations.map((org) => (
                      <div
                        key={org.organization_id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{org.organization_name}</h4>
                            {org.is_primary && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Role: {org.role}</span>
                            <span>Status: {org.status}</span>
                            <span>
                              Joined: {new Date(org.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                          {org.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {org.permissions.slice(0, 5).map((permission) => (
                                <Badge
                                  key={permission}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {permission}
                                </Badge>
                              ))}
                              {org.permissions.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{org.permissions.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={org.status === "active" ? "default" : "secondary"}
                          >
                            {org.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity ({activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading activity...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-lg border p-4"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{activity.action}</h4>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {activity.ip_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {activity.ip_address}
                              </span>
                            )}
                            {activity.organization_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {activity.organization_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Active Sessions ({sessions.filter((s) => s.is_active).length})
                </CardTitle>
                {sessions.filter((s) => s.is_active).length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleTerminateAllSessions}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Terminate All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active sessions found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          session.is_active ? "bg-green-50" : "bg-gray-50"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span className="font-medium">
                              {formatUserAgent(session.user_agent)}
                            </span>
                            {session.is_active ? (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Expired
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.ip_address}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last activity:{" "}
                              {new Date(session.last_activity).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(session.created_at).toLocaleString()}
                            {" • "}
                            Expires: {new Date(session.expires_at).toLocaleString()}
                          </div>
                        </div>
                        {session.is_active && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Terminate
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}