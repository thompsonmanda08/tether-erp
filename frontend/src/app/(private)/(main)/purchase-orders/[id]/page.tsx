import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PurchaseOrderDetailV2 } from "@/components/documents/document-detail/wrappers/purchase-order";
import { getPurchaseOrderById } from "@/app/_actions/purchase-orders";

export const metadata = {
  title: "Purchase Order Details",
  description: "View and manage purchase order details",
};

interface PODetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PODetailPage({ params }: PODetailPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const purchaseOrderId = (await params).id;

  // Server-side data fetching for initial PO load
  const poResult = await getPurchaseOrderById(purchaseOrderId);
  const initialPurchaseOrder =
    poResult.success && poResult.data ? poResult.data : undefined;

  return (
    <PurchaseOrderDetailV2
      purchaseOrderId={purchaseOrderId}
      userId={session.user.id}
      userRole={(session.user as any).role}
      initialPurchaseOrder={initialPurchaseOrder}
    />
  );
}
