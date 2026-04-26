import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QRVerificationClient } from "./_components/qr-verification-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "QR Code Verification",
  description: "Verify and scan QR codes for document authentication",
};

export default async function QRVerificationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <QRVerificationClient userId={user.id} userRole={user.role} />
    </>
  );
}
