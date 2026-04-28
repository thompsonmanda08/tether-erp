import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRequisitionById } from "@/app/_actions/requisitions";
import { RequisitionDetailV2 } from "@/components/documents/document-detail/wrappers/requisition";

export const metadata = {
  title: "Requisition Details",
  description: "View and manage requisition details",
};

interface RequisitionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RequisitionDetailPage({
  params,
}: RequisitionDetailPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const requisitionId = (await params).id;

  // Server-side data fetching for SSR
  const requisitionResult = await getRequisitionById(requisitionId);
  const initialRequisition =
    requisitionResult.success && requisitionResult.data
      ? requisitionResult.data
      : undefined;

  return (
    <RequisitionDetailV2
      requisitionId={requisitionId}
      userId={session.user.id}
      userRole={(session.user as any).role}
      initialRequisition={initialRequisition}
    />
  );
}
