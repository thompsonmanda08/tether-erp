"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  PlusCircle,
  Search,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  CheckSquare,
  BarChart3,
  FileCheck,
  Users,
  GitBranch,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { DashboardMetrics } from "@/types";
import { CreateRequisitionDialog } from "@/app/(private)/(main)/requisitions/_components/create-requisition-dialog";
import { WorkflowStatusChart } from "./workflow-status-chart";

interface GreetingCardProps {
  userName?: string;
  userRole?: string;
  userId?: string;
  metrics?: DashboardMetrics;
}

export function GreetingCard({
  userName = "User",
  userRole = "REQUESTER",
  userId = "",
  metrics,
}: GreetingCardProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleRequisitionCreated = () => {
    setIsCreateDialogOpen(false);
    router.push("/requisitions");
  };

  const role = (userRole || "").toLowerCase();

  const quickActions: Array<{
    icon: React.ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
  }> = (() => {
    if (role === "admin") {
      return [
        { icon: <Users className="h-5 w-5" />, label: "User Management", href: "/admin/users" },
        { icon: <GitBranch className="h-5 w-5" />, label: "Processes & Workflows", href: "/admin/workflows" },
        { icon: <Settings className="h-5 w-5" />, label: "System Configurations", href: "/admin" },
        { icon: <BarChart3 className="h-5 w-5" />, label: "Reports & Analytics", href: "/admin/reports" },
      ];
    }
    if (["finance", "approver"].includes(role)) {
      return [
        { icon: <CheckSquare className="h-5 w-5" />, label: "View Tasks", href: "/tasks" },
        { icon: <BarChart3 className="h-5 w-5" />, label: "Reports & Analytics", href: "/admin/reports" },
        { icon: <Search className="h-5 w-5" />, label: "Search Documents", href: "/search" },
        { icon: <ShieldCheck className="h-5 w-5" />, label: "Verify Document", href: "/verification" },
      ];
    }
    // Requester / default
    return [
      { icon: <FileText className="h-5 w-5" />, label: "View Requisitions", href: "/requisitions" },
      { icon: <PlusCircle className="h-5 w-5" />, label: "Create Requisition", onClick: () => setIsCreateDialogOpen(true) },
      { icon: <Search className="h-5 w-5" />, label: "Search Documents", href: "/search" },
      { icon: <ShieldCheck className="h-5 w-5" />, label: "Verify Document", href: "/verification" },
    ];
  })();

  const metricItems = metrics
    ? [
        {
          title: "Total Documents",
          value: metrics.totalDocuments,
          icon: FileText,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          title: "Pending Approval",
          value: metrics.pendingApproval,
          icon: Clock,
          color: "text-accent",
          bgColor: "bg-accent/10",
        },
        {
          title: "Approved",
          value: metrics.approvedDocuments,
          icon: CheckCircle2,
          color: "text-secondary",
          bgColor: "bg-secondary/10",
        },
        {
          title: "Needs Action",
          value: metrics.documentsNeedingAction,
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
        },
      ]
    : [];

  return (
    <Card className="gradient-primary border-0 overflow-hidden">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Row 1, Col 1 - Greeting */}
          <div className="md:col-span-1">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              {getGreeting()}, {userName}!
            </h2>
            <p className="text-primary-foreground/90 text-base">
              Ready to get started?
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-3">
                <h3 className="text-lg font-semibold text-primary-foreground">
                  Quick actions
                </h3>
              </div>
              <div className="space-y-2 grid gap-1">
                {quickActions.map((action) => {
                  const buttonContent = (
                    <button className="w-full flex items-center justify-between gap-3 py-2.5 px-3 bg-white/5 hover:bg-white/15 text-primary-foreground border border-white/20 rounded-md transition-all group text-sm">
                      <div className="flex items-center gap-2">
                        {action.icon}
                        <span className="font-medium">{action.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );

                  if (action.onClick) {
                    return (
                      <div key={action.label} onClick={action.onClick}>
                        {buttonContent}
                      </div>
                    );
                  }

                  return (
                    <Link key={action.label} href={action.href ?? "#"}>
                      {buttonContent}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Analytics - Metrics Display */}
            {metrics && (
              <div className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-primary-foreground mb-3">
                  Analytics
                </h3>
                <div className="space-y-3">
                  {metricItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="w-full flex items-center justify-between gap-3 py-1.5 px-3 bg-white/5 hover:bg-white/15 text-primary-foreground border border-white/20 rounded-md transition-all group text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 text-white`} />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <span className="text-lg font-bold text-primary-foreground">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {metrics && (
              <div className="md:col-span-1">
                <WorkflowStatusChart metrics={metrics} variant="embedded" />
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CreateRequisitionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onRequisitionCreated={handleRequisitionCreated}
        userId={userId}
      />
    </Card>
  );
}
