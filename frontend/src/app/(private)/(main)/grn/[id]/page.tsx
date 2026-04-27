import { redirect } from "next/navigation";
import { GRNDetailClient } from "./_components/grn-detail-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Goods Received Note Details",
  description: "View and confirm goods received",
};

interface GRNDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GRNDetailPage({ params }: GRNDetailPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const grnId = (await params).id;

  return (
    <GRNDetailClient
      grnId={grnId}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
