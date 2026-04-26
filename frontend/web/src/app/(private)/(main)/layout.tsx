import { PropsWithChildren } from "react";
import { SessionTimeoutContainer } from "@/components/session/session-timeout-warning";
import { SidebarProvider } from "@/components/ui/sidebar";
import { verifySession } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import FirstLogin from "@/components/base/first-login";

export const dynamic = "force-dynamic";

export default async function DashboardLayoutProvider({
  children,
}: PropsWithChildren) {
  const { session, isAuthenticated } = await verifySession();

  const mustChangePassword = session?.change_password === true;

  return (
    <>
      <SessionTimeoutContainer session={session} />
      {mustChangePassword && <FirstLogin open={true} />}
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 64)",
            "--header-height": "calc(var(--spacing) * 14)",
          } as React.CSSProperties
        }
      >
        <DashboardLayout>{children}</DashboardLayout>
      </SidebarProvider>
    </>
  );
}
