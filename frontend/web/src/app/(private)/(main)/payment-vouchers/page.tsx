import { redirect } from "next/navigation";
import { PaymentVouchersClient } from "./_components/payment-vouchers-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Payment Vouchers",
  description: "Manage and approve payment vouchers",
};

export default async function PaymentVouchersPage() {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <PaymentVouchersClient
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
