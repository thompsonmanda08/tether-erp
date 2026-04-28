import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentVoucherDetailV2 } from "@/components/documents/document-detail/wrappers/payment-voucher";

export const metadata = {
  title: "Payment Voucher Details",
  description: "View and manage payment voucher details",
};

interface PVDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PVDetailPage({ params }: PVDetailPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const pvId = (await params).id;

  return (
    <PaymentVoucherDetailV2
      pvId={pvId}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
