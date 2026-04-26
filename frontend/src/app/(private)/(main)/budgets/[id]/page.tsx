import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BudgetDetailClientEnhanced } from "./_components/budget-detail-client";

export const metadata = {
  title: "Budget Details",
  description: "View and manage budget details",
};

interface BudgetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BudgetDetailPage({
  params,
}: BudgetDetailPageProps) {
  const { session } = await verifySession();
  const resolvedParams = await params;

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <BudgetDetailClientEnhanced
      budgetId={resolvedParams.id}
      userId={session.user.id}
      userRole={(session.user as any).role}
    />
  );
}
