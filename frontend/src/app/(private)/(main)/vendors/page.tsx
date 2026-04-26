import { redirect } from "next/navigation";
import { VendorsClient } from "./_components/vendors-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Vendors",
  description: "Manage suppliers and vendors for your organization",
};

export default async function VendorsPage() {
  const { session, isAuthenticated } = await verifySession();

  if (!session?.user || !isAuthenticated) {
    redirect("/login");
  }

  return (
    <VendorsClient
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
