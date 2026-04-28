import { redirect } from "next/navigation";
import { GRNDetailV2 } from "@/components/documents/document-detail/wrappers/grn";
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
    <GRNDetailV2
      grnId={grnId}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
