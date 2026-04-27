import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

export default async function HomePage() {
  const { isAuthenticated, session } = await verifySession();

  if (isAuthenticated && session?.user_id) {
    const userRole = (session.role || "requester").toLowerCase();
    const roleRoutes: Record<string, string> = {
      admin: "/home",
      approver: "/home",
      finance: "/home",
      requester: "/requisitions",
    };
    redirect(roleRoutes[userRole] ?? "/home");
  }

  // Not authenticated — go to login
  redirect("/login");
}
