"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Users,
  Shield,
  UserCog,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { admin_routes } from "@/lib/routes-config";

const iconMap = {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  UserCog,
  BarChart3,
  FileText,
  Settings,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Tether-ERP Admin</span>
            <span className="text-xs text-muted-foreground">Console</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {admin_routes.map((section, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon
                    ? iconMap[item.icon as keyof typeof iconMap]
                    : null;
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                          {item.badge && (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Admin Console v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
