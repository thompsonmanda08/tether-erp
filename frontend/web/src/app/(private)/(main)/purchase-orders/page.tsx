import { redirect } from "next/navigation";
import { PurchaseOrdersClient } from "./_components/purchase-orders-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Purchase Orders",
  description: "Manage and approve purchase orders",
};

export default async function PurchaseOrdersPage() {
  const { session, isAuthenticated } = await verifySession();

  if (!session?.user || !isAuthenticated) {
    redirect("/login");
  }

  return (
    <PurchaseOrdersClient
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
