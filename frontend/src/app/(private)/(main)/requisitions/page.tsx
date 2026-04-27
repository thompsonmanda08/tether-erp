import { redirect } from "next/navigation";
import { RequisitionsClient } from "./_components/requisitions-client";
import { verifySession } from "@/lib/auth";
import { getRequisitions } from "@/app/_actions/requisitions";

export const metadata = {
  title: "Requisitions",
  description: "Manage and approve requisition forms",
};

// Disable static generation for this page
export const dynamic = "force-dynamic";

export default async function RequisitionsPage() {
  const { session, isAuthenticated } = await verifySession();

  if (!session || !isAuthenticated) {
    redirect("/login");
  }

  // Fetch requisitions server-side for instant initial render
  const response = await getRequisitions(1, 100);

  return (
    <RequisitionsClient
      userId={session.user.id}
      userRole={session.user.role}
      initialData={response?.data || []}
    />
  );
}
