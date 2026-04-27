"use client";

import { useState, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Shield, Logs, GitBranch } from "lucide-react";
import DepartmentsConfig from "./departments-config";
import UserRolesConfig from "./user-roles-config";
import { ActivityLogsClient } from "./activity-logs-client";
import BranchesClient from "./branches-client";
import AccessDeniedPage from "@/app/(private)/access-denied/page";

interface UserManagementClientProps {
  userId: string;
  userRole: string;
  usersTabContent?: ReactNode;
}

type TabValue = "users" | "departments" | "roles" | "branches" | "logs";
const VALID_TABS: TabValue[] = ["users", "departments", "roles", "branches", "logs"];

export function UserManagementClient({
  userId,
  userRole,
  usersTabContent,
}: UserManagementClientProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : "users",
  );

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Branches</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Roles</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Logs className="h-4 w-4" />
            <span className="hidden sm:inline">Activity Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab - Content loaded from SSR page */}
        <TabsContent value="users" className="space-y-4">
          {usersTabContent ? (
            usersTabContent
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>
                User management table is rendered server-side for optimal
                performance with pagination and filtering.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <DepartmentsConfig />
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          <BranchesClient />
        </TabsContent>

        {/* Manage Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <UserRolesConfig />
        </TabsContent>
        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {userRole == "admin" ? (
            <ActivityLogsClient userId={userId} userRole={userRole} />
          ) : (
            <AccessDeniedPage />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
