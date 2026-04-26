import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { POApprovalClient } from "./_components/po-approval-client";

export const metadata = {
  title: "Purchase Order Approval",
  description: "Review and approve purchase order",
};

interface POApprovalPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function POApprovalPage({ params }: POApprovalPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <POApprovalClient
      poId={id}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
