"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronRightIcon,
  Building2,
  LogOutIcon,
  UserIcon,
  ExternalLinkIcon,
  MoreVertical,
} from "lucide-react";

import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useLogout } from "@/hooks/use-organization-mutations";
import { useOrganizationContext } from "@/hooks/use-organization";
import { capitalize, getAvatarSrc } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const formatRole = (role: string) => {
  // Check if role is a UUID (indicates old session data)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(role)) {
    return "Session needs refresh"; // More concise message
  }

  return capitalize(role.split("_").join(" "));
};

const isUuidRole = (role: string) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(role);
};

export function NavUser() {
  const { isMobile, state } = useSidebar();
  const { user } = useSession();
  const { logout, isPending } = useLogout();
  const { currentOrganization } = useOrganizationContext();
  const [isClient, setIsClient] = useState(false);

  // Ensure we only render user content on client to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const initials = user ? getInitials(user.name) : "";
  const formattedRole = user ? formatRole(user.role) : "";
  const hasUuidRole = user ? isUuidRole(user.role) : false;

  return (
    <div className="space-y-2 p-2 group-data-[collapsible=icon]:p-0">
      {/* User Profile Section with Dropdown */}
      <SidebarMenu>
        <SidebarMenuItem>
          {!isClient || !user ? (
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-sidebar-accent/5 border group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:justify-center">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-4 w-24 mb-1"></Skeleton>
                <Skeleton className="h-3 w-16 rounded"></Skeleton>
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage
                      src={user.avatar || getAvatarSrc(user.name)}
                      alt={user.name}
                    />
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span
                      className={`truncate capitalize text-xs ${
                        hasUuidRole
                          ? "text-orange-600 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formattedRole}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage
                        src={user.avatar || getAvatarSrc(user.name)}
                        alt={user.name}
                      />
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <PaletteIcon className="h-4 w-4" />
                  <span>Theme</span>
                  <ChevronRightIcon className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem> */}
                <DropdownMenuItem asChild>
                  <Link href="/welcome" className="flex items-center gap-2">
                    <ExternalLinkIcon className="h-4 w-4" />
                    <span>Welcome Screen</span>
                  </Link>
                </DropdownMenuItem>{" "}
                <DropdownMenuSeparator />
                {hasUuidRole && (
                  <>
                    <DropdownMenuItem
                      onClick={() => logout()}
                      disabled={isPending}
                      className="text-orange-600 focus:text-orange-700"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      <span>Refresh Session (Recommended)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => logout()} disabled={isPending}>
                  <LogOutIcon className="h-4 w-4" />
                  <span>{isPending ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Docs and Resources */}
      {/* <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer">
        <FileTextIcon className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">
            Docs and resources
          </span>
        </div>
        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
      </div> */}
    </div>
  );
}
