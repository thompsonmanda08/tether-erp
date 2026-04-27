"use client";

import { useState, useMemo } from "react";
import * as React from "react";
import {
  useApprovalTasks,
  usePendingApprovalCount,
} from "@/hooks/use-approval-workflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { ApprovalTaskCard } from "@/components/workflows/approval-task-card";
import { ApprovalTask } from "@/types";
import { canUserActOnWorkflowTask } from "@/lib/workflow-utils";

interface ApprovalsListProps {
  userId: string;
  userRole: string;
}

export function ApprovalsList({ userId, userRole }: ApprovalsListProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "claimed" | "completed"
  >("pending");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "HIGH" | "MEDIUM" | "LOW"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "name">("date");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Built-in approver roles that can approve any task
  const APPROVER_ROLES = ["admin", "approver", "finance"];

  // Check if the user has a built-in approver role
  const isBuiltInApprover = APPROVER_ROLES.some(
    (role) => role.toLowerCase() === userRole.toLowerCase()
  );

  const currentUser = {
    id: userId,
    role: userRole,
    name: "Current User",
    isBuiltInApprover,
  };

  // Fetch approval tasks with filter
  const filters = React.useMemo(
    () =>
      statusFilter === "all"
        ? {}
        : { status: statusFilter.toUpperCase() as any },
    [statusFilter]
  );

  const {
    data: approvalData,
    isLoading: isTasksLoading,
    error,
    refetch,
  } = useApprovalTasks(filters, page, limit);

  const tasks = approvalData?.data || [];

  const handleRefresh = () => {
    refetch();
  };

  // Filter tasks based on search and priority
  const filteredTasks = useMemo(() => {
    return (
      tasks
        .filter((task) => {
          if (priorityFilter !== "all" && task.priority !== priorityFilter) {
            return false;
          }
          if (
            searchQuery &&
            !`${task.entityType} ${task.entityId} ${task.stageName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          ) {
            return false;
          }
          return true;
        })
        // Sort tasks
        .sort((a, b) => {
          switch (sortBy) {
            case "priority":
              const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
              return (
                (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
              );
            case "name":
              return `${a.entityType}${a.entityId}`.localeCompare(
                `${b.entityType}${b.entityId}`
              );
            case "date":
            default:
              return (
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
              );
          }
        })
    );
  }, [tasks, priorityFilter, searchQuery, sortBy]);

  // Helper to check if user can access a task based on permissions
  const canUserAccessTask = (task: ApprovalTask) =>
    canUserActOnWorkflowTask(currentUser, task);

  // Group tasks by status for better organization
  const groupedTasks = useMemo(
    () => ({
      claimedByMe: filteredTasks.filter((task) => {
        const status = task.status?.toUpperCase();
        return status === "CLAIMED" && task.claimedBy === currentUser.id;
      }),
      available: filteredTasks.filter((task) => {
        const status = task.status?.toUpperCase();
        return status === "PENDING" && canUserAccessTask(task);
      }),
      claimedByOthers: filteredTasks.filter((task) => {
        const status = task.status?.toUpperCase();
        return status === "CLAIMED" && task.claimedBy !== currentUser.id;
      }),
      completed: filteredTasks.filter((task) => {
        const status = task.status?.toUpperCase();
        return status === "APPROVED" || status === "REJECTED" || status === "COMPLETED";
      }),
    }),
    [filteredTasks, currentUser.id, currentUser.role, currentUser.isBuiltInApprover]
  );

  const stats = useMemo(
    () => ({
      total: filteredTasks.length,
      claimedByMe: groupedTasks.claimedByMe.length,
      available: groupedTasks.available.length,
      claimedByOthers: groupedTasks.claimedByOthers.length,
      completed: groupedTasks.completed.length,
    }),
    [filteredTasks.length, groupedTasks]
  );

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">
              Failed to load approval tasks
            </h2>
            <p className="text-gray-600">
              Please try refreshing the page or contact support if the issue
              persists.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approval Tasks</h2>
          <p className="text-gray-600 mt-1">
            Review and approve pending workflow tasks assigned to your role
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isTasksLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isTasksLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Claimed by Me</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.claimedByMe}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.available}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-gray-600">Claimed by Others</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.claimedByOthers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.completed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Available</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={priorityFilter}
                onValueChange={(value: any) => setPriorityFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="name">Entity Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Groups */}
      <div className="space-y-8">
        {/* Tasks Claimed by Me */}
        {groupedTasks.claimedByMe.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Tasks Claimed by You
              </h3>
              <Badge variant="default" className="bg-blue-600">
                {groupedTasks.claimedByMe.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {groupedTasks.claimedByMe.map((task) => (
                <ApprovalTaskCard
                  key={task.id}
                  taskId={task.id}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Tasks */}
        {groupedTasks.available.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Available Tasks
              </h3>
              <Badge variant="secondary">{groupedTasks.available.length}</Badge>
            </div>
            <div className="grid gap-4">
              {groupedTasks.available.map((task) => (
                <ApprovalTaskCard
                  key={task.id}
                  taskId={task.id}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tasks Claimed by Others */}
        {groupedTasks.claimedByOthers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Tasks Claimed by Others
              </h3>
              <Badge variant="destructive">
                {groupedTasks.claimedByOthers.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {groupedTasks.claimedByOthers.map((task) => (
                <ApprovalTaskCard
                  key={task.id}
                  taskId={task.id}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && !isTasksLoading && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No approval tasks found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters to find more tasks."
                : "There are no pending approval tasks assigned to your role at the moment."}
            </p>
            {(searchQuery ||
              statusFilter !== "all" ||
              priorityFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isTasksLoading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card p-6 rounded-lg border shadow-sm animate-pulse"
              >
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-10 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
