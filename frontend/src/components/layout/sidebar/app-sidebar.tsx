"use client";

import { useIsTablet } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

import Logo from "@/components/base/logo";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { WorkspaceSwitcher } from "@/components/layout/sidebar/workspace-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile, open } = useSidebar();
  const isTablet = useIsTablet();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  // Only collapse sidebar on tablet/mobile, don't re-open on every render
  useEffect(() => {
    if (isTablet) {
      setOpen(false);
    }
  }, [isTablet, setOpen]);

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Logo
              isIcon={!open && !isMobile}
              isFull={open || isMobile}
              href="/?landing=true"
              className=" mb-2"
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <WorkspaceSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* <ScrollArea className="h-full">
        </ScrollArea> */}
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
