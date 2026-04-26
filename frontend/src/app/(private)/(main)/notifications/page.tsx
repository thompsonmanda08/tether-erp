import { Metadata } from "next";
import { NotificationsClient } from "./_components/notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage your notifications",
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
