import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BudgetsClient } from "./_components/budgets-client";
import { getBudgets } from "@/app/_actions/budgets";

export const metadata = {
  title: "Budgets",
  description: "Manage and approve budgets",
};

// Disable static generation for this page
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch budgets server-side
  const response = await getBudgets({}, 1, 100);

  return (
    <BudgetsClient
      userRole={(session.user as any).role}
      initialData={response?.data || []}
    />
  );
}
