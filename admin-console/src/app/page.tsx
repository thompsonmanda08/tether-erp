import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { isAuthenticated } = await verifyAdminSession();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  redirect("/login");
}
