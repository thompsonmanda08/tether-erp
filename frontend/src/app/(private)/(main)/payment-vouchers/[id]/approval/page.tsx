import { redirect } from "next/navigation";
import { PVApprovalClient } from "./_components/pv-approval-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Payment Voucher Approval",
  description: "Review and approve payment voucher",
};

interface PVApprovalPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PVApprovalPage({ params }: PVApprovalPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <PVApprovalClient
      pvId={id}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
