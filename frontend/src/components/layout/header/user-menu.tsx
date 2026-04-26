"use client";

import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useLogout } from "@/hooks/use-organization-mutations";
import { getAvatarSrc } from "@/lib/utils";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export default function UserMenu() {
  const { user } = useSession();
  const { logout, isPending } = useLogout();

  const initials = user?.name ? getInitials(user.name) : "...";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userAvatar =
    user?.avatar || `https://bundui-images.netlify.app/avatars/01.png`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="rounded-full cursor-pointer">
          <AvatarImage
            src={user?.avatar || getAvatarSrc(user?.name || "User")}
            alt={user?.name}
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
        align="end"
      >
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="rounded-full">
              <AvatarImage
                src={user?.avatar || getAvatarSrc(user?.name || "User")}
                alt={user?.name}
              />
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{userName}</span>
              <span className="text-muted-foreground truncate text-xs">
                {userEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <BadgeCheck /> Account Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          disabled={isPending || !user}
        >
          <LogOut />
          {isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
