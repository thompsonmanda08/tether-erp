import React from "react";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/header";
import { verifyAdminSession } from "@/lib/auth";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only super_admin users are allowed in the admin console
  const { isAuthenticated, isSuperAdmin } = await verifyAdminSession();

  if (!isAuthenticated) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/unauthorized");
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="p-4 xl:container xl:mx-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
