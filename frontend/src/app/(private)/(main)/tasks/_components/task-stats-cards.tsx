"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskStats } from "@/hooks/use-task-queries";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

interface TaskStatsCardsProps {
  userId: string;
  refreshTrigger: number;
}

export function TaskStatsCards({
  userId,
  refreshTrigger,
}: TaskStatsCardsProps) {
  const { data: stats, isLoading } = useTaskStats(userId);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-12 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Pending Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingTasks}</div>
          <p className="text-xs text-muted-foreground">Tasks awaiting action</p>
        </CardContent>
      </Card>

      {/* High Priority */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          <Zap className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highPriorityTasks}</div>
          <p className="text-xs text-muted-foreground">Urgent tasks</p>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.overdueTasks}
          </div>
          <p className="text-xs text-muted-foreground">Past due date</p>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.completedTasks}
          </div>
          <p className="text-xs text-muted-foreground">Finished tasks</p>
        </CardContent>
      </Card>
    </div>
  );
}
