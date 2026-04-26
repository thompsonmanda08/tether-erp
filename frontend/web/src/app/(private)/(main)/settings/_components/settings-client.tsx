"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types/auth";
import { AccountSettings } from "./account-settings";
import { SessionsManagement } from "./sessions-management";
import { WorkspaceSettings } from "./workspace-settings";
import { Users, Building2 } from "lucide-react";

interface SettingsClientProps {
  user: User | null;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [profileUser, setProfileUser] = useState<User | null>(user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account, security, and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="workspace" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Workspace</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <AccountSettings
            user={profileUser}
            onProfileUpdate={(updatedUser) => setProfileUser(updatedUser)}
          />
          <SessionsManagement />
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-4">
          <WorkspaceSettings />
        </TabsContent>


      </Tabs>
    </div>
  );
}
