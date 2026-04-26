type AdminRouteItem = {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  items?: AdminRouteItem[];
};

type AdminRoutesType = {
  title: string;
  items: AdminRouteItem[];
};

export const admin_routes: AdminRoutesType[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: "LayoutDashboard",
      },
    ],
  },
  {
    title: "Organization Management",
    items: [
      {
        title: "Organizations",
        href: "/admin/organizations",
        icon: "Building2",
      },
    ],
  },
  {
    title: "User Management",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: "Users",
      },
      {
        title: "Roles & Permissions",
        href: "/admin/roles",
        icon: "Shield",
      },
    ],
  },
  {
    title: "Analytics & Reports",
    items: [
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: "BarChart3",
      },
    ],
  },
  {
    title: "System Management",
    items: [
      {
        title: "System Settings",
        href: "/admin/settings",
        icon: "Settings",
      },
    ],
  },
];
