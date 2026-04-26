import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GRNConfirmationClient } from "./_components/grn-confirmation-client";

export const metadata = {
  title: "GRN Confirmation",
  description: "Confirm goods received",
};

interface GRNConfirmationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GRNConfirmationPage({
  params,
}: GRNConfirmationPageProps) {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <GRNConfirmationClient
      grnId={id}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
