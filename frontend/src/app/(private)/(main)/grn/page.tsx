import { redirect } from "next/navigation";
import { GrnClient } from "./_components/grn-client";
import { verifySession } from "@/lib/auth";

export const metadata = {
  title: "Goods Received Notes",
  description: "View and manage goods received notes",
};

export default async function GrnPage() {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <GrnClient userId={session.user.id} userRole={(session.user as any).role} />
  );
}
