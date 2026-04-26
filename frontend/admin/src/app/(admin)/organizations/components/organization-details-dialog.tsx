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
  Building2,
  Users,
  Mail,
  Phone,
  Calendar,
  Activity,
  CreditCard,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOrganizationUsers,
  getOrganizationActivity,
  type Organization,
  type OrganizationUser,
  type OrganizationActivity,
} from "@/app/_actions/organizations";

interface OrganizationDetailsDialogProps {
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationUpdated: () => void;
}

export function OrganizationDetailsDialog({
  organization,
  open,
  onOpenChange,
  onOrganizationUpdated,
}: OrganizationDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && organization) {
      loadOrganizationDetails();
    }
  }, [open, organization]);

  const loadOrganizationDetails = async () => {
    setIsLoading(true);
    try {
      // Load organization users
      const usersResult = await getOrganizationUsers(organization.id, 1, 20);
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data.users || []);
      }

      // Load organization activity
      const activityResult = await getOrganizationActivity(organization.id, 1, 20);
      if (activityResult.success && activityResult.data) {
        setActivities(activityResult.data.activities || []);
      }
    } catch (error) {
      console.error("Failed to load organization details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "suspended") {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details: {organization.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive view of organization information, users, and activity
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(organization.status)}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{organization.domain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{organization.user_count} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Created {new Date(organization.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings & Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organization.settings?.max_users && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Max Users:</span>
                      <span className="text-sm">{organization.settings.max_users}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Custom Branding:</span>
                    {organization.settings?.custom_branding ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Access:</span>
                    {organization.settings?.api_access ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {organization.settings?.features_enabled && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Enabled Features:</span>
                      <div className="flex flex-wrap gap-1">
                        {organization.settings.features_enabled.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {organization.contact_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {organization.contact_info.admin_name && (
                    <div>
                      <span className="text-sm font-medium">Admin Name:</span>
                      <p className="text-sm text-muted-foreground">
                        {organization.contact_info.admin_name}
                      </p>
                    </div>
                  )}
                  {organization.contact_info.admin_email && (
                    <div>
                      <span className="text-sm font-medium">Admin Email:</span>
                      <p className="text-sm text-muted-foreground">
                        {organization.contact_info.admin_email}
                      </p>
                    </div>
                  )}
                  {organization.contact_info.phone && (
                    <div>
                      <span className="text-sm font-medium">Phone:</span>
                      <p className="text-sm text-muted-foreground">
                        {organization.contact_info.phone}
                      </p>
                    </div>
                  )}
                  {organization.contact_info.address && (
                    <div>
                      <span className="text-sm font-medium">Address:</span>
                      <p className="text-sm text-muted-foreground">
                        {organization.contact_info.address}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organization Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found in this organization
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{user.name}</h4>
                            {user.is_admin && (
                              <Badge variant="default" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                            <span>Role: {user.role}</span>
                            <span>
                              Joined: {new Date(user.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                          {user.last_login && (
                            <div className="text-xs text-muted-foreground">
                              Last login: {new Date(user.last_login).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={user.status === "active" ? "default" : "secondary"}
                          >
                            {user.status}
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
                            {activity.user_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {activity.user_name}
                              </span>
                            )}
                            {activity.ip_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {activity.ip_address}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}