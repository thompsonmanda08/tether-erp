"use client";

import {
  PanelLeftIcon,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { logoutAndRedirect, getAdminSessionStatus } from "@/app/_actions/auth";
import { AdminRole } from "@/lib/constants";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const status = await getAdminSessionStatus();
        if (status.isAuthenticated && status.user) {
          setUser(status.user);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutAndRedirect();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force redirect even if logout fails
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (_role: AdminRole) => {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getRoleLabel = (_role: AdminRole) => {
    return "Super Admin";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <Button onClick={toggleSidebar} size="icon" variant="ghost">
        <PanelLeftIcon className="h-4 w-4" />
      </Button>

      <div className="flex-1">
        <h1 className="text-lg font-semibold">Admin Console</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost">
          <Settings className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user?.name || "Admin"} />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "admin@example.com"}
                </p>
                {user?.role && (
                  <Badge
                    variant="secondary"
                    className={`mt-1 w-fit text-xs ${getRoleColor(user.role)}`}
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {getRoleLabel(user.role)}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/users?tab=admins")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoading}
              className="text-red-600 focus:text-red-600 dark:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoading ? "Signing out..." : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
