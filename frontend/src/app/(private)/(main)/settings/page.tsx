import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./_components/settings-client";
import { getUserProfile } from "@/app/_actions/settings";

export const metadata = {
  title: "Settings",
  description: "Manage your account settings, security, and preferences",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { session } = await verifySession();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch the full profile (includes preferences) rather than the lean session.user
  // which was set at login time and may not include avatar/department/preferences.
  const profileResult = await getUserProfile();
  const user =
    profileResult.success && profileResult.data
      ? profileResult.data
      : session.user;

  return (
    <>
      <SettingsClient user={user as any} />
    </>
  );
}
