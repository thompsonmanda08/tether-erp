"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/base/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TasksTable } from "./tasks-table";
import { TaskStatsCards } from "./task-stats-cards";
import { ApprovalsList } from "./approvals-list";

interface TasksClientProps {
  userId: string;
  userRole: string;
}

export function TasksClient({ userId, userRole }: TasksClientProps) {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "approvals">("tasks");

  // Check for tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "approvals") {
      setActiveTab("approvals");
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        subtitle="Manage your tasks and approvals"
        showBackButton={false}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "tasks" | "approvals")}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Task Stats */}
          <TaskStatsCards userId={userId} refreshTrigger={refreshTrigger} />

          {/* Tasks Table with built-in filters */}
          <TasksTable />
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <ApprovalsList userId={userId} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
