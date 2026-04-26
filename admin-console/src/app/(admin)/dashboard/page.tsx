"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BarChart3, Shield } from "lucide-react";
import { OverviewTab } from "./components/overview-tab";
import { AnalyticsTab } from "./components/analytics-tab";
import { SecurityTab } from "./components/security-tab";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tether-ERP Dashboard</h1>
        <p className="text-muted-foreground">
          Procurement management and system overview
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security &amp; Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="space-y-8">
            <OverviewTab />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
