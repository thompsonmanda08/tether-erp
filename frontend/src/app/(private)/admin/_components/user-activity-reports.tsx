"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserActivity } from "@/hooks/use-reports-queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Users, CheckCircle2, AlertCircle } from "lucide-react";

export function UserActivityReports() {
  // Fetch live user activity from database
  const { data: activity, isLoading, error } = useUserActivity();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading user activity reports...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load user activity. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No user activity data available
      </div>
    );
  }

  const topContributors = (activity?.users || []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Activity Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activity?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activity?.users?.length || 0} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docs in Progress
            </CardTitle>
            <User className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activity?.documentsInProgress || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actions
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activity?.totalActions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approvals and rejections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topContributors.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No contributors yet
              </div>
            ) : (
              topContributors.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.role.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {user.approvalCount} approvals
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.activeDocuments} active
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Users Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Approvals</TableHead>
                  <TableHead className="text-right">Rejections</TableHead>
                  <TableHead className="text-right">Active Docs</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activity?.users || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No user activity found
                    </TableCell>
                  </TableRow>
                ) : (
                  (activity?.users || []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.approvalCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.rejectionCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.activeDocuments}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
