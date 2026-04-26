"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActivityIcon,
  BarChart3Icon,
  HomeIcon,
  StoreIcon,
  UsersIcon,
  SettingsIcon,
  FileText,
  Search,
  LayoutDashboard,
  FileCheck,
  CheckSquare,
  DollarSign,
  GitBranch,
  QrCode,
  type LucideIcon,
  ChevronRight,
  Blocks,
  ClipboardCopy,
  CogIcon,
} from "lucide-react";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/hooks/use-session";
import { usePermissions } from "@/hooks/use-permissions";

interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  items?: NavItem[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  requiredRoles?: string[];
}

export const routes: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      {
        title: "Dashboard",
        href: "/home",
        icon: LayoutDashboard,
      },
      {
        title: "Search",
        href: "/search",
        icon: Search,
      },
      {
        title: "Budgeting",
        href: "/budgets",
        icon: DollarSign,
        requiredRoles: ["finance", "admin"],
        requiredPermissions: ["budget.view"],
      },
      {
        title: "Procurement",
        href: "/(procurement)",
        icon: ClipboardCopy,
        items: [
          {
            title: "Requisitions",
            href: "/requisitions",
            icon: FileText,
            // Always visible — backend scopes content per role
          },
          {
            title: "Purchase Orders",
            href: "/purchase-orders",
            icon: FileCheck,
            requiredRoles: ["finance", "admin"],
            requiredPermissions: ["purchase_order.view"],
          },
          {
            title: "Goods Received Notes",
            href: "/grn",
            icon: FileCheck,
            requiredRoles: ["finance", "admin"],
            requiredPermissions: ["grn.view"],
          },
          {
            title: "Payment Vouchers",
            href: "/payment-vouchers",
            icon: FileText,
            requiredRoles: ["finance", "admin"],
            requiredPermissions: ["payment_voucher.view"],
          },

          {
            title: "Vendors",
            href: "/vendors",
            icon: StoreIcon,
            requiredRoles: ["admin", "approver"],
            requiredPermissions: ["vendor.view"],
          },
        ],
      },
      {
        title: "Document Verification",
        href: "/verification",
        icon: QrCode,
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        requiredRoles: ["finance", "approver", "admin"],
        requiredPermissions: [
          "requisition.approve",
          "purchase_order.approve",
          "payment_voucher.approve",
          "grn.approve",
          "budget.approve",
        ],
      },
      {
        title: "Reports & Analytics",
        href: "/admin/reports",
        icon: BarChart3Icon,
        requiredRoles: ["finance", "admin"],
        requiredPermissions: ["analytics.view"],
      },
    ],
  },
  {
    title: "ADMIN",
    requiredRoles: ["admin"],
    items: [
      {
        title: "User Management",
        href: "/admin/users",
        icon: UsersIcon,
      },
      {
        title: "Processes & Workflows",
        href: "/admin/workflows",
        icon: GitBranch,
      },
      {
        title: "System Configurations",
        href: "/admin",
        icon: SettingsIcon,
        items: [
          {
            title: "General Settings",
            href: "/settings",
            icon: CogIcon,
          },
          {
            title: "Categories",
            href: "/admin/categories",
            icon: Blocks,
          },
        ],
      },
    ],
  },
];

function canShowItem(
  item: NavItem,
  userRole: string,
  rawPermissions: string[],
): boolean {
  if (!item.requiredRoles && !item.requiredPermissions) return true;
  if (item.requiredRoles?.includes(userRole)) return true;
  if (item.requiredPermissions?.some((p) => rawPermissions.includes(p)))
    return true;
  return false;
}

export function NavMain() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user } = useSession();
  const { rawPermissions } = usePermissions();

  const userRole = (user?.role ?? "").toLowerCase();

  const filteredRoutes = routes
    .filter(
      (group) => !group.requiredRoles || group.requiredRoles.includes(userRole),
    )
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => canShowItem(item, userRole, rawPermissions))
        .map((item) => ({
          ...item,
          items: item.items?.filter((sub) =>
            canShowItem(sub, userRole, rawPermissions),
          ),
        }))
        // Hide parent if all sub-items were filtered out (but keep if no sub-items)
        .filter((item) => !item.items || item.items.length > 0),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="h-full overflow-y-auto overflow-clip">
      {filteredRoutes.map((nav: NavGroup) => (
        <SidebarGroup key={nav.title} className="w-full">
          <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2 max-w-full ">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {Array.isArray(item.items) && item.items.length > 0 ? (
                    <>
                      <div className="hidden group-data-[collapsible=icon]:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton tooltip={item.title}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                            className="min-w-48 rounded-lg"
                          >
                            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                            {item.items?.map((item) => (
                              <DropdownMenuItem
                                className="hover:text-foreground active:text-foreground active:bg-primary/20 hover:bg-primary/20"
                                asChild
                                key={item.title}
                              >
                                <Link href={item.href}>{item.title}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Collapsible className="group/collapsible block group-data-[collapsible=icon]:hidden">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="hover:text-foreground active:text-foreground hover:bg-primary/20 active:bg-primary/20"
                            tooltip={item.title}
                          >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item?.items?.map((subItem, key) => (
                              <SidebarMenuSubItem key={key}>
                                <SidebarMenuSubButton
                                  className="hover:text-foreground active:text-foreground hover:bg-primary/20 active:bg-primary/20"
                                  isActive={pathname === subItem.href}
                                  asChild
                                >
                                  <Link
                                    href={subItem.href}
                                    // target={subItem.newTab ? "_blank" : ""}
                                  >
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  ) : (
                    <SidebarMenuButton
                      className="hover:text-foreground active:text-foreground hover:bg-primary/20 active:bg-primary/20"
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      asChild
                    >
                      <Link
                        href={item.href}
                        // target={item.newTab ? "_blank" : ""}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                  {/* {!!item.isComing && (
                      <SidebarMenuBadge className="peer-hover/menu-button:text-foreground opacity-50">
                        Coming
                      </SidebarMenuBadge>
                    )}
                    {!!item.isNew && (
                      <SidebarMenuBadge
                        className={cn(
                          "border border-green-400 text-green-600 peer-hover/menu-button:text-green-600",
                          {
                            "absolute top-1.5 right-8 opacity-80":
                              Array.isArray(item.items) && item.items.length > 0
                          }
                        )}>
                        New
                      </SidebarMenuBadge>
                    )}
                    {!!item.isDataBadge && (
                      <SidebarMenuBadge className="peer-hover/menu-button:text-foreground">
                        {item.isDataBadge}
                      </SidebarMenuBadge>
                    )} */}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
