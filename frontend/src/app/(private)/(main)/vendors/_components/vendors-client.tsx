"use client";

import { PageHeader } from "@/components/base/page-header";
import { VendorsTable } from "./vendors-table";

interface VendorsClientProps {
  userId: string;
  userRole: string;
}

export function VendorsClient({ userId, userRole }: VendorsClientProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage suppliers and vendors for your organization"
        showBackButton={false}
      />
      <VendorsTable userId={userId} userRole={userRole} />
    </div>
  );
}
