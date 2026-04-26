"use client";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BellIcon, PanelLeftIcon } from "lucide-react";
import Search from "./search";
import ThemeSwitch from "./theme-switch";
import UserMenu from "./user-menu";
import { useSidebar } from "@/components/ui/sidebar";

import { NotificationHeader } from "@/components/notifications/notification-header";
import { OfflineIndicator } from "@/components/offline/offline-indicator";

import { useSession } from "@/hooks";

// Fallback while loading user

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-tl-xl md:rounded-tr-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2">
        <>
          <Button onClick={toggleSidebar} size="icon" variant="ghost">
            <PanelLeftIcon />
          </Button>
          <Search />
          <div className="ml-auto flex items-center gap-2">
            <OfflineIndicator />
            <ThemeSwitch />
            <Notifications />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
            <UserMenu />
          </div>
        </>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
      </div>
    </header>
  );
}

// Fallback while loading user
function NotificationFallback() {
  return (
    <Button size="icon" variant="ghost" disabled>
      <BellIcon className="h-5 w-5" />
    </Button>
  );
}

// Server component - no "use client" directive
function Notifications() {
  const { user } = useSession();

  if (!user) {
    return <NotificationFallback />;
  }
  return <NotificationHeader />;
}
