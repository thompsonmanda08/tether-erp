import { requireAdminRole } from "@/lib/admin-guard";
import { PropsWithChildren } from "react";
import DashboardLayoutProvider from "../(main)/layout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: PropsWithChildren) {
  await requireAdminRole();
  return <DashboardLayoutProvider>{children}</DashboardLayoutProvider>;
}
