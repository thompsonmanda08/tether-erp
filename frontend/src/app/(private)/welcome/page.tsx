import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { fetchUserOrganizations } from "@/app/_actions/organizations";
import { WelcomeClient } from "./_components/welcome-client";

export const metadata = {
  title: "Select Workspace",
  description: "Choose your workspace to continue",
};

export default async function WelcomePage() {
  const { session, isAuthenticated } = await verifySession();

  if (!session || !isAuthenticated) {
    redirect("/login");
  }

  // SSR: prefetch organizations so the list renders immediately
  const initialOrganizations = await fetchUserOrganizations().catch(() => []);

  return (
    <WelcomeClient
      initialOrganizations={
        initialOrganizations.length > 0 ? initialOrganizations : undefined
      }
    />
  );
}
