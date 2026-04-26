"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { type Role } from "@/app/_actions/roles";

interface RoleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

export function RoleDetailsDialog({
  open,
  onOpenChange,
  role,
}: RoleDetailsDialogProps) {
  if (!role) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Group permissions by category
  const permissionsByCategory = role.permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, typeof role.permissions>,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about this role and its permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Role ID
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {role.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(role.id, "Role ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Internal Name
                  </label>
                  <div className="mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {role.name}
                    </code>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Display Name
                  </label>
                  <div className="mt-1">
                    <span className="text-sm font-medium">
                      {role.display_name}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {role.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <Badge variant={role.is_active ? "default" : "secondary"}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Role Type
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={role.is_system_role ? "destructive" : "outline"}
                    >
                      {role.is_system_role ? "System Role" : "Custom Role"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Assigned Users
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{role.user_count}</span>
                    <span className="text-sm text-muted-foreground">users</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <div className="mt-1">
                    <p className="text-sm">
                      {role.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(role.created_at), "PPpp")}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(role.updated_at), "PPpp")}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Permissions
                <Badge variant="outline">
                  {role.permissions.length} permissions
                </Badge>
              </CardTitle>
              <CardDescription>
                Permissions granted to users with this role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {role.permissions.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No permissions assigned
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {Object.entries(permissionsByCategory).map(
                      ([category, permissions]) => (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium capitalize">
                              {category.replace(/_/g, " ")}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {permissions.length} permissions
                            </Badge>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="p-3 border rounded-lg bg-muted/20"
                              >
                                <div className="font-medium text-sm">
                                  {permission.display_name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {permission.resource}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {permission.action}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          {Object.keys(permissionsByCategory).indexOf(
                            category,
                          ) <
                            Object.keys(permissionsByCategory).length - 1 && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          {role.is_system_role && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-orange-600">
                  System Role Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800">
                        Protected System Role
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        This is a system-defined role that cannot be deleted.
                        Some properties may be restricted from modification to
                        maintain system integrity.
                      </p>
                      <ul className="text-sm text-orange-700 mt-2 space-y-1">
                        <li>• Role name and core permissions are protected</li>
                        <li>• Cannot be deleted or deactivated</li>
                        <li>• Essential for system functionality</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
